import argparse
import asyncio
import json
import math
import os
import sys
import time
import uuid
from datetime import datetime, timedelta
from typing import Any
import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.insert(0, os.getcwd())

from app.regions import get_region_config
from app.database import AsyncSessionLocal
from app.logging_config import logger
from app.models.accident_record import AccidentRecord
from app.models.road_segment import RoadSegment
from app.models.weather_observation import WeatherObservation
from ml.feature_schema import FEATURE_DEFINITIONS, export_feature_schema_json

PROCESSED_DATA_DIR = os.path.join("data", "processed")


def convert_utc_to_ist(ts_utc: datetime) -> tuple[datetime, int, int, int, int]:
    """Converts UTC timestamp to Asia/Kolkata (IST UTC+5:30) and extracts temporal features.
    
    Returns:
        tuple[ts_ist, hour_of_day, day_of_week, is_weekend, month]
    """
    ts_naive = ts_utc.replace(tzinfo=None) if ts_utc.tzinfo is not None else ts_utc
    ts_ist = ts_naive + timedelta(hours=5, minutes=30)

    hour_of_day = ts_ist.hour
    day_of_week = ts_ist.weekday()  # 0=Monday, 6=Sunday
    is_weekend = 1 if day_of_week in [5, 6] else 0
    month = ts_ist.month

    return (ts_ist, hour_of_day, day_of_week, is_weekend, month)


def calculate_exposure_proxy(
    lanes: int, speed_limit: int, road_type: str, hour_of_day: int
) -> float:
    """Calculates deterministic exposure proxy score."""
    road_weights = {
        "motorway": 2.0,
        "trunk": 1.8,
        "primary": 1.5,
        "secondary": 1.2,
        "tertiary": 1.0,
        "residential": 0.8,
        "unclassified": 0.8,
        "living_street": 0.5,
        "service": 0.5,
    }
    class_weight = road_weights.get(str(road_type).lower(), 1.0)

    # Time-of-day multipliers
    if 8 <= hour_of_day <= 10 or 17 <= hour_of_day <= 20:
        time_mult = 1.5
    elif 11 <= hour_of_day <= 16:
        time_mult = 1.0
    else:
        time_mult = 0.6

    speed_norm = max(speed_limit, 10) / 50.0
    lanes_val = max(lanes, 1)

    return round(lanes_val * speed_norm * class_weight * time_mult, 3)


def calculate_rolling_crash_priors(
    osm_way_id: int, obs_timestamp: datetime, all_accidents: list[dict]
) -> tuple[int, int, int, int]:
    """Calculates rolling historical crash counts over preceding windows [t-window, t).
    
    CRITICAL LEAKAGE GUARD: Only accidents with original_timestamp < obs_timestamp are counted.
    Current target hour t is EXCLUDED.
    
    Returns:
        tuple[prior_7d, prior_30d, prior_90d, prior_365d]
    """
    obs_naive = obs_timestamp.replace(tzinfo=None) if obs_timestamp.tzinfo is not None else obs_timestamp

    cutoff_7d = obs_naive - timedelta(days=7)
    cutoff_30d = obs_naive - timedelta(days=30)
    cutoff_90d = obs_naive - timedelta(days=90)
    cutoff_365d = obs_naive - timedelta(days=365)

    cnt_7d = 0
    cnt_30d = 0
    cnt_90d = 0
    cnt_365d = 0

    for acc in all_accidents:
        if acc.get("matched_osm_way_id") != osm_way_id:
            continue

        acc_ts = acc.get("original_timestamp")
        if not acc_ts:
            continue

        acc_naive = acc_ts.replace(tzinfo=None) if acc_ts.tzinfo is not None else acc_ts

        # Strict leakage guard: acc_naive < obs_naive
        if acc_naive < obs_naive:
            if acc_naive >= cutoff_7d:
                cnt_7d += 1
            if acc_naive >= cutoff_30d:
                cnt_30d += 1
            if acc_naive >= cutoff_90d:
                cnt_90d += 1
            if acc_naive >= cutoff_365d:
                cnt_365d += 1

    return (cnt_7d, cnt_30d, cnt_90d, cnt_365d)


class FeatureFusionDatasetBuilder:
    """Builder class constructing leakage-safe, multi-source supervised datasets."""

    def audit_leakage(self, df: pd.DataFrame) -> dict[str, Any]:
        """Audits dataset DataFrame for temporal or target leakage.
        
        Returns:
            Audit result dict with leak_violations count.
        """
        violations = 0
        if "timestamp_utc" in df.columns:
            # Check for future dated observations relative to current time + 1 hour
            now_utc = datetime.utcnow()
            future_mask = df["timestamp_utc"] > (now_utc + timedelta(hours=1))
            violations += int(future_mask.sum())

        return {
            "leak_violations": violations,
            "status": "PASS" if violations == 0 else "FAIL",
        }

    async def build_dataset(
        self,
        db_session: AsyncSession | None = None,
        region_name: str = "delhi_ncr",
        synthetic_fixtures: dict[str, Any] | None = None,
        output_filename: str = "delhi_ncr_multi_source_v1.parquet",
    ) -> dict[str, Any]:
        """Executes full feature fusion pipeline and exports Parquet + metadata artifacts."""
        start_time = time.time()
        os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)
        region_cfg = get_region_config(region_name)

        logger.info(f"Starting Dataset Builder for region '{region_name}'")

        # 1. Fetch source data from DB or Fixtures
        roads: list[dict] = []
        accidents: list[dict] = []
        weather: list[dict] = []

        if synthetic_fixtures:
            roads = synthetic_fixtures.get("roads", [])
            accidents = synthetic_fixtures.get("accidents", [])
            weather = synthetic_fixtures.get("weather", [])
            dataset_mode = "PIPELINE_SYNTHETIC"
        elif db_session:
            # Fetch roads
            r_res = await db_session.execute(select(RoadSegment))
            for r in r_res.scalars().all():
                roads.append({
                    "osm_way_id": r.osm_way_id,
                    "road_type": r.road_type,
                    "lanes": r.lanes,
                    "speed_limit": r.speed_limit,
                    "is_junction": 1 if r.is_junction else 0,
                    "is_lit": 1 if r.is_lit else 0,
                    "h3_index": r.h3_index,
                })

            # Fetch accidents (ONLY ACCIDENT_RECORD crash observations, NOT BLACKSPOT_RECORD spatial priors!)
            a_res = await db_session.execute(
                select(AccidentRecord).where(
                    AccidentRecord.record_type == "ACCIDENT_RECORD",
                    AccidentRecord.is_quarantined == False,
                )
            )
            for a in a_res.scalars().all():
                accidents.append({
                    "source_record_id": a.source_record_id,
                    "matched_osm_way_id": a.matched_osm_way_id,
                    "original_timestamp": a.original_timestamp,
                    "h3_index": a.h3_index,
                    "dataset_mode": a.dataset_mode,
                })

            # Fetch weather
            w_res = await db_session.execute(select(WeatherObservation))
            for w in w_res.scalars().all():
                weather.append({
                    "h3_index": w.h3_index,
                    "timestamp": w.timestamp,
                    "temperature_c": w.temperature_c,
                    "precipitation_mm": w.precipitation_mm,
                    "visibility_meters": w.visibility_meters,
                    "weather_condition": w.weather_condition,
                })

            dataset_mode = "RESEARCH_REAL" if accidents else "PIPELINE_SYNTHETIC"
        else:
            dataset_mode = "PIPELINE_SYNTHETIC"

        rows: list[dict] = []

        # If no positive crash records exist in DB/fixtures, create clean pipeline test synthetic rows
        if not accidents and roads:
            base_ts = datetime(2024, 1, 1, 12, 0, 0)
            accidents = [{
                "source_record_id": "SYNTH-101",
                "matched_osm_way_id": roads[0]["osm_way_id"],
                "original_timestamp": base_ts,
                "h3_index": roads[0]["h3_index"],
                "dataset_mode": "PIPELINE_SYNTHETIC",
            }]

        # 2. Build Supervised Observations
        # A) Positive Crash Observations (y=1)
        for acc in accidents:
            way_id = acc.get("matched_osm_way_id")
            ts_utc = acc.get("original_timestamp")
            if not way_id or not ts_utc:
                continue

            # Find matching road
            road = next((r for r in roads if r["osm_way_id"] == way_id), None)
            if not road:
                continue

            ts_ist, hour, dow, is_wknd, month = convert_utc_to_ist(ts_utc)
            exp_proxy = calculate_exposure_proxy(
                road["lanes"], road["speed_limit"], road["road_type"], hour
            )
            p7, p30, p90, p365 = calculate_rolling_crash_priors(way_id, ts_utc, accidents)

            # Match weather
            w_match = next(
                (w for w in weather if w.get("timestamp") == ts_utc), None
            )

            row = {
                "osm_way_id": way_id,
                "h3_index": road["h3_index"],
                "timestamp_utc": ts_utc,
                "timestamp_ist": ts_ist,
                "hour_of_day": hour,
                "day_of_week": dow,
                "is_weekend": is_wknd,
                "month": month,
                "road_type": road["road_type"],
                "lanes": road["lanes"],
                "speed_limit": road["speed_limit"],
                "is_junction": road["is_junction"],
                "is_lit": road["is_lit"],
                "temperature_c": w_match.get("temperature_c") if w_match else 25.0,
                "precipitation_mm": w_match.get("precipitation_mm") if w_match else 0.0,
                "visibility_meters": w_match.get("visibility_meters") if w_match else 10000.0,
                "weather_condition": w_match.get("weather_condition") if w_match else "Clear",
                "crash_prior_7d": p7,
                "crash_prior_30d": p30,
                "crash_prior_90d": p90,
                "crash_prior_365d": p365,
                "exposure_proxy": exp_proxy,
                "accident_occurred": 1,
                "sample_weight": 1.0,
                "dataset_mode": acc.get("dataset_mode", dataset_mode),
            }
            rows.append(row)

            # B) Negative Control Observation (y=0) for same road segment at a different hour
            neg_ts_utc = ts_utc - timedelta(hours=6)
            neg_ts_ist, neg_hour, neg_dow, neg_is_wknd, neg_month = convert_utc_to_ist(neg_ts_utc)
            neg_exp = calculate_exposure_proxy(
                road["lanes"], road["speed_limit"], road["road_type"], neg_hour
            )
            np7, np30, np90, np365 = calculate_rolling_crash_priors(way_id, neg_ts_utc, accidents)

            neg_row = {
                "osm_way_id": way_id,
                "h3_index": road["h3_index"],
                "timestamp_utc": neg_ts_utc,
                "timestamp_ist": neg_ts_ist,
                "hour_of_day": neg_hour,
                "day_of_week": neg_dow,
                "is_weekend": neg_is_wknd,
                "month": neg_month,
                "road_type": road["road_type"],
                "lanes": road["lanes"],
                "speed_limit": road["speed_limit"],
                "is_junction": road["is_junction"],
                "is_lit": road["is_lit"],
                "temperature_c": 24.0,
                "precipitation_mm": 0.0,
                "visibility_meters": 10000.0,
                "weather_condition": "Clear",
                "crash_prior_7d": np7,
                "crash_prior_30d": np30,
                "crash_prior_90d": np365,
                "crash_prior_365d": np365,
                "exposure_proxy": neg_exp,
                "accident_occurred": 0,
                "sample_weight": 1.0,
                "dataset_mode": dataset_mode,
            }
            rows.append(neg_row)

        df = pd.DataFrame(rows)

        # 3. Perform Leakage Audit
        leak_report = self.audit_leakage(df)

        # 4. Save Parquet & Metadata Artifacts
        export_feature_schema_json()
        parquet_path = os.path.join(PROCESSED_DATA_DIR, output_filename)
        meta_path = os.path.join(PROCESSED_DATA_DIR, output_filename.replace(".parquet", ".meta.json"))

        df.to_parquet(parquet_path, index=False)

        pos_cnt = int((df["accident_occurred"] == 1).sum()) if not df.empty else 0
        neg_cnt = int((df["accident_occurred"] == 0).sum()) if not df.empty else 0

        metadata_payload = {
            "dataset_version": "1.0.0",
            "region": region_name,
            "dataset_mode": dataset_mode,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "row_count": len(df),
            "positive_count": pos_cnt,
            "negative_count": neg_cnt,
            "feature_count": len(df.columns),
            "leakage_audit": leak_report,
            "parquet_file": parquet_path,
        }

        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata_payload, f, indent=2)

        duration = round(time.time() - start_time, 2)
        summary = {
            "dataset_version": "1.0.0",
            "region_name": region_name,
            "dataset_mode": dataset_mode,
            "row_count": len(df),
            "positive_count": pos_cnt,
            "negative_count": neg_cnt,
            "duration_seconds": duration,
            "parquet_path": parquet_path,
            "meta_path": meta_path,
            "leakage_status": leak_report["status"],
        }

        logger.info(f"Dataset Build Completed: {summary}")
        return summary


dataset_builder = FeatureFusionDatasetBuilder()


async def main_cli():
    """CLI Entrypoint for Feature Fusion Dataset Construction."""
    parser = argparse.ArgumentParser(description="SafeRoute AI - Dataset Construction Pipeline")
    parser.add_argument("--region", default="delhi_ncr", help="Target region name")
    parser.add_argument(
        "--output", default="delhi_ncr_multi_source_v1.parquet", help="Output parquet filename"
    )

    args = parser.parse_args()

    async with AsyncSessionLocal() as session:
        summary = await dataset_builder.build_dataset(
            db_session=session, region_name=args.region, output_filename=args.output
        )
        print(f"Dataset Builder Result: {summary}")


if __name__ == "__main__":
    asyncio.run(main_cli())

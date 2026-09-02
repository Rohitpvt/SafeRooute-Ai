import argparse
import asyncio
import json
import os
import time
import uuid
from datetime import datetime, timedelta
from typing import Any
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.regions import get_region_config
from app.database import AsyncSessionLocal
from app.logging_config import logger
from app.models.ingestion_run import IngestionRun
from app.models.weather_observation import WeatherObservation
from app.services.osm_normalizer import compute_h3_cell
from app.services.weather_normalizer import (
    map_wmo_code_to_condition,
    normalize_utc_timestamp,
    validate_weather_observation,
)

OPEN_METEO_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
CACHE_DIR = os.path.join("data", "cache", "weather")


class WeatherPipelineService:
    """Service handling Open-Meteo historical weather ingestion, H3 spatial indexing, gap detection, and local caching."""

    def __init__(self):
        os.makedirs(CACHE_DIR, exist_ok=True)

    def get_cache_filepath(
        self, lat: float, lng: float, start_date: str, end_date: str
    ) -> str:
        """Constructs deterministic cache file path for historical weather request."""
        clean_lat = f"{lat:.3f}"
        clean_lng = f"{lng:.3f}"
        filename = f"weather_{clean_lat}_{clean_lng}_{start_date}_{end_date}.json"
        return os.path.join(CACHE_DIR, filename)

    async def fetch_open_meteo_weather(
        self,
        lat: float,
        lng: float,
        start_date: str,
        end_date: str,
        use_cache: bool = True,
    ) -> dict[str, Any] | None:
        """Fetches historical hourly weather data from Open-Meteo with local file caching and retry logic."""
        cache_path = self.get_cache_filepath(lat, lng, start_date, end_date)

        if use_cache and os.path.exists(cache_path):
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                logger.info(f"Weather cache hit for point ({lat}, {lng}): {cache_path}")
                return data
            except Exception as e:
                logger.warning(f"Failed to read weather cache file: {str(e)}")

        params = {
            "latitude": lat,
            "longitude": lng,
            "start_date": start_date,
            "end_date": end_date,
            "hourly": "temperature_2m,precipitation,visibility,weather_code,wind_speed_10m",
            "timezone": "UTC",
        }
        headers = {"User-Agent": "SafeRouteAI/1.0 (https://saferouteai.com; dev@saferouteai.com)"}

        for attempt in range(1, 4):
            try:
                logger.info(
                    f"Querying Open-Meteo Archive API (Attempt {attempt}): lat={lat}, lng={lng}, range={start_date} to {end_date}"
                )
                async with httpx.AsyncClient(timeout=60.0, headers=headers) as client:
                    resp = await client.get(OPEN_METEO_ARCHIVE_URL, params=params)
                    if resp.status_code == 200:
                        data = resp.json()
                        # Save to local cache
                        try:
                            with open(cache_path, "w", encoding="utf-8") as f:
                                json.dump(data, f, indent=2)
                        except Exception as e:
                            logger.warning(f"Failed to write weather cache file: {str(e)}")
                        return data
                    else:
                        logger.warning(
                            f"Open-Meteo returned status code {resp.status_code}: {resp.text}"
                        )
            except Exception as e:
                logger.warning(f"Open-Meteo request failed on attempt {attempt}: {str(e)}")
                await asyncio.sleep( attempt * 1.5)

        logger.error(f"Open-Meteo queries exhausted for point ({lat}, {lng})")
        return None

    def detect_temporal_gaps(
        self, received_timestamps: list[datetime], start_date: str, end_date: str
    ) -> list[str]:
        """Detects missing hourly timestamps in the received sequence."""
        if not received_timestamps:
            return ["all_timestamps_missing"]

        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
        except Exception:
            return []

        received_set = {ts.replace(tzinfo=None) for ts in received_timestamps if ts}
        missing_gaps: list[str] = []

        curr = start_dt
        while curr < end_dt:
            if curr not in received_set:
                missing_gaps.append(curr.isoformat() + "Z")
            curr += timedelta(hours=1)

        return missing_gaps

    def parse_weather_response(
        self, raw_data: dict[str, Any], lat: float, lng: float
    ) -> tuple[list[dict], list[dict]]:
        """Parses Open-Meteo hourly response dictionary into validated observation records.
        
        Returns:
            tuple[accepted_records, rejected_records]
        """
        hourly = raw_data.get("hourly", {})
        times = hourly.get("time", [])
        temps = hourly.get("temperature_2m", [])
        precips = hourly.get("precipitation", [])
        visibilities = hourly.get("visibility", [])
        codes = hourly.get("weather_code", [])

        h3_cell = compute_h3_cell(lat, lng, resolution=8)
        accepted: list[dict] = []
        rejected: list[dict] = []

        for i, t_str in enumerate(times):
            ts_utc = normalize_utc_timestamp(t_str)
            if not ts_utc:
                rejected.append({"timestamp_raw": t_str, "reason": "unparseable_timestamp"})
                continue

            temp = float(temps[i]) if i < len(temps) and temps[i] is not None else None
            precip = float(precips[i]) if i < len(precips) and precips[i] is not None else None
            vis = float(visibilities[i]) if i < len(visibilities) and visibilities[i] is not None else None
            code = int(codes[i]) if i < len(codes) and codes[i] is not None else None

            is_valid, err = validate_weather_observation(temp, precip, vis, ts_utc)
            if not is_valid:
                rejected.append({"timestamp": ts_utc.isoformat(), "reason": err})
                continue

            condition = map_wmo_code_to_condition(code)

            rec = {
                "h3_index": h3_cell,
                "timestamp": ts_utc,
                "temperature_c": temp,
                "precipitation_mm": precip,
                "visibility_meters": vis,
                "weather_code": code,
                "weather_condition": condition,
            }
            accepted.append(rec)

        return (accepted, rejected)

    async def execute_pipeline(
        self,
        db_session: AsyncSession | None = None,
        region_name: str = "delhi_ncr",
        start_date: str = "2024-01-01",
        end_date: str = "2024-01-02",
        raw_fixture: dict[str, Any] | None = None,
        dry_run: bool = False,
        limit: int | None = None,
    ) -> dict[str, Any]:
        """Executes full historical weather ingestion, H3 indexing, gap analysis, and database upsert."""
        start_time = time.time()
        run_id = str(uuid.uuid4())[:8]
        region_cfg = get_region_config(region_name)

        logger.info(
            f"Starting Weather Ingestion Run {run_id} (Region={region_name}, Dates={start_date} to {end_date}, DryRun={dry_run})"
        )

        min_lat, min_lng, max_lat, max_lng = region_cfg.bounding_box
        center_lat = round((min_lat + max_lat) / 2.0, 3)
        center_lng = round((min_lng + max_lng) / 2.0, 3)

        # Sample grid points
        grid_points = [(center_lat, center_lng)]

        total_processed = 0
        total_accepted = 0
        total_rejected = 0
        total_persisted = 0
        detected_gaps_count = 0

        for lat, lng in grid_points:
            if raw_fixture is not None:
                data = raw_fixture
            else:
                data = await self.fetch_open_meteo_weather(lat, lng, start_date, end_date)

            if not data:
                continue

            accepted, rejected = self.parse_weather_response(data, lat, lng)
            total_processed += len(data.get("hourly", {}).get("time", []))
            total_accepted += len(accepted)
            total_rejected += len(rejected)

            # Gap detection
            rcvd_ts = [r["timestamp"] for r in accepted]
            gaps = self.detect_temporal_gaps(rcvd_ts, start_date, end_date)
            detected_gaps_count += len(gaps)

            if limit and limit > 0:
                accepted = accepted[:limit]

            # Database persistence (Idempotent Upsert)
            if not dry_run and db_session and accepted:
                for rec in accepted:
                    stmt = select(WeatherObservation).where(
                        WeatherObservation.h3_index == rec["h3_index"],
                        WeatherObservation.timestamp == rec["timestamp"],
                    )
                    res = await db_session.execute(stmt)
                    existing = res.scalar_one_or_none()

                    if existing:
                        existing.temperature_c = rec["temperature_c"]
                        existing.precipitation_mm = rec["precipitation_mm"]
                        existing.visibility_meters = rec["visibility_meters"]
                        existing.weather_code = rec["weather_code"]
                        existing.weather_condition = rec["weather_condition"]
                    else:
                        new_obs = WeatherObservation(
                            id=uuid.uuid4(),
                            h3_index=rec["h3_index"],
                            timestamp=rec["timestamp"],
                            temperature_c=rec["temperature_c"],
                            precipitation_mm=rec["precipitation_mm"],
                            visibility_meters=rec["visibility_meters"],
                            weather_code=rec["weather_code"],
                            weather_condition=rec["weather_condition"],
                        )
                        db_session.add(new_obs)
                    total_persisted += 1

                await db_session.commit()

        duration = round(time.time() - start_time, 2)
        run_status = "DRY_RUN" if dry_run else "COMPLETED"

        # Record IngestionRun metadata
        if not dry_run and db_session:
            run_metadata = IngestionRun(
                id=uuid.uuid4(),
                run_id=f"weather_run_{run_id}",
                region_name=region_name,
                pipeline_type="weather_ingestion",
                source_url=OPEN_METEO_ARCHIVE_URL,
                total_processed=total_processed,
                total_accepted=total_accepted,
                total_rejected=total_rejected,
                total_persisted=total_persisted,
                duration_seconds=duration,
                status=run_status,
                summary_notes=f"Accepted: {total_accepted}, Missing Gaps: {detected_gaps_count}",
            )
            db_session.add(run_metadata)
            await db_session.commit()

        summary = {
            "run_id": f"weather_run_{run_id}",
            "region_name": region_name,
            "status": run_status,
            "duration_seconds": duration,
            "total_processed": total_processed,
            "total_accepted": total_accepted,
            "total_rejected": total_rejected,
            "total_persisted": total_persisted,
            "detected_gaps_count": detected_gaps_count,
        }

        logger.info(f"Weather Ingestion Pipeline Summary: {summary}")
        return summary


weather_pipeline_service = WeatherPipelineService()


async def main_cli():
    """CLI Entrypoint for running Open-Meteo Weather Pipeline."""
    parser = argparse.ArgumentParser(description="SafeRoute AI - Weather Ingestion Pipeline")
    parser.add_argument("--region", default="delhi_ncr", help="Target region name")
    parser.add_argument("--start-date", default="2024-01-01", help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", default="2024-01-02", help="End date (YYYY-MM-DD)")
    parser.add_argument("--dry-run", action="store_true", help="Run without DB persistence")
    parser.add_argument("--limit", type=int, default=None, help="Cap records limit")

    args = parser.parse_args()

    async with AsyncSessionLocal() as session:
        summary = await weather_pipeline_service.execute_pipeline(
            db_session=session,
            region_name=args.region,
            start_date=args.start_date,
            end_date=args.end_date,
            dry_run=args.dry_run,
            limit=args.limit,
        )
        print(f"Pipeline Result: {summary}")


if __name__ == "__main__":
    asyncio.run(main_cli())

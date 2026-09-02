import argparse
import asyncio
import json
import math
import os
import time
import uuid
from datetime import datetime, timedelta
from typing import Any
from shapely.geometry import Point
from shapely.wkt import loads as wkt_loads
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.regions import get_region_config
from app.database import AsyncSessionLocal
from app.logging_config import logger
from app.models.accident_record import AccidentRecord
from app.models.ingestion_run import IngestionRun
from app.models.road_segment import RoadSegment
from app.services.accident_adapters import (
    AcademicCrashAdapter,
    DelhiBlackspotAdapter,
    SyntheticFixtureAdapter,
)
from app.services.osm_normalizer import compute_h3_cell

MAX_MATCH_DISTANCE_METERS = 50.0


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def calculate_point_to_linestring_distance_meters(
    lat: float, lng: float, linestring_wkt: str
) -> float:
    """Calculates minimum distance in meters from a point to a LineString geometry WKT."""
    try:
        pt = Point(lng, lat)
        line = wkt_loads(linestring_wkt)
        
        # Project nearest point on line
        nearest_pt = line.interpolate(line.project(pt))
        nearest_lat = float(nearest_pt.y)
        nearest_lng = float(nearest_pt.x)
        
        return haversine_distance_meters(lat, lng, nearest_lat, nearest_lng)
    except Exception:
        return 999999.0


class AccidentPipelineService:
    """Service handling historical accident ingestion, coordinate validation, PostGIS map matching, and quarantine."""

    def __init__(self):
        self.adapters = {
            "delhi_blackspots": DelhiBlackspotAdapter(),
            "academic_crash": AcademicCrashAdapter(),
            "synthetic_fixtures": SyntheticFixtureAdapter(),
        }

    def validate_raw_coordinates(
        self, lat: float, lng: float, bbox: tuple[float, float, float, float]
    ) -> tuple[bool, str | None]:
        """Validates latitude and longitude against regional envelope."""
        min_lat, min_lng, max_lat, max_lng = bbox
        if not (min_lat - 0.2 <= lat <= max_lat + 0.2 and min_lng - 0.2 <= lng <= max_lng + 0.2):
            return (False, f"out_of_region_bounds: ({lat}, {lng})")
        return (True, None)

    def validate_timestamp(self, ts: datetime) -> tuple[bool, str | None]:
        """Validates timestamp parseability and future date constraint."""
        if not ts:
            return (False, "missing_timestamp")
        
        ts_naive = ts.replace(tzinfo=None) if ts.tzinfo is not None else ts
        if ts_naive > datetime.utcnow() + timedelta(minutes=10):
            return (False, f"future_timestamp: {ts.isoformat()}")
        return (True, None)

    def classify_match_confidence(self, distance_m: float) -> tuple[str, bool]:
        """Classifies match confidence level based on distance in meters.
        
        Returns:
            tuple[confidence_category, is_accepted]
        """
        if distance_m <= 15.0:
            return ("EXACT", True)
        elif distance_m <= 30.0:
            return ("ACCEPTABLE", True)
        elif distance_m <= 50.0:
            return ("LOW_CONFIDENCE", True)
        else:
            return ("REJECTED", False)

    async def match_accident_to_road_segments(
        self, db_session: AsyncSession, lat: float, lng: float
    ) -> tuple[int | None, float, str, bool]:
        """Matches accident coordinate to nearest road_segment in database.
        
        Returns:
            tuple[matched_osm_way_id, match_distance_meters, confidence_category, is_accepted]
        """
        stmt = select(RoadSegment)
        result = await db_session.execute(stmt)
        roads = result.scalars().all()

        if not roads:
            return (None, 999999.0, "REJECTED", False)

        best_way_id = None
        min_dist = 999999.0

        for r in roads:
            if r.geometry_wkt:
                dist = calculate_point_to_linestring_distance_meters(lat, lng, r.geometry_wkt)
                if dist < min_dist:
                    min_dist = dist
                    best_way_id = r.osm_way_id

        conf_cat, is_acc = self.classify_match_confidence(min_dist)
        return (best_way_id, round(min_dist, 2), conf_cat, is_acc)

    async def execute_pipeline(
        self,
        db_session: AsyncSession | None = None,
        source_key: str = "synthetic_fixtures",
        region_name: str = "delhi_ncr",
        raw_records: list[dict] | None = None,
        dry_run: bool = False,
        limit: int | None = None,
    ) -> dict[str, Any]:
        """Executes accident ingestion, map-matching, H3 assignment, and database persistence."""
        start_time = time.time()
        run_id = str(uuid.uuid4())[:8]
        region_cfg = get_region_config(region_name)

        adapter = self.adapters.get(source_key, self.adapters["synthetic_fixtures"])
        logger.info(
            f"Starting Accident Ingestion Run {run_id} (Source={adapter.source_name}, Region={region_name}, DryRun={dry_run})"
        )

        if raw_records is None:
            raw_records = []

        if limit and limit > 0:
            raw_records = raw_records[:limit]

        total_processed = len(raw_records)
        accepted_records: list[dict] = []
        rejected_records: list[dict] = []

        # 1. Normalize and Validate
        for raw in raw_records:
            norm = adapter.adapt_record(raw)
            lat, lng = norm["latitude"], norm["longitude"]
            ts = norm["original_timestamp"]

            # Validate coordinates
            coord_ok, coord_err = self.validate_raw_coordinates(lat, lng, region_cfg.bounding_box)
            if not coord_ok:
                rejected_records.append({**norm, "reason": coord_err})
                continue

            # Validate timestamp
            ts_ok, ts_err = self.validate_timestamp(ts)
            if not ts_ok:
                rejected_records.append({**norm, "reason": ts_err})
                continue

            # Compute H3 Cell
            h3_cell = compute_h3_cell(lat, lng, resolution=8)
            norm["h3_index"] = h3_cell
            norm["geometry_wkt"] = f"POINT({lng} {lat})"

            # PostGIS / Geodesic Map Matching
            if db_session:
                way_id, match_dist, conf_cat, is_acc = await self.match_accident_to_road_segments(
                    db_session, lat, lng
                )
                norm["matched_osm_way_id"] = way_id
                norm["match_distance_meters"] = match_dist
                norm["match_confidence"] = conf_cat

                if not is_acc:
                    rejected_records.append({**norm, "reason": f"match_distance_exceeded:{match_dist}m"})
                    continue
            else:
                norm["matched_osm_way_id"] = None
                norm["match_distance_meters"] = 0.0
                norm["match_confidence"] = "EXACT"

            accepted_records.append(norm)

        total_accepted = len(accepted_records)
        total_rejected = len(rejected_records)

        # 2. Quarantine Artifact
        if rejected_records:
            log_dir = "logs"
            os.makedirs(log_dir, exist_ok=True)
            filepath = os.path.join(log_dir, f"accident_quarantine_run_{run_id}.json")
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "run_id": run_id,
                        "quarantined_at": datetime.utcnow().isoformat() + "Z",
                        "total_quarantined": len(rejected_records),
                        "records": rejected_records,
                    },
                    f,
                    indent=2,
                    default=str,
                )

        total_persisted = 0

        # 3. Database Persistence (Idempotent Upsert)
        if not dry_run and db_session and accepted_records:
            for rec in accepted_records:
                stmt = select(AccidentRecord).where(
                    AccidentRecord.source_name == rec["source_name"],
                    AccidentRecord.source_record_id == rec["source_record_id"],
                )
                res = await db_session.execute(stmt)
                existing = res.scalar_one_or_none()

                if existing:
                    existing.dataset_mode = rec["dataset_mode"]
                    existing.record_type = rec["record_type"]
                    existing.original_timestamp = rec["original_timestamp"]
                    existing.severity = rec["severity"]
                    existing.latitude = rec["latitude"]
                    existing.longitude = rec["longitude"]
                    existing.matched_osm_way_id = rec["matched_osm_way_id"]
                    existing.match_distance_meters = rec["match_distance_meters"]
                    existing.match_confidence = rec["match_confidence"]
                    existing.h3_index = rec["h3_index"]
                    existing.geometry_wkt = rec["geometry_wkt"]
                else:
                    new_acc = AccidentRecord(
                        id=uuid.uuid4(),
                        source_name=rec["source_name"],
                        source_record_id=rec["source_record_id"],
                        dataset_mode=rec["dataset_mode"],
                        record_type=rec["record_type"],
                        original_timestamp=rec["original_timestamp"],
                        severity=rec["severity"],
                        latitude=rec["latitude"],
                        longitude=rec["longitude"],
                        matched_osm_way_id=rec["matched_osm_way_id"],
                        match_distance_meters=rec["match_distance_meters"],
                        match_confidence=rec["match_confidence"],
                        h3_index=rec["h3_index"],
                        geometry_wkt=rec["geometry_wkt"],
                    )
                    db_session.add(new_acc)
                total_persisted += 1

            await db_session.commit()

        duration = round(time.time() - start_time, 2)
        run_status = "DRY_RUN" if dry_run else "COMPLETED"

        # Record IngestionRun Metadata
        if not dry_run and db_session:
            run_metadata = IngestionRun(
                id=uuid.uuid4(),
                run_id=f"acc_run_{run_id}",
                region_name=region_name,
                pipeline_type="accident_ingestion",
                source_url=adapter.source_name,
                total_processed=total_processed,
                total_accepted=total_accepted,
                total_rejected=total_rejected,
                total_persisted=total_persisted,
                duration_seconds=duration,
                status=run_status,
                summary_notes=f"Accepted: {total_accepted}, Rejected: {total_rejected}",
            )
            db_session.add(run_metadata)
            await db_session.commit()

        summary = {
            "run_id": f"acc_run_{run_id}",
            "region_name": region_name,
            "status": run_status,
            "duration_seconds": duration,
            "total_processed": total_processed,
            "total_accepted": total_accepted,
            "total_rejected": total_rejected,
            "total_persisted": total_persisted,
        }

        logger.info(f"Accident Ingestion Pipeline Summary: {summary}")
        return summary


accident_pipeline_service = AccidentPipelineService()

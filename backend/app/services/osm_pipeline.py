import argparse
import asyncio
import sys
import time
import uuid
from datetime import datetime
from typing import Any
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.regions import get_region_config
from app.database import AsyncSessionLocal
from app.logging_config import logger
from app.models.ingestion_run import IngestionRun
from app.models.road_segment import RoadSegment
from app.services.osm_normalizer import (
    compute_h3_cell,
    is_included_highway,
    parse_boolean_tag,
    parse_junction_tag,
    parse_lanes,
    parse_speed_limit,
    validate_and_build_linestring,
)
from app.services.osm_quarantine import quarantine_manager

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


class OsmPipelineService:
    """Service handling reproducible OpenStreetMap road infrastructure extraction, normalization, and persistence."""

    def build_overpass_query(self, bbox: tuple[float, float, float, float]) -> str:
        """Generates Overpass QL query string for bounding box.
        
        Args:
            bbox: (min_lat, min_lng, max_lat, max_lng)
        """
        min_lat, min_lng, max_lat, max_lng = bbox
        query = f"""
        [out:json][timeout:180];
        (
          way["highway"]({min_lat},{min_lng},{max_lat},{max_lng});
        );
        out body geom;
        """
        return query.strip()

    async def fetch_overpass_data(
        self, bbox: tuple[float, float, float, float], endpoint: str | None = None
    ) -> list[dict]:
        """Fetches raw OSM way elements from Overpass API with retry logic.
        
        Args:
            bbox: (min_lat, min_lng, max_lat, max_lng)
            endpoint: Optional specific Overpass URL.
        """
        query = self.build_overpass_query(bbox)
        endpoints = [endpoint] if endpoint else OVERPASS_ENDPOINTS

        for url in endpoints:
            try:
                logger.info(f"Querying Overpass API endpoint: {url}")
                headers = {"User-Agent": "SafeRouteAI/1.0 (https://saferouteai.com; dev@saferouteai.com)"}
                async with httpx.AsyncClient(timeout=180.0, headers=headers) as client:
                    resp = await client.post(url, data={"data": query})
                    if resp.status_code == 200:
                        data = resp.json()
                        elements = data.get("elements", [])
                        logger.info(f"Overpass API query successful: Ingested {len(elements)} raw elements.")
                        return elements
                    else:
                        logger.warning(f"Overpass endpoint {url} returned status code {resp.status_code}")
            except Exception as e:
                logger.warning(f"Overpass query failed on endpoint {url}: {str(e)}")
                await asyncio.sleep(2.0)

        logger.error("All Overpass API endpoints exhausted or failed.")
        return []

    def parse_raw_element(
        self, element: dict, bbox: tuple[float, float, float, float] | None = None
    ) -> tuple[dict | None, dict | None]:
        """Normalizes a single raw OSM element into a clean record or rejection dictionary.
        
        Returns:
            tuple[accepted_record, rejected_record]
        """
        way_id = element.get("id")
        if not way_id:
            return (None, {"reason": "missing_way_id", "element": element})

        tags = element.get("tags", {})
        highway = tags.get("highway")

        # 1. Filter road class
        if not is_included_highway(highway):
            return (
                None,
                {
                    "osm_way_id": way_id,
                    "reason": f"excluded_highway_class:{highway}",
                    "tags": tags,
                },
            )

        # 2. Extract geometry node coordinates
        geometry_nodes = element.get("geometry", [])
        if not geometry_nodes or len(geometry_nodes) < 2:
            return (
                None,
                {
                    "osm_way_id": way_id,
                    "reason": "insufficient_geometry_nodes",
                    "tags": tags,
                },
            )

        coords = [(node["lon"], node["lat"]) for node in geometry_nodes if "lon" in node and "lat" in node]
        geom_result = validate_and_build_linestring(coords, bbox=bbox)
        if not geom_result:
            return (
                None,
                {
                    "osm_way_id": way_id,
                    "reason": "invalid_geometry_or_out_of_bounds",
                    "tags": tags,
                },
            )

        wkt_str, centroid_lat, centroid_lng = geom_result

        # 3. Parse attributes
        road_name = tags.get("name")
        lanes, lanes_imputed = parse_lanes(tags.get("lanes"), highway)
        speed_limit, speed_imputed = parse_speed_limit(tags.get("maxspeed"), highway)
        is_junction = parse_junction_tag(tags.get("junction"))
        is_lit = parse_boolean_tag(tags.get("lit"))
        h3_cell = compute_h3_cell(centroid_lat, centroid_lng, resolution=8)

        accepted_record = {
            "osm_way_id": int(way_id),
            "road_name": road_name,
            "road_type": str(highway).lower(),
            "lanes": lanes,
            "speed_limit": speed_limit,
            "is_junction": is_junction,
            "is_lit": is_lit,
            "h3_index": h3_cell,
            "geometry_wkt": wkt_str,
            "lanes_imputed": lanes_imputed,
            "speed_imputed": speed_imputed,
        }

        return (accepted_record, None)

    async def execute_pipeline(
        self,
        db_session: AsyncSession | None = None,
        region_name: str = "delhi_ncr",
        raw_elements: list[dict] | None = None,
        dry_run: bool = False,
        limit: int | None = None,
    ) -> dict[str, Any]:
        """Executes full OSM extraction, normalization, H3 assignment, and database upsert.
        
        Args:
            db_session: Optional active AsyncSession.
            region_name: Target region key (default 'delhi_ncr').
            raw_elements: Optional raw OSM elements (for offline test fixtures).
            dry_run: If True, executes pipeline without DB persistence.
            limit: Optional max records cap.
            
        Returns:
            Execution summary dict.
        """
        start_time = time.time()
        run_id = str(uuid.uuid4())[:8]
        region_cfg = get_region_config(region_name)

        logger.info(
            f"Starting OSM Ingestion Run {run_id} (Region={region_name}, DryRun={dry_run}, Limit={limit})"
        )

        # 1. Fetch raw OSM data if not supplied
        if raw_elements is None:
            raw_elements = await self.fetch_overpass_data(region_cfg.bounding_box)

        if limit and limit > 0:
            raw_elements = raw_elements[:limit]

        total_processed = len(raw_elements)
        accepted_records: list[dict] = []
        rejected_records: list[dict] = []

        # 2. Parse and normalize elements
        for el in raw_elements:
            accepted, rejected = self.parse_raw_element(el, bbox=region_cfg.bounding_box)
            if accepted:
                accepted_records.append(accepted)
            elif rejected:
                rejected_records.append(rejected)

        total_accepted = len(accepted_records)
        total_rejected = len(rejected_records)

        # Save quarantine log artifact for rejected records
        if rejected_records:
            quarantine_manager.save_quarantine_artifact(run_id, rejected_records)

        total_persisted = 0

        # 3. Database Persistence (Idempotent Upsert)
        if not dry_run and db_session and accepted_records:
            for rec in accepted_records:
                # Check for existing record by osm_way_id
                stmt = select(RoadSegment).where(RoadSegment.osm_way_id == rec["osm_way_id"])
                res = await db_session.execute(stmt)
                existing = res.scalar_one_or_none()

                if existing:
                    # Idempotent update
                    existing.road_name = rec["road_name"]
                    existing.road_type = rec["road_type"]
                    existing.lanes = rec["lanes"]
                    existing.speed_limit = rec["speed_limit"]
                    existing.is_junction = rec["is_junction"]
                    existing.is_lit = rec["is_lit"]
                    existing.h3_index = rec["h3_index"]
                    existing.geometry_wkt = rec["geometry_wkt"]
                else:
                    new_segment = RoadSegment(
                        id=uuid.uuid4(),
                        osm_way_id=rec["osm_way_id"],
                        road_name=rec["road_name"],
                        road_type=rec["road_type"],
                        lanes=rec["lanes"],
                        speed_limit=rec["speed_limit"],
                        is_junction=rec["is_junction"],
                        is_lit=rec["is_lit"],
                        h3_index=rec["h3_index"],
                        geometry_wkt=rec["geometry_wkt"],
                    )
                    db_session.add(new_segment)
                total_persisted += 1

            await db_session.commit()
            logger.info(f"Persisted {total_persisted} road_segments into database.")

        duration = round(time.time() - start_time, 2)
        run_status = "DRY_RUN" if dry_run else "COMPLETED"

        # 4. Record Ingestion Run Metadata
        if not dry_run and db_session:
            run_metadata = IngestionRun(
                id=uuid.uuid4(),
                run_id=f"run_{run_id}",
                region_name=region_name,
                pipeline_type="osm_road",
                source_url=OVERPASS_ENDPOINTS[0],
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
            "run_id": f"run_{run_id}",
            "region_name": region_name,
            "status": run_status,
            "duration_seconds": duration,
            "total_processed": total_processed,
            "total_accepted": total_accepted,
            "total_rejected": total_rejected,
            "total_persisted": total_persisted,
        }

        logger.info(f"OSM Ingestion Pipeline Execution Summary: {summary}")
        return summary


osm_pipeline_service = OsmPipelineService()


async def main_cli():
    """CLI Entrypoint for executing OSM Ingestion Pipeline."""
    parser = argparse.ArgumentParser(description="SafeRoute AI - OSM Road Infrastructure Pipeline")
    parser.add_argument("--region", default="delhi_ncr", help="Target region name")
    parser.add_argument("--dry-run", action="store_true", help="Execute without database persistence")
    parser.add_argument("--limit", type=int, default=None, help="Cap maximum elements to process")

    args = parser.parse_args()

    async with AsyncSessionLocal() as session:
        summary = await osm_pipeline_service.execute_pipeline(
            db_session=session,
            region_name=args.region,
            dry_run=args.dry_run,
            limit=args.limit,
        )
        print(f"Pipeline Result: {summary}")


if __name__ == "__main__":
    asyncio.run(main_cli())

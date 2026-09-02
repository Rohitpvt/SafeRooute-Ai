import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models.accident_record import AccidentRecord
from app.models.road_segment import RoadSegment
from app.services.accident_adapters import (
    AcademicCrashAdapter,
    DelhiBlackspotAdapter,
    SyntheticFixtureAdapter,
)
from app.services.accident_pipeline import (
    accident_pipeline_service,
    calculate_point_to_linestring_distance_meters,
)


def test_blackspot_adapter_classification():
    """Verifies that blackspots are classified as BLACKSPOT_RECORD spatial priors."""
    adapter = DelhiBlackspotAdapter()
    raw = {
        "blackspot_id": "BLK-DELHI-001",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "severity": "Fatal",
    }
    norm = adapter.adapt_record(raw)
    assert norm["record_type"] == "BLACKSPOT_RECORD"
    assert norm["source_name"] == "Delhi_Traffic_Police_Blackspots"
    assert norm["severity"] == "Fatal"


def test_academic_crash_adapter():
    """Verifies academic crash adapter canonical mapping."""
    adapter = AcademicCrashAdapter()
    raw = {
        "crash_id": "CRASH-NCR-2026-999",
        "latitude": 28.6150,
        "longitude": 77.2100,
        "severity": "Serious",
        "timestamp": "2026-08-30T14:30:00Z",
    }
    norm = adapter.adapt_record(raw)
    assert norm["record_type"] == "ACCIDENT_RECORD"
    assert norm["source_record_id"] == "CRASH-NCR-2026-999"
    assert norm["severity"] == "Serious"


def test_distance_calculation_to_linestring():
    """Tests geodesic distance calculation from point to LineString WKT."""
    pt_lat, pt_lng = 28.6139, 77.2090
    line_wkt = "LINESTRING(77.2090 28.6139, 77.2100 28.6149)"
    dist = calculate_point_to_linestring_distance_meters(pt_lat, pt_lng, line_wkt)
    assert round(dist, 2) == 0.0


def test_coordinate_and_timestamp_validation():
    """Tests boundary validation and future timestamp rejection."""
    bbox = (28.40, 76.85, 28.88, 77.45)
    valid_coord, _ = accident_pipeline_service.validate_raw_coordinates(28.6139, 77.2090, bbox)
    assert valid_coord is True

    invalid_coord, err = accident_pipeline_service.validate_raw_coordinates(10.0, 10.0, bbox)
    assert invalid_coord is False
    assert "out_of_region_bounds" in err

    future_ts = datetime.utcnow() + timedelta(days=5)
    ts_ok, ts_err = accident_pipeline_service.validate_timestamp(future_ts)
    assert ts_ok is False
    assert "future_timestamp" in ts_err


@pytest.mark.asyncio
async def test_accident_pipeline_ingestion_matching_and_idempotency(client: TestClient):
    """Tests accident pipeline ingestion with map-matching and idempotency verification."""
    db_session = client.db_session

    # Isolated test coordinates within Delhi NCR bounding box (28.40, 76.85, 28.88, 77.45)
    test_way_id = 999888777111
    road = RoadSegment(
        id=uuid4(),
        osm_way_id=test_way_id,
        road_name="Test Isolated Junction",
        road_type="primary",
        lanes=4,
        speed_limit=60,
        h3_index="8860b526d1fffff",
        geometry_wkt="LINESTRING(77.1090 28.5139, 77.1100 28.5149)",
    )
    db_session.add(road)
    await db_session.flush()

    raw_accidents = [
        {
            "fixture_id": "SYNTH-001",
            "latitude": 28.5139,  # Exact match on 999888777111 (0m distance)
            "longitude": 77.1090,
            "severity": "Fatal",
            "timestamp": "2026-08-30T10:00:00Z",
        },
        {
            "fixture_id": "SYNTH-002",
            "latitude": 10.0,  # Out of bounds -> Rejection
            "longitude": 10.0,
            "severity": "Minor",
            "timestamp": "2026-08-30T10:00:00Z",
        },
    ]

    # Run 1: Ingest mock accident records
    summary1 = await accident_pipeline_service.execute_pipeline(
        db_session=db_session,
        source_key="synthetic_fixtures",
        region_name="delhi_ncr",
        raw_records=raw_accidents,
        dry_run=False,
    )

    assert summary1["total_processed"] == 2
    assert summary1["total_accepted"] == 1
    assert summary1["total_rejected"] == 1
    assert summary1["total_persisted"] == 1

    # Verify persisted AccidentRecord
    stmt1 = select(AccidentRecord).where(AccidentRecord.source_record_id == "SYNTH-001")
    res1 = await db_session.execute(stmt1)
    acc = res1.scalar_one_or_none()
    assert acc is not None
    assert acc.matched_osm_way_id == test_way_id
    assert acc.match_confidence == "EXACT"
    assert acc.dataset_mode == "PIPELINE_SYNTHETIC"

    # Run 2: Re-ingest exact same records to verify IDEMPOTENCY (0 duplicate records created)
    summary2 = await accident_pipeline_service.execute_pipeline(
        db_session=db_session,
        source_key="synthetic_fixtures",
        region_name="delhi_ncr",
        raw_records=raw_accidents,
        dry_run=False,
    )

    assert summary2["total_accepted"] == 1
    stmt2 = select(AccidentRecord).where(AccidentRecord.source_record_id == "SYNTH-001")
    res2 = await db_session.execute(stmt2)
    all_accidents = res2.scalars().all()
    assert len(all_accidents) == 1  # Exactly 1 record, no duplicates!

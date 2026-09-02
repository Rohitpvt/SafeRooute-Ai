import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models.ingestion_run import IngestionRun
from app.models.road_segment import RoadSegment
from app.services.osm_normalizer import (
    compute_h3_cell,
    is_included_highway,
    parse_boolean_tag,
    parse_lanes,
    parse_speed_limit,
    validate_and_build_linestring,
)
from app.services.osm_pipeline import osm_pipeline_service


def test_highway_class_filtering():
    """Tests road class inclusion and exclusion taxonomy."""
    assert is_included_highway("motorway") is True
    assert is_included_highway("primary") is True
    assert is_included_highway("secondary") is True
    assert is_included_highway("residential") is True

    assert is_included_highway("footway") is False
    assert is_included_highway("cycleway") is False
    assert is_included_highway("pedestrian") is False
    assert is_included_highway("steps") is False


def test_lanes_parsing():
    """Tests lane count string parsing and imputation fallback."""
    lanes, imputed = parse_lanes("4", "primary")
    assert lanes == 4
    assert imputed is False

    lanes, imputed = parse_lanes("2;3", "secondary")
    assert lanes == 2
    assert imputed is False

    lanes, imputed = parse_lanes(None, "motorway")
    assert lanes == 4
    assert imputed is True


def test_speed_limit_parsing():
    """Tests maxspeed parsing (km/h, mph, and imputation)."""
    speed, imputed = parse_speed_limit("60", "primary")
    assert speed == 60
    assert imputed is False

    speed, imputed = parse_speed_limit("50 km/h", "secondary")
    assert speed == 50
    assert imputed is False

    speed, imputed = parse_speed_limit("30 mph", "residential")
    assert speed == 48
    assert imputed is False

    speed, imputed = parse_speed_limit(None, "primary")
    assert speed == 60
    assert imputed is True


def test_geometry_linestring_validation():
    """Tests LineString construction and boundary validation."""
    valid_coords = [(77.2090, 28.6139), (77.2100, 28.6149)]
    bbox = (28.40, 76.85, 28.88, 77.45)

    result = validate_and_build_linestring(valid_coords, bbox=bbox)
    assert result is not None
    wkt, lat, lng = result
    assert wkt.startswith("LINESTRING")
    assert abs(lat - 28.6144) < 0.001
    assert abs(lng - 77.2095) < 0.001

    # Single point node sequence should fail validation
    assert validate_and_build_linestring([(77.2090, 28.6139)], bbox=bbox) is None


def test_h3_cell_computation():
    """Tests H3 Resolution 8 index calculation."""
    cell = compute_h3_cell(28.6139, 77.2090, resolution=8)
    assert isinstance(cell, str)
    assert len(cell) > 5


@pytest.mark.asyncio
async def test_osm_pipeline_mock_ingestion_and_idempotency(client: TestClient):
    """Tests full pipeline processing with mock Overpass elements and verifies idempotency."""
    db_session = client.db_session

    mock_elements = [
        {
            "type": "way",
            "id": 100200300400,
            "tags": {
                "highway": "primary",
                "name": "Mathura Road Test",
                "lanes": "4",
                "maxspeed": "60 km/h",
                "lit": "yes",
            },
            "geometry": [
                {"lat": 28.6139, "lon": 77.2090},
                {"lat": 28.6150, "lon": 77.2100},
            ],
        },
        {
            "type": "way",
            "id": 100200300401,
            "tags": {
                "highway": "footway",  # Should be filtered out
                "name": "Park Pedestrian Path",
            },
            "geometry": [
                {"lat": 28.6139, "lon": 77.2090},
                {"lat": 28.6140, "lon": 77.2091},
            ],
        },
    ]

    # Run 1: Ingest mock elements into DB
    summary1 = await osm_pipeline_service.execute_pipeline(
        db_session=db_session,
        region_name="delhi_ncr",
        raw_elements=mock_elements,
        dry_run=False,
    )

    assert summary1["total_processed"] == 2
    assert summary1["total_accepted"] == 1
    assert summary1["total_rejected"] == 1
    assert summary1["total_persisted"] == 1

    # Verify road_segments record
    stmt1 = select(RoadSegment).where(RoadSegment.osm_way_id == 100200300400)
    res1 = await db_session.execute(stmt1)
    road = res1.scalar_one_or_none()
    assert road is not None
    assert road.road_name == "Mathura Road Test"
    assert road.speed_limit == 60

    # Run 2: Re-ingest exact same elements to verify IDEMPOTENCY (0 duplicate records created)
    summary2 = await osm_pipeline_service.execute_pipeline(
        db_session=db_session,
        region_name="delhi_ncr",
        raw_elements=mock_elements,
        dry_run=False,
    )

    assert summary2["total_accepted"] == 1
    stmt2 = select(RoadSegment).where(RoadSegment.osm_way_id == 100200300400)
    res2 = await db_session.execute(stmt2)
    all_roads = res2.scalars().all()
    assert len(all_roads) == 1  # Exactly 1 record, no duplicates!

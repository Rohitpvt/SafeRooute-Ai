import pytest
from datetime import datetime
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.models.road_segment import RoadSegment
from app.models.accident_record import AccidentRecord
from app.models.weather_observation import WeatherObservation


def test_phase1_config_settings():
    """Verifies that Phase 1 configuration settings are correctly exposed."""
    assert settings.ACTIVE_REGION == "delhi_ncr"
    assert settings.DATASET_PROVENANCE_MODE in ["RESEARCH_REAL", "LIMITED_REAL", "PIPELINE_SYNTHETIC"]
    assert settings.DATABASE_URL is not None


@pytest.mark.asyncio
async def test_road_segment_orm_instantiation(client: TestClient):
    """Tests RoadSegment ORM instantiation and query execution."""
    db_session = client.db_session
    test_way_id = 99887766554433
    road = RoadSegment(
        id=uuid4(),
        osm_way_id=test_way_id,
        road_name="Delhi Ring Road",
        road_type="arterial",
        lanes=4,
        speed_limit=60,
        is_junction=True,
        is_lit=True,
        h3_index="8860b526d1fffff",
        geometry_wkt="LINESTRING(77.2090 28.6139, 77.2100 28.6149)",
    )
    db_session.add(road)
    await db_session.flush()

    result = await db_session.execute(
        select(RoadSegment).where(RoadSegment.osm_way_id == test_way_id)
    )
    queried_road = result.scalar_one_or_none()
    assert queried_road is not None
    assert queried_road.road_name == "Delhi Ring Road"
    assert queried_road.lanes == 4
    assert queried_road.speed_limit == 60
    assert queried_road.h3_index == "8860b526d1fffff"


@pytest.mark.asyncio
async def test_road_segment_unique_osm_way_id_constraint(client: TestClient):
    """Verifies that duplicate osm_way_id values trigger IntegrityError."""
    db_session = client.db_session
    duplicate_way_id = 1234567890
    road1 = RoadSegment(
        id=uuid4(),
        osm_way_id=duplicate_way_id,
        road_type="primary",
        h3_index="8860b526d1fffff",
    )
    road2 = RoadSegment(
        id=uuid4(),
        osm_way_id=duplicate_way_id,
        road_type="secondary",
        h3_index="8860b526d1fffff",
    )
    db_session.add(road1)
    await db_session.flush()

    db_session.add(road2)
    with pytest.raises(IntegrityError):
        await db_session.flush()

    await db_session.rollback()


@pytest.mark.asyncio
async def test_accident_record_provenance_and_quarantine(client: TestClient):
    """Tests AccidentRecord provenance metadata and quarantine status."""
    db_session = client.db_session
    acc = AccidentRecord(
        id=uuid4(),
        source_name="Delhi_Traffic_Police_Blackspots",
        source_record_id="BLK-NCR-2026-001",
        dataset_mode="RESEARCH_REAL",
        original_timestamp=datetime.utcnow(),
        severity="Fatal",
        latitude=28.6139,
        longitude=77.2090,
        matched_osm_way_id=99887766554433,
        match_distance_meters=12.5,
        h3_index="8860b526d1fffff",
        is_quarantined=False,
        geometry_wkt="POINT(77.2090 28.6139)",
    )
    db_session.add(acc)
    await db_session.flush()

    result = await db_session.execute(
        select(AccidentRecord).where(AccidentRecord.source_record_id == "BLK-NCR-2026-001")
    )
    queried_acc = result.scalar_one_or_none()
    assert queried_acc is not None
    assert queried_acc.dataset_mode == "RESEARCH_REAL"
    assert queried_acc.severity == "Fatal"
    assert queried_acc.match_distance_meters == 12.5
    assert queried_acc.is_quarantined is False


@pytest.mark.asyncio
async def test_weather_observation_unique_h3_timestamp(client: TestClient):
    """Tests WeatherObservation uniqueness constraint on (h3_index, timestamp)."""
    db_session = client.db_session
    h3_idx = "8860b526d1fffff"
    ts = datetime(2026, 8, 31, 12, 0, 0)

    weather1 = WeatherObservation(
        id=uuid4(),
        h3_index=h3_idx,
        timestamp=ts,
        temperature_c=32.5,
        precipitation_mm=0.0,
        weather_condition="Clear",
    )
    weather2 = WeatherObservation(
        id=uuid4(),
        h3_index=h3_idx,
        timestamp=ts,
        temperature_c=33.0,
        precipitation_mm=5.0,
        weather_condition="Rainy",
    )

    db_session.add(weather1)
    await db_session.flush()

    db_session.add(weather2)
    with pytest.raises(IntegrityError):
        await db_session.flush()

    await db_session.rollback()

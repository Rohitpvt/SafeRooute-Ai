import os
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models.weather_observation import WeatherObservation
from app.services.weather_normalizer import (
    map_wmo_code_to_condition,
    normalize_utc_timestamp,
    validate_weather_observation,
)
from app.services.weather_pipeline import weather_pipeline_service


def test_wmo_code_mapping():
    """Tests WMO weather code mapping to canonical conditions."""
    assert map_wmo_code_to_condition(0) == "Clear"
    assert map_wmo_code_to_condition(1) == "Cloudy"
    assert map_wmo_code_to_condition(45) == "Fog"
    assert map_wmo_code_to_condition(61) == "Rain"
    assert map_wmo_code_to_condition(71) == "Snow"
    assert map_wmo_code_to_condition(95) == "Storm"
    assert map_wmo_code_to_condition(None) == "Clear"


def test_weather_observation_validation():
    """Tests physical plausibility constraints for weather variables."""
    ts = datetime.utcnow() - timedelta(hours=1)
    
    # Valid observation
    valid, err = validate_weather_observation(32.5, 0.0, 10000.0, ts)
    assert valid is True
    assert err is None

    # Implausible temperature (e.g. 100°C)
    invalid, err = validate_weather_observation(100.0, 0.0, 10000.0, ts)
    assert invalid is False
    assert "implausible_temperature" in err

    # Negative precipitation
    invalid, err = validate_weather_observation(25.0, -5.0, 10000.0, ts)
    assert invalid is False
    assert "negative_precipitation" in err

    # Future timestamp
    future_ts = datetime.utcnow() + timedelta(days=2)
    invalid, err = validate_weather_observation(25.0, 0.0, 10000.0, future_ts)
    assert invalid is False
    assert "future_timestamp" in err


def test_temporal_gap_detection():
    """Tests temporal gap detection in hourly weather sequences."""
    start_date = "2024-01-01"
    end_date = "2024-01-01"  # Expecting 24 hours (00:00 to 23:00)

    received_ts = [
        datetime(2024, 1, 1, h, 0, 0) for h in range(24) if h != 12  # Hour 12 is missing
    ]

    gaps = weather_pipeline_service.detect_temporal_gaps(received_ts, start_date, end_date)
    assert len(gaps) == 1
    assert "2024-01-01T12:00:00Z" in gaps[0]


@pytest.mark.asyncio
async def test_weather_pipeline_fixture_and_idempotency(client: TestClient):
    """Tests weather pipeline with offline response fixture and verifies idempotency."""
    db_session = client.db_session

    mock_weather_data = {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "timezone": "UTC",
        "hourly": {
            "time": ["2024-01-01T00:00", "2024-01-01T01:00"],
            "temperature_2m": [15.2, 14.8],
            "precipitation": [0.0, 0.2],
            "visibility": [10000.0, 8000.0],
            "weather_code": [0, 61],
        },
    }

    # Run 1: Ingest mock weather fixture
    summary1 = await weather_pipeline_service.execute_pipeline(
        db_session=db_session,
        region_name="delhi_ncr",
        start_date="2024-01-01",
        end_date="2024-01-01",
        raw_fixture=mock_weather_data,
        dry_run=False,
    )

    assert summary1["total_processed"] == 2
    assert summary1["total_accepted"] == 2
    assert summary1["total_persisted"] == 2

    # Verify weather_observations record
    stmt1 = select(WeatherObservation)
    res1 = await db_session.execute(stmt1)
    records1 = res1.scalars().all()
    assert len(records1) == 2

    # Run 2: Re-ingest exact same weather fixture to verify IDEMPOTENCY (0 duplicate records created)
    summary2 = await weather_pipeline_service.execute_pipeline(
        db_session=db_session,
        region_name="delhi_ncr",
        start_date="2024-01-01",
        end_date="2024-01-01",
        raw_fixture=mock_weather_data,
        dry_run=False,
    )

    assert summary2["total_accepted"] == 2
    stmt2 = select(WeatherObservation)
    res2 = await db_session.execute(stmt2)
    records2 = res2.scalars().all()
    assert len(records2) == 2  # Exactly 2 records, no duplicates!

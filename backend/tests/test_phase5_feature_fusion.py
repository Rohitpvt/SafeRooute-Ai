import os
import pytest
import pandas as pd
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from ml.dataset_builder import (
    calculate_exposure_proxy,
    calculate_rolling_crash_priors,
    convert_utc_to_ist,
    dataset_builder,
)
from ml.feature_schema import FEATURE_DEFINITIONS, export_feature_schema_json


def test_utc_to_ist_timezone_conversion():
    """Tests UTC to IST (Asia/Kolkata UTC+5:30) conversion and temporal feature extraction."""
    # 2026-08-31 18:30 UTC -> 2026-09-01 00:00 IST (Tuesday)
    ts_utc = datetime(2026, 8, 31, 18, 30, 0)
    ts_ist, hour, dow, is_wknd, month = convert_utc_to_ist(ts_utc)

    assert ts_ist == datetime(2026, 9, 1, 0, 0, 0)
    assert hour == 0
    assert dow == 1  # Tuesday
    assert is_wknd == 0
    assert month == 9


def test_exposure_proxy_calculation():
    """Tests exposure proxy calculation formula."""
    exp_rush = calculate_exposure_proxy(lanes=4, speed_limit=60, road_type="primary", hour_of_day=9)
    exp_night = calculate_exposure_proxy(lanes=4, speed_limit=60, road_type="primary", hour_of_day=2)

    assert exp_rush > exp_night
    assert exp_rush == round(4 * 1.2 * 1.5 * 1.5, 3)


def test_rolling_crash_priors_and_leakage_guard():
    """Tests rolling historical priors and confirms target hour t is strictly excluded."""
    obs_ts = datetime(2026, 8, 31, 12, 0, 0)
    way_id = 100200300

    accidents = [
        {"matched_osm_way_id": way_id, "original_timestamp": datetime(2026, 8, 30, 12, 0, 0)},  # 1 day ago (In 7d, 30d, 90d, 365d)
        {"matched_osm_way_id": way_id, "original_timestamp": datetime(2026, 8, 1, 12, 0, 0)},   # 30 days ago (In 30d, 90d, 365d)
        {"matched_osm_way_id": way_id, "original_timestamp": datetime(2026, 8, 31, 12, 0, 0)},  # SAME HOUR t -> MUST BE EXCLUDED!
        {"matched_osm_way_id": way_id, "original_timestamp": datetime(2026, 9, 1, 12, 0, 0)},   # FUTURE -> MUST BE EXCLUDED!
    ]

    p7, p30, p90, p365 = calculate_rolling_crash_priors(way_id, obs_ts, accidents)

    assert p7 == 1      # Only 1 day ago
    assert p30 == 2     # 1 day ago + 30 days ago
    assert p90 == 2
    assert p365 == 2


def test_feature_schema_registry_export():
    """Tests feature schema JSON export."""
    target_path = os.path.join("data", "processed", "test_feature_schema.json")
    exported_path = export_feature_schema_json(target_path)
    assert os.path.exists(exported_path)


@pytest.mark.asyncio
async def test_dataset_builder_pipeline_and_parquet_artifact(client: TestClient):
    """Tests dataset construction pipeline, leakage audit, Parquet export, and artifact readability."""
    mock_fixtures = {
        "roads": [
            {
                "osm_way_id": 5544332211,
                "road_type": "primary",
                "lanes": 4,
                "speed_limit": 60,
                "is_junction": 1,
                "is_lit": 1,
                "h3_index": "8860b526d1fffff",
            }
        ],
        "accidents": [
            {
                "source_record_id": "TEST-CRASH-001",
                "matched_osm_way_id": 5544332211,
                "original_timestamp": datetime(2026, 8, 30, 10, 0, 0),
                "h3_index": "8860b526d1fffff",
                "dataset_mode": "PIPELINE_SYNTHETIC",
            }
        ],
        "weather": [
            {
                "h3_index": "8860b526d1fffff",
                "timestamp": datetime(2026, 8, 30, 10, 0, 0),
                "temperature_c": 28.5,
                "precipitation_mm": 0.0,
                "visibility_meters": 10000.0,
                "weather_condition": "Clear",
            }
        ],
    }

    output_parquet = "test_delhi_ncr_multi_source_v1.parquet"
    summary = await dataset_builder.build_dataset(
        synthetic_fixtures=mock_fixtures, output_filename=output_parquet
    )

    assert summary["row_count"] == 2  # 1 Positive (y=1) + 1 Negative Control (y=0)
    assert summary["positive_count"] == 1
    assert summary["negative_count"] == 1
    assert summary["leakage_status"] == "PASS"

    parquet_path = summary["parquet_path"]
    meta_path = summary["meta_path"]

    assert os.path.exists(parquet_path)
    assert os.path.exists(meta_path)

    # Read back generated Parquet file to verify schema and row content
    df_read = pd.read_parquet(parquet_path)
    assert len(df_read) == 2
    assert "accident_occurred" in df_read.columns
    assert "crash_prior_7d" in df_read.columns
    assert "exposure_proxy" in df_read.columns
    assert int(df_read["accident_occurred"].iloc[0]) == 1
    assert int(df_read["accident_occurred"].iloc[1]) == 0

import json
import os
from typing import Any

FEATURE_SCHEMA_VERSION = "1.0.0"

FEATURE_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "osm_way_id",
        "dtype": "int64",
        "category": "identifier",
        "description": "Unique OpenStreetMap Way ID of the road segment",
        "nullable": False,
    },
    {
        "name": "h3_index",
        "dtype": "string",
        "category": "spatial",
        "description": "Uber H3 Resolution 8 spatial cell index",
        "nullable": False,
    },
    {
        "name": "timestamp_utc",
        "dtype": "datetime64[ns]",
        "category": "temporal",
        "description": "Observation UTC timestamp",
        "nullable": False,
    },
    {
        "name": "timestamp_ist",
        "dtype": "datetime64[ns]",
        "category": "temporal",
        "description": "Observation local IST (Asia/Kolkata) timestamp",
        "nullable": False,
    },
    {
        "name": "hour_of_day",
        "dtype": "int32",
        "category": "temporal",
        "description": "Hour of day (0-23 in IST)",
        "nullable": False,
    },
    {
        "name": "day_of_week",
        "dtype": "int32",
        "category": "temporal",
        "description": "Day of week (0=Monday, 6=Sunday in IST)",
        "nullable": False,
    },
    {
        "name": "is_weekend",
        "dtype": "int32",
        "category": "temporal",
        "description": "Binary indicator for weekend (1=Sat/Sun, 0=Mon-Fri)",
        "nullable": False,
    },
    {
        "name": "month",
        "dtype": "int32",
        "category": "temporal",
        "description": "Month of year (1-12 in IST)",
        "nullable": False,
    },
    {
        "name": "road_type",
        "dtype": "string",
        "category": "infrastructure",
        "description": "OSM highway road taxonomy class",
        "nullable": False,
    },
    {
        "name": "lanes",
        "dtype": "int32",
        "category": "infrastructure",
        "description": "Number of drivable lanes",
        "nullable": False,
    },
    {
        "name": "speed_limit",
        "dtype": "int32",
        "category": "infrastructure",
        "description": "Speed limit in km/h",
        "nullable": False,
    },
    {
        "name": "is_junction",
        "dtype": "int32",
        "category": "infrastructure",
        "description": "Binary junction / roundabout indicator",
        "nullable": False,
    },
    {
        "name": "is_lit",
        "dtype": "int32",
        "category": "infrastructure",
        "description": "Binary street lighting indicator",
        "nullable": False,
    },
    {
        "name": "temperature_c",
        "dtype": "float64",
        "category": "weather",
        "description": "Ambient temperature in Celsius",
        "nullable": True,
    },
    {
        "name": "precipitation_mm",
        "dtype": "float64",
        "category": "weather",
        "description": "Hourly precipitation in millimeters",
        "nullable": True,
    },
    {
        "name": "visibility_meters",
        "dtype": "float64",
        "category": "weather",
        "description": "Atmospheric visibility in meters",
        "nullable": True,
    },
    {
        "name": "weather_condition",
        "dtype": "string",
        "category": "weather",
        "description": "WMO weather condition category (Clear/Rain/Fog/etc.)",
        "nullable": False,
    },
    {
        "name": "crash_prior_7d",
        "dtype": "int32",
        "category": "historical_prior",
        "description": "Rolling crash count on segment in preceding 7 days [t-7d, t)",
        "nullable": False,
    },
    {
        "name": "crash_prior_30d",
        "dtype": "int32",
        "category": "historical_prior",
        "description": "Rolling crash count on segment in preceding 30 days [t-30d, t)",
        "nullable": False,
    },
    {
        "name": "crash_prior_90d",
        "dtype": "int32",
        "category": "historical_prior",
        "description": "Rolling crash count on segment in preceding 90 days [t-90d, t)",
        "nullable": False,
    },
    {
        "name": "crash_prior_365d",
        "dtype": "int32",
        "category": "historical_prior",
        "description": "Rolling crash count on segment in preceding 365 days [t-365d, t)",
        "nullable": False,
    },
    {
        "name": "exposure_proxy",
        "dtype": "float64",
        "category": "exposure",
        "description": "Calculated exposure proxy score",
        "nullable": False,
    },
    {
        "name": "accident_occurred",
        "dtype": "int32",
        "category": "target",
        "description": "Supervised binary target (1=Crash occurred, 0=Negative control)",
        "nullable": False,
    },
    {
        "name": "sample_weight",
        "dtype": "float64",
        "category": "meta",
        "description": "Case-control downsampling sample weight",
        "nullable": False,
    },
    {
        "name": "dataset_mode",
        "dtype": "string",
        "category": "meta",
        "description": "Provenance mode (RESEARCH_REAL, LIMITED_REAL, PIPELINE_SYNTHETIC)",
        "nullable": False,
    },
]


def export_feature_schema_json(target_path: str = "ml/feature_schema.json") -> str:
    """Exports feature schema definitions to JSON registry file."""
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    payload = {
        "schema_version": FEATURE_SCHEMA_VERSION,
        "feature_count": len(FEATURE_DEFINITIONS),
        "features": FEATURE_DEFINITIONS,
    }
    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    return target_path

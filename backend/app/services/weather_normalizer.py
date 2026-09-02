from datetime import datetime, timedelta
from typing import Any

WMO_WEATHER_CODE_MAP = {
    0: "Clear",
    1: "Cloudy",
    2: "Cloudy",
    3: "Cloudy",
    45: "Fog",
    48: "Fog",
    51: "Rain",
    53: "Rain",
    55: "Rain",
    56: "Rain",
    57: "Rain",
    61: "Rain",
    63: "Rain",
    65: "Rain",
    66: "Rain",
    67: "Rain",
    71: "Snow",
    73: "Snow",
    75: "Snow",
    77: "Snow",
    80: "Rain",
    81: "Rain",
    82: "Rain",
    85: "Snow",
    86: "Snow",
    95: "Storm",
    96: "Storm",
    99: "Storm",
}


def map_wmo_code_to_condition(wmo_code: Any) -> str:
    """Maps WMO Weather Interpretation Code to canonical weather condition category."""
    if wmo_code is None:
        return "Clear"
    try:
        code_int = int(wmo_code)
        return WMO_WEATHER_CODE_MAP.get(code_int, "Clear")
    except (ValueError, TypeError):
        return "Clear"


def validate_weather_observation(
    temp_c: float | None,
    precip_mm: float | None,
    visibility_m: float | None,
    ts: datetime,
) -> tuple[bool, str | None]:
    """Validates physical plausibility of weather variables and timestamp constraint."""
    if not ts:
        return (False, "missing_timestamp")

    ts_naive = ts.replace(tzinfo=None) if ts.tzinfo is not None else ts
    if ts_naive > datetime.utcnow() + timedelta(minutes=10):
        return (False, f"future_timestamp:{ts.isoformat()}")

    if temp_c is not None and not (-50.0 <= temp_c <= 60.0):
        return (False, f"implausible_temperature:{temp_c}C")

    if precip_mm is not None and precip_mm < 0.0:
        return (False, f"negative_precipitation:{precip_mm}mm")

    if visibility_m is not None and visibility_m < 0.0:
        return (False, f"negative_visibility:{visibility_m}m")

    return (True, None)


def normalize_utc_timestamp(ts_raw: Any) -> datetime | None:
    """Normalizes raw timestamp string or datetime object into UTC naive datetime."""
    if isinstance(ts_raw, datetime):
        return ts_raw.replace(tzinfo=None)
    if not ts_raw:
        return None

    try:
        dt = datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00"))
        return dt.replace(tzinfo=None)
    except Exception:
        try:
            return datetime.strptime(str(ts_raw).strip(), "%Y-%m-%d %H:%M:%S")
        except Exception:
            return None

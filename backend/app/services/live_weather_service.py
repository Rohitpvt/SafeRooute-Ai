import asyncio
import os
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import httpx

from app.logging_config import logger
from app.services.weather_normalizer import validate_weather_observation

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# Canonical SafeRoute Weather States
WEATHER_STATE_CLEAR = "CLEAR"
WEATHER_STATE_CLOUDY = "CLOUDY"
WEATHER_STATE_LIGHT_RAIN = "LIGHT_RAIN"
WEATHER_STATE_HEAVY_RAIN = "HEAVY_RAIN"
WEATHER_STATE_FOG = "FOG"
WEATHER_STATE_STORM = "STORM"
WEATHER_STATE_LOW_VISIBILITY = "LOW_VISIBILITY"
WEATHER_STATE_UNKNOWN = "UNKNOWN"

WMO_CODE_TO_SAFEROUTE_STATE = {
    0: WEATHER_STATE_CLEAR,
    1: WEATHER_STATE_CLOUDY,
    2: WEATHER_STATE_CLOUDY,
    3: WEATHER_STATE_CLOUDY,
    45: WEATHER_STATE_FOG,
    48: WEATHER_STATE_FOG,
    51: WEATHER_STATE_LIGHT_RAIN,
    53: WEATHER_STATE_LIGHT_RAIN,
    55: WEATHER_STATE_LIGHT_RAIN,
    56: WEATHER_STATE_LIGHT_RAIN,
    57: WEATHER_STATE_LIGHT_RAIN,
    61: WEATHER_STATE_LIGHT_RAIN,
    63: WEATHER_STATE_HEAVY_RAIN,
    65: WEATHER_STATE_HEAVY_RAIN,
    66: WEATHER_STATE_HEAVY_RAIN,
    67: WEATHER_STATE_HEAVY_RAIN,
    71: WEATHER_STATE_LIGHT_RAIN,
    73: WEATHER_STATE_LIGHT_RAIN,
    75: WEATHER_STATE_HEAVY_RAIN,
    77: WEATHER_STATE_LIGHT_RAIN,
    80: WEATHER_STATE_LIGHT_RAIN,
    81: WEATHER_STATE_HEAVY_RAIN,
    82: WEATHER_STATE_HEAVY_RAIN,
    85: WEATHER_STATE_LIGHT_RAIN,
    86: WEATHER_STATE_HEAVY_RAIN,
    95: WEATHER_STATE_STORM,
    96: WEATHER_STATE_STORM,
    99: WEATHER_STATE_STORM,
}


class LiveWeatherService:
    """Service fetching, normalizing, and caching live environmental weather context."""

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_ttl_seconds = 300  # 5 minutes cache TTL

    def _get_cache_key(self, lat: float, lng: float) -> str:
        return f"{round(lat, 2):.2f}_{round(lng, 2):.2f}"

    def map_wmo_code(
        self,
        code: Optional[int],
        visibility_m: Optional[float] = None,
        precipitation_mm: Optional[float] = None,
        precip_prob: Optional[float] = None,
        cloud_cover: Optional[float] = None,
    ) -> str:
        if visibility_m is not None and visibility_m < 500.0:
            return WEATHER_STATE_LOW_VISIBILITY

        # 1. Direct physical precipitation check: If rain/precipitation is active (> 0.05 mm), map to rain
        if precipitation_mm is not None and precipitation_mm > 0.05:
            if precipitation_mm >= 2.5:
                return WEATHER_STATE_HEAVY_RAIN
            return WEATHER_STATE_LIGHT_RAIN

        # 2. High precipitation probability / active storm codes
        if code in (95, 96, 99) or (precip_prob is not None and precip_prob >= 85.0):
            return WEATHER_STATE_STORM if code in (95, 96, 99) else WEATHER_STATE_HEAVY_RAIN

        if code in (51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82) or (precip_prob is not None and precip_prob >= 50.0):
            if code in (63, 65, 66, 67, 81, 82):
                return WEATHER_STATE_HEAVY_RAIN
            return WEATHER_STATE_LIGHT_RAIN

        # 3. WMO codes for cloudy/partly cloudy or cloud cover >= 20%
        if code in (1, 2, 3) or (cloud_cover is not None and cloud_cover >= 20.0):
            return WEATHER_STATE_CLOUDY

        if code is None:
            return WEATHER_STATE_UNKNOWN
        return WMO_CODE_TO_SAFEROUTE_STATE.get(int(code), WEATHER_STATE_UNKNOWN)

    async def fetch_current_weather(self, lat: float, lng: float) -> Dict[str, Any]:
        """Fetches and normalizes current weather for coordinates with server-side caching and fallback handling."""
        now_utc = datetime.now(timezone.utc).isoformat()
        cache_key = self._get_cache_key(lat, lng)

        # Check in-memory server cache
        cached = self._cache.get(cache_key)
        if cached and (time.time() - cached["cached_at_ts"]) < self._cache_ttl_seconds:
            return cached["data"]

        params = {
            "latitude": lat,
            "longitude": lng,
            "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,cloud_cover,wind_speed_10m",
            "hourly": "visibility,precipitation_probability,precipitation,weather_code,cloud_cover",
            "timezone": "UTC",
        }
        headers = {"User-Agent": "SafeRouteAI/1.0"}

        try:
            async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
                resp = await client.get(OPEN_METEO_FORECAST_URL, params=params)

                if resp.status_code == 200:
                    raw = resp.json()
                    current = raw.get("current", {})
                    hourly = raw.get("hourly", {})

                    temp_c = current.get("temperature_2m")
                    apparent_temp_c = current.get("apparent_temperature")
                    humidity = current.get("relative_humidity_2m")
                    curr_precip = current.get("precipitation")
                    if curr_precip is None or curr_precip == 0:
                        curr_precip = (current.get("rain") or 0.0) + (current.get("showers") or 0.0)
                    
                    # Match current UTC hour in hourly forecast array
                    times = hourly.get("time", [])
                    curr_time = current.get("time")
                    idx = times.index(curr_time) if (curr_time and curr_time in times) else 0

                    hourly_wmos = hourly.get("weather_code", [])
                    hourly_probs = hourly.get("precipitation_probability", [])
                    hourly_precips = hourly.get("precipitation", [])
                    hourly_clouds = hourly.get("cloud_cover", [])
                    visibilities = hourly.get("visibility", [])

                    h_wmo = hourly_wmos[idx] if idx < len(hourly_wmos) else 0
                    h_prob = float(hourly_probs[idx]) if idx < len(hourly_probs) else 0.0
                    h_precip = float(hourly_precips[idx]) if idx < len(hourly_precips) else 0.0
                    h_cloud = float(hourly_clouds[idx]) if idx < len(hourly_clouds) else float(current.get("cloud_cover") or 0.0)
                    visibility_m = visibilities[idx] if idx < len(visibilities) else 10000.0

                    precip_mm = max(float(curr_precip or 0.0), h_precip)
                    wmo_code = current.get("weather_code")
                    if (wmo_code is None or wmo_code == 0) and h_wmo != 0:
                        wmo_code = h_wmo

                    wind_kmh = current.get("wind_speed_10m")

                    weather_state = self.map_wmo_code(
                        wmo_code,
                        visibility_m=visibility_m,
                        precipitation_mm=precip_mm,
                        precip_prob=h_prob,
                        cloud_cover=h_cloud,
                    )

                    normalized = {
                        "status": "VALID",
                        "observed_at": now_utc,
                        "fetched_at": now_utc,
                        "latitude": lat,
                        "longitude": lng,
                        "weather_state": weather_state,
                        "temperature_c": temp_c,
                        "apparent_temperature_c": apparent_temp_c,
                        "humidity_percent": humidity,
                        "precipitation_mm": precip_mm,
                        "precipitation_probability": h_prob,
                        "visibility_m": visibility_m,
                        "wind_speed_kmh": wind_kmh,
                        "wmo_code": wmo_code,
                        "source": "Open-Meteo Forecast API",
                        "quality": "VALID",
                        "ttl_seconds": self._cache_ttl_seconds,
                    }


                    # Store in server cache
                    self._cache[cache_key] = {
                        "cached_at_ts": time.time(),
                        "data": normalized,
                    }

                    return normalized
                else:
                    logger.warning(f"Live weather API returned status {resp.status_code}")
        except Exception as e:
            logger.warning(f"Live weather request failed for ({lat}, {lng}): {str(e)}")

        # Fallback when API call fails or times out (WEATHER = UNAVAILABLE)
        fallback = {
            "status": "UNAVAILABLE",
            "observed_at": None,
            "fetched_at": now_utc,
            "latitude": lat,
            "longitude": lng,
            "weather_state": WEATHER_STATE_UNKNOWN,
            "temperature_c": None,
            "precipitation_mm": None,
            "visibility_m": None,
            "wind_speed_kmh": None,
            "wmo_code": None,
            "source": "None",
            "quality": "UNAVAILABLE",
            "ttl_seconds": 0,
        }
        return fallback


live_weather_service = LiveWeatherService()

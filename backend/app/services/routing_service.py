import os
import math
from typing import Dict, Any, List
import httpx

from app.logging_config import logger
from app.services.road_taxonomy import map_osm_highway_to_road_type, derive_segment_speed_and_source


class RoutingServiceError(Exception):
    """Base exception for routing service errors."""
    pass


class RoutingTimeoutError(RoutingServiceError):
    """Raised when OSRM API call times out."""
    pass


class RouteNotFoundError(RoutingServiceError):
    """Raised when no navigable route can be found between origin and destination."""
    pass


class InvalidRouteRequestError(RoutingServiceError):
    """Raised when origin/destination coordinates are invalid or identical."""
    pass


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates Haversine distance between two coordinate pairs in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class RoutingService:
    def __init__(self):
        self.base_url = os.getenv("OSRM_BASE_URL", "https://router.project-osrm.org")
        self.profile = os.getenv("OSRM_PROFILE", "driving")
        self.timeout_seconds = float(os.getenv("OSRM_TIMEOUT_SECONDS", "5.0"))

    def validate_coordinates(self, lat: float, lng: float, label: str = "Coordinate"):
        if lat < -90.0 or lat > 90.0:
            raise InvalidRouteRequestError(f"Invalid {label} latitude '{lat}'. Must be between -90.0 and 90.0.")
        if lng < -180.0 or lng > 180.0:
            raise InvalidRouteRequestError(f"Invalid {label} longitude '{lng}'. Must be between -180.0 and 180.0.")

    async def fetch_route(
        self,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
    ) -> Dict[str, Any]:
        """Requests route geometry and step metadata from OSRM endpoint and returns normalized route payload."""
        # 1. Coordinate Bounds Validation
        self.validate_coordinates(origin_lat, origin_lng, "origin")
        self.validate_coordinates(dest_lat, dest_lng, "destination")

        # 2. Identical Origin/Destination Check (< 1 meter)
        dist_direct = haversine_distance_meters(origin_lat, origin_lng, dest_lat, dest_lng)
        if dist_direct < 1.0:
            raise InvalidRouteRequestError("Origin and destination coordinates are virtually identical (< 1m).")

        # 3. Construct OSRM API URL
        # OSRM expects: /route/v1/{profile}/{lon1},{lat1};{lon2},{lat2}
        endpoint_url = (
            f"{self.base_url.rstrip('/')}/route/v1/{self.profile}/"
            f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
        )
        params = {
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
            "annotations": "true",
        }

        logger.info(f"Requesting OSRM route: Origin=({origin_lat},{origin_lng}) Dest=({dest_lat},{dest_lng}) Endpoint={endpoint_url}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.get(endpoint_url, params=params)
                
            if response.status_code != 200:
                logger.error(f"OSRM service returned HTTP {response.status_code}: {response.text[:200]}")
                raise RoutingServiceError(f"OSRM routing provider returned HTTP status {response.status_code}.")

            data = response.json()
        except httpx.TimeoutException as exc:
            logger.error(f"OSRM routing request timed out after {self.timeout_seconds}s: {exc}")
            raise RoutingTimeoutError(f"OSRM routing request timed out after {self.timeout_seconds} seconds.")
        except httpx.HTTPError as exc:
            logger.error(f"HTTP client error querying OSRM endpoint: {exc}")
            raise RoutingServiceError(f"Failed to connect to OSRM routing provider: {exc}")
        except ValueError as exc:
            logger.error(f"Failed to parse JSON response from OSRM: {exc}")
            raise RoutingServiceError("Malformed JSON response returned by routing provider.")

        # 4. Verify OSRM Response Status
        code = data.get("code")
        if code != "Ok":
            message = data.get("message", "No navigable route found between origin and destination.")
            logger.warning(f"OSRM code '{code}': {message}")
            if code in ["NoRoute", "NoSegment"]:
                raise RouteNotFoundError(f"No navigable route found: {message}")
            raise RoutingServiceError(f"OSRM provider error ('{code}'): {message}")

        routes = data.get("routes")
        if not routes or len(routes) == 0:
            raise RouteNotFoundError("OSRM provider returned zero route paths.")

        primary_route = routes[0]
        geometry = primary_route.get("geometry")
        if not geometry or geometry.get("type") != "LineString" or "coordinates" not in geometry:
            raise RoutingServiceError("OSRM provider returned invalid or missing GeoJSON geometry.")

        total_distance = float(primary_route.get("distance", 0.0))
        total_duration = float(primary_route.get("duration", 0.0))

        # 5. Extract & Normalize Route Maneuver Steps
        legs = primary_route.get("legs", [])
        normalized_steps: List[Dict[str, Any]] = []
        step_index = 0

        for leg in legs:
            raw_steps = leg.get("steps", [])
            for step in raw_steps:
                step_name = step.get("name") or "Unnamed Road"
                step_distance = float(step.get("distance", 0.0))
                step_duration = float(step.get("duration", 0.0))
                step_geometry = step.get("geometry")
                
                # Derive OSM highway classification from OSRM step mode or extra metadata
                mode = step.get("mode", "driving")
                osm_highway = step.get("ref") or step.get("mode") or "residential"
                
                # Check annotations if present
                speed_kmh = None
                if step_duration > 0:
                    speed_kmh = (step_distance / step_duration) * 3.6

                road_type = map_osm_highway_to_road_type(osm_highway, step_name)

                normalized_steps.append({
                    "step_id": f"step_{step_index:03d}",
                    "road_name": step_name,
                    "osm_highway": osm_highway,
                    "road_type": road_type,
                    "distance_m": step_distance,
                    "duration_s": step_duration,
                    "speed_kmh": round(speed_kmh, 1) if speed_kmh else None,
                    "geometry": step_geometry,
                })
                step_index += 1

        return {
            "success": True,
            "provider_info": {
                "provider": "OSRM",
                "base_url": self.base_url,
                "profile": self.profile,
                "environment": "Development/Demo" if "project-osrm.org" in self.base_url else "Production Self-Hosted",
            },
            "total_distance_m": total_distance,
            "total_duration_s": total_duration,
            "geometry": geometry,
            "steps": normalized_steps,
        }


routing_service = RoutingService()

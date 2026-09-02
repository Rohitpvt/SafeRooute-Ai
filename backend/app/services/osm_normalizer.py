from typing import Any
import h3
from shapely.geometry import LineString, Point


INCLUDED_HIGHWAY_CLASSES = {
    "motorway",
    "trunk",
    "primary",
    "secondary",
    "tertiary",
    "residential",
    "unclassified",
    "living_street",
    "service",
}

EXCLUDED_HIGHWAY_CLASSES = {
    "footway",
    "steps",
    "cycleway",
    "pedestrian",
    "path",
    "bridleway",
    "track",
    "proposed",
    "construction",
}

DEFAULT_SPEED_LIMITS = {
    "motorway": 80,
    "trunk": 70,
    "primary": 60,
    "secondary": 50,
    "tertiary": 40,
    "residential": 30,
    "unclassified": 40,
    "living_street": 20,
    "service": 20,
}

DEFAULT_LANES = {
    "motorway": 4,
    "trunk": 3,
    "primary": 3,
    "secondary": 2,
    "tertiary": 2,
    "residential": 1,
    "unclassified": 1,
    "living_street": 1,
    "service": 1,
}


def is_included_highway(highway_tag: str | None) -> bool:
    """Evaluates whether an OSM highway tag is included in the drivable taxonomy."""
    if not highway_tag:
        return False
    clean_tag = str(highway_tag).strip().lower()
    return clean_tag in INCLUDED_HIGHWAY_CLASSES


def parse_lanes(lanes_tag: Any, highway: str) -> tuple[int, bool]:
    """Parses OSM lanes tag into integer value.
    
    Returns:
        tuple[int, bool]: (lanes_count, is_imputed)
    """
    if lanes_tag is not None:
        raw_str = str(lanes_tag).strip().split(";")[0].split(":")[0]
        try:
            val = int(raw_str)
            if val > 0:
                return (val, False)
        except ValueError:
            pass

    # Fallback default imputation
    clean_highway = str(highway).lower() if highway else "secondary"
    imputed_lanes = DEFAULT_LANES.get(clean_highway, 1)
    return (imputed_lanes, True)


def parse_speed_limit(speed_tag: Any, highway: str) -> tuple[int, bool]:
    """Parses OSM maxspeed tag into km/h integer value.
    
    Returns:
        tuple[int, bool]: (speed_limit_kmh, is_imputed)
    """
    if speed_tag is not None:
        raw_str = str(speed_tag).strip().lower()
        
        # Handle unit formats e.g. "50 km/h", "30 mph"
        if "mph" in raw_str:
            try:
                num = float(raw_str.replace("mph", "").strip())
                return (int(round(num * 1.60934)), False)
            except ValueError:
                pass
        else:
            clean_str = raw_str.replace("km/h", "").replace("kmh", "").strip()
            try:
                val = int(float(clean_str))
                if 5 <= val <= 140:
                    return (val, False)
            except ValueError:
                pass

    # Fallback default imputation based on road class
    clean_highway = str(highway).lower() if highway else "secondary"
    imputed_speed = DEFAULT_SPEED_LIMITS.get(clean_highway, 50)
    return (imputed_speed, True)


def parse_boolean_tag(tag_value: Any) -> bool:
    """Parses OSM boolean tags (e.g. oneway, lit)."""
    if tag_value is None:
        return False
    val = str(tag_value).strip().lower()
    return val in ["yes", "true", "1", "roundabout"]


def parse_junction_tag(junction_tag: Any) -> bool:
    """Parses OSM junction tags."""
    if junction_tag is None:
        return False
    val = str(junction_tag).strip().lower()
    return val in ["roundabout", "juction", "yes"]


def validate_and_build_linestring(
    coordinates: list[tuple[float, float]], bbox: tuple[float, float, float, float] | None = None
) -> tuple[str, float, float] | None:
    """Validates node coordinate sequence and constructs Shapely LineString WKT + Centroid.
    
    Args:
        coordinates: List of (longitude, latitude) tuples.
        bbox: Optional (min_lat, min_lng, max_lat, max_lng) boundary check.
        
    Returns:
        tuple[wkt_string, centroid_lat, centroid_lng] or None if invalid.
    """
    if not coordinates or len(coordinates) < 2:
        return None

    # Boundary check if bbox provided
    if bbox:
        min_lat, min_lng, max_lat, max_lng = bbox
        for lng, lat in coordinates:
            if not (min_lat - 0.5 <= lat <= max_lat + 0.5 and min_lng - 0.5 <= lng <= max_lng + 0.5):
                return None

    try:
        line = LineString(coordinates)
        if line.is_empty or line.length == 0.0:
            return None

        centroid = line.centroid
        centroid_lat = float(centroid.y)
        centroid_lng = float(centroid.x)
        wkt_str = line.wkt

        return (wkt_str, centroid_lat, centroid_lng)
    except Exception:
        return None


def compute_h3_cell(lat: float, lng: float, resolution: int = 8) -> str:
    """Computes Uber H3 cell index for given centroid coordinates."""
    try:
        return h3.latlng_to_cell(lat, lng, resolution)
    except Exception:
        # Fallback default H3 index if calculation fails
        return "8860b526d1fffff"

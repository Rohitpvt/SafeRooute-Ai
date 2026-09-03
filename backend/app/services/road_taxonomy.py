from typing import Dict, Any, Tuple
from app.logging_config import logger

# Authoritative SafeRoute AI Road Taxonomy Classification
EXPRESSWAY = "Expressway"
HIGHWAY = "Highway"
ARTERIAL = "Arterial"
LOCAL = "Local"

VALID_ROAD_TYPES = {EXPRESSWAY, HIGHWAY, ARTERIAL, LOCAL}

# OSM Highway tag to SafeRoute Taxonomy Mapping
OSM_HIGHWAY_TAXONOMY_MAP: Dict[str, str] = {
    "motorway": EXPRESSWAY,
    "motorway_link": EXPRESSWAY,
    "trunk": HIGHWAY,
    "trunk_link": HIGHWAY,
    "primary": HIGHWAY,
    "primary_link": HIGHWAY,
    "secondary": ARTERIAL,
    "secondary_link": ARTERIAL,
    "tertiary": ARTERIAL,
    "tertiary_link": ARTERIAL,
    "residential": LOCAL,
    "living_street": LOCAL,
    "service": LOCAL,
    "unclassified": LOCAL,
    "track": LOCAL,
    "pedestrian": LOCAL,
    "footway": LOCAL,
    "steps": LOCAL,
    "path": LOCAL,
    "cycleway": LOCAL,
}

# Static Fallback Speed Profiles (km/h)
ROAD_TYPE_SPEED_PROFILES: Dict[str, float] = {
    EXPRESSWAY: 85.0,
    HIGHWAY: 65.0,
    ARTERIAL: 45.0,
    LOCAL: 25.0,
}

# Speed Classification Types
SPEED_SOURCE_OSRM_ANNOTATION = "OSRM_ANNOTATION"
SPEED_SOURCE_MAXSPEED_TAG = "MAXSPEED_TAG"
SPEED_SOURCE_DEFAULT_PROFILE = "DEFAULT_TAXONOMY_PROFILE"


def map_osm_highway_to_road_type(osm_highway: str | None, road_name: str | None = None) -> str:
    """Translates OpenStreetMap highway tag and road name string into SafeRoute AI taxonomy."""
    if road_name:
        name_lower = str(road_name).lower()
        if any(w in name_lower for w in ["expressway", "motorway", "freeway", "tollway", "yamuna", "noida-greater"]):
            return EXPRESSWAY
        if any(w in name_lower for w in ["highway", "nh-", "nh ", "national highway", "bypass", "flyover", "gt road", "grand trunk", "corridor", "state highway", "sh-"]):
            return HIGHWAY
        if any(w in name_lower for w in ["ring road", "outer ring", "inner ring", "marg", "road", "rd", "avenue", "blvd", "boulevard", "circle", "chowk", "square", "path", "way", "lane", "street", "drive"]):
            return ARTERIAL

    if not osm_highway:
        return LOCAL

    clean_tag = str(osm_highway).strip().lower()
    mapped_type = OSM_HIGHWAY_TAXONOMY_MAP.get(clean_tag)

    if mapped_type:
        return mapped_type

    return LOCAL


def derive_segment_speed_and_source(
    road_type: str,
    osrm_speed_kmh: float | None = None,
    maxspeed_tag: float | None = None,
) -> Tuple[float, str]:
    """Derives representative segment speed and returns a (speed_kmh, speed_source) tuple."""
    if osrm_speed_kmh is not None and osrm_speed_kmh > 0:
        return round(osrm_speed_kmh, 1), SPEED_SOURCE_OSRM_ANNOTATION

    if maxspeed_tag is not None and maxspeed_tag > 0:
        return round(maxspeed_tag, 1), SPEED_SOURCE_MAXSPEED_TAG

    default_speed = ROAD_TYPE_SPEED_PROFILES.get(road_type, 45.0)
    return default_speed, SPEED_SOURCE_DEFAULT_PROFILE

from pydantic import BaseModel, Field, field_validator


class LocationCoordinates(BaseModel):
    latitude: float = Field(..., description="Latitude coordinate.")
    longitude: float = Field(..., description="Longitude coordinate.")
    location_name: str | None = Field(None, description="Optional location name.")

    @field_validator("latitude")
    @classmethod
    def validate_lat(cls, v: float) -> float:
        if v < -90.0 or v > 90.0:
            raise ValueError("Latitude coordinate must be between -90.0 and 90.0.")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_lng(cls, v: float) -> float:
        if v < -180.0 or v > 180.0:
            raise ValueError("Longitude coordinate must be between -180.0 and 180.0.")
        return v


class RoutePreviewRequest(BaseModel):
    origin: LocationCoordinates = Field(..., description="Origin location coordinates.")
    destination: LocationCoordinates = Field(..., description="Destination location coordinates.")
    weather: str = Field("Clear", description="Weather override.")
    traffic_density: str = Field("Low", description="Traffic density override.")
    time_of_day: str = Field("Afternoon", description="Time of day override.")


class EnrichedSegmentData(BaseModel):
    segment_id: str
    sequence_index: int
    road_name: str
    road_type: str
    distance_m: float
    duration_s: float
    centroid_latitude: float
    centroid_longitude: float
    speed_kmh: float
    speed_source: str
    geometry: dict


class RoutePreviewResponseData(BaseModel):
    route_id: str
    total_distance_m: float
    total_duration_s: float
    segment_count: int
    provider_info: dict
    route_geometry: dict
    segments: list[EnrichedSegmentData]


class GeocodeRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=150, description="Location search query string.")


class AIInterpretation(BaseModel):
    place: str | None = Field(None, description="Extracted place or neighborhood name.")
    landmark: str | None = Field(None, description="Extracted landmark or point of interest.")
    city: str | None = Field("Delhi", description="Extracted city or region.")


class GeocodeCandidate(BaseModel):
    location_name: str = Field(..., description="Canonical location title.")
    latitude: float = Field(..., description="Latitude coordinate.")
    longitude: float = Field(..., description="Longitude coordinate.")
    source: str = Field(..., description="Authoritative geocoder source: LOCAL_PRESET | NOMINATIM | OPEN_METEO.")
    match_status: str = Field(..., description="Match verification status: verified | candidate.")


class GeocodeResponseData(BaseModel):
    query: str = Field(..., description="Original user input query.")
    location_name: str = Field(..., description="Primary verified location name.")
    latitude: float = Field(..., description="Verified latitude coordinate.")
    longitude: float = Field(..., description="Verified longitude coordinate.")
    source: str = Field(..., description="Authoritative source: LOCAL_PRESET | NOMINATIM | OPEN_METEO.")
    match_status: str = Field(..., description="Overall match status: verified | candidate_list | no_match.")
    ai_interpretation: AIInterpretation | None = Field(None, description="Structured query intent extracted by Gemini.")
    candidates: list[GeocodeCandidate] = Field(default_factory=list, description="Alternative candidate matches if ambiguous.")

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

MAX_BATCH_SIZE = 100


class PredictionRequest(BaseModel):
    weather: str = Field(..., description="Current weather conditions.")
    traffic_density: str = Field(..., description="Levels of road traffic congestion.")
    road_type: str = Field(..., description="Road segment classification.")
    average_speed: float = Field(..., description="Average speed of vehicles in km/h.")
    time_of_day: str = Field(..., description="Time block of the day.")
    
    # Location features
    latitude: float = Field(..., description="Latitude coordinate of the segment.")
    longitude: float = Field(..., description="Longitude coordinate of the segment.")
    location_name: str | None = Field(None, description="Optional descriptive name of the street/intersection.")
    city: str | None = Field(None, description="Optional city name.")
    state: str | None = Field(None, description="Optional state/province name.")

    @field_validator("weather")
    @classmethod
    def validate_weather(cls, v: str) -> str:
        allowed = ["Clear", "Rainy", "Snowy", "Foggy", "Windy"]
        if v not in allowed:
            raise ValueError(f"Invalid weather value. Must be one of: {', '.join(allowed)}")
        return v

    @field_validator("traffic_density")
    @classmethod
    def validate_traffic(cls, v: str) -> str:
        allowed = ["Low", "Medium", "High", "Jammed"]
        if v not in allowed:
            raise ValueError(f"Invalid traffic density. Must be one of: {', '.join(allowed)}")
        return v

    @field_validator("road_type")
    @classmethod
    def validate_road(cls, v: str) -> str:
        allowed = ["Highway", "Arterial", "Local", "Expressway"]
        if v not in allowed:
            raise ValueError(f"Invalid road type. Must be one of: {', '.join(allowed)}")
        return v

    @field_validator("time_of_day")
    @classmethod
    def validate_time(cls, v: str) -> str:
        allowed = ["Morning", "Afternoon", "Evening", "Night"]
        if v not in allowed:
            raise ValueError(f"Invalid time of day. Must be one of: {', '.join(allowed)}")
        return v

    @field_validator("average_speed")
    @classmethod
    def validate_speed(cls, v: float) -> float:
        if v < 0.0 or v > 200.0:
            raise ValueError("Average speed must be between 0.0 and 200.0 km/h.")
        return v

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


class PredictionResponse(BaseModel):
    prediction_id: UUID
    risk_score: int
    confidence_score: float
    risk_category: str
    model_version: str
    prediction_timestamp: datetime
    
    # Location attributes
    latitude: float
    longitude: float
    location_name: str | None
    city: str | None
    state: str | None

    class Config:
        from_attributes = True
        protected_namespaces = ()


# Batch Prediction Schemas (Phase B)

class BatchSegmentRequest(PredictionRequest):
    segment_id: str = Field(..., description="Unique route segment identifier.")


class BatchPredictionRequest(BaseModel):
    segments: list[BatchSegmentRequest] = Field(..., description="Array of route segment prediction requests.")

    @field_validator("segments")
    @classmethod
    def validate_batch_size(cls, v: list[BatchSegmentRequest]) -> list[BatchSegmentRequest]:
        if not v:
            raise ValueError("Batch request cannot be empty. Must include at least 1 segment.")
        if len(v) > MAX_BATCH_SIZE:
            raise ValueError(f"Batch size exceeds maximum limit of {MAX_BATCH_SIZE} segments.")
        return v


class BatchSegmentResponse(BaseModel):
    segment_id: str
    risk_score: int
    confidence_score: float
    risk_category: str
    latitude: float
    longitude: float
    location_name: str | None = None
    city: str | None = None
    state: str | None = None


class BatchPredictionResponse(BaseModel):
    success: bool
    request_id: str | None = None
    model_version: str
    prediction_timestamp: datetime
    total_segments: int
    distance_weighted_risk_score: int
    overall_risk_category: str
    high_risk_segment_count: int
    critical_segment_count: int
    predictions: list[BatchSegmentResponse]

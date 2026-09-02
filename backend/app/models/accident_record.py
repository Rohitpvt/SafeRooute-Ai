from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import BigInteger, Boolean, DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from app.models.spatial_types import SafeGeometry


class AccidentRecord(Base):
    __tablename__ = "accident_records"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    source_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    source_record_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    dataset_mode: Mapped[str] = mapped_column(
        String(30), nullable=False, default="RESEARCH_REAL", index=True
    )  # RESEARCH_REAL, LIMITED_REAL, PIPELINE_SYNTHETIC
    record_type: Mapped[str] = mapped_column(
        String(30), nullable=False, default="ACCIDENT_RECORD", index=True
    )  # ACCIDENT_RECORD vs BLACKSPOT_RECORD
    
    original_timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="Minor")  # Minor, Serious, Fatal, Unknown
    
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    
    matched_osm_way_id: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, index=True
    )
    match_distance_meters: Mapped[float | None] = mapped_column(Float, nullable=True)
    match_confidence: Mapped[str | None] = mapped_column(String(30), nullable=True, index=True) # EXACT, ACCEPTABLE, LOW_CONFIDENCE, REJECTED
    h3_index: Mapped[str] = mapped_column(String(15), nullable=False, index=True)
    
    is_quarantined: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    quarantine_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # PostGIS Point geometry with fallback WKT string for SQLite compatibility
    geometry_wkt: Mapped[str | None] = mapped_column(Text, nullable=True)
    geom: Mapped[bytes | str | None] = mapped_column(
        SafeGeometry("POINT", srid=4326, spatial_index=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

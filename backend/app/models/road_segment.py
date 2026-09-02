from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from app.models.spatial_types import SafeGeometry


class RoadSegment(Base):
    __tablename__ = "road_segments"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    osm_way_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False, index=True)
    road_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    road_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    lanes: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    speed_limit: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    is_junction: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_lit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    h3_index: Mapped[str] = mapped_column(String(15), nullable=False, index=True)
    
    # PostGIS LineString geometry with fallback WKT string for SQLite compatibility
    geometry_wkt: Mapped[str | None] = mapped_column(Text, nullable=True)
    geom: Mapped[bytes | str | None] = mapped_column(
        SafeGeometry("LINESTRING", srid=4326, spatial_index=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

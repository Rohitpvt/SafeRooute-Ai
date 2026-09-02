from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Inputs
    weather: Mapped[str] = mapped_column(String(50), nullable=False)
    traffic_density: Mapped[str] = mapped_column(String(50), nullable=False)
    road_type: Mapped[str] = mapped_column(String(50), nullable=False)
    average_speed: Mapped[float] = mapped_column(Float, nullable=False)
    time_of_day: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Location Metadata
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    # Outputs
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_category: Mapped[str] = mapped_column(String(20), nullable=False)
    accident_probability: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Lifecycle
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User")

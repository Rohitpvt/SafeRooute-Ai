from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    run_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    region_name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    pipeline_type: Mapped[str] = mapped_column(String(50), nullable=False)  # osm_road, accident, weather
    source_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    total_processed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_accepted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_rejected: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_persisted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="COMPLETED", nullable=False)  # COMPLETED, FAILED, DRY_RUN
    summary_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

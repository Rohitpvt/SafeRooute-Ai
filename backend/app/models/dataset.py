from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import DateTime, ForeignKey, Integer, String, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DatasetMetadata(Base):
    __tablename__ = "dataset_metadata"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Extended metrics
    checksum: Mapped[str | None] = mapped_column(String(64), nullable=True)
    missing_percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    dataset_version: Mapped[str] = mapped_column(String(50), default="1.0", nullable=False)

    # Relationships
    uploader: Mapped["User"] = relationship("User")


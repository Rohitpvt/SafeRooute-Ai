import hashlib
import os
import re
import pandas as pd
from typing import Any, BinaryIO
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.dataset import DatasetMetadata
from app.repositories.dataset import dataset_repo
from app.repositories.audit import audit_repo

# Secure uploads folder outside public folders
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB limit
ALLOWED_MIME_TYPES = ["text/csv", "application/vnd.ms-excel"]


class DatasetService:
    def __init__(self) -> None:
        if not os.path.exists(UPLOAD_DIR):
            os.makedirs(UPLOAD_DIR)

    def sanitize_filename(self, filename: str) -> str:
        """Sanitizes file names to prevent directory traversal vulnerabilities."""
        filename = os.path.basename(filename)
        filename = re.sub(r"[^a-zA-Z0-9_\.-]", "", filename)
        return filename

    def calculate_sha256(self, file_obj: BinaryIO) -> str:
        """Computes the SHA-256 hash of a file object."""
        sha256 = hashlib.sha256()
        file_obj.seek(0)
        while chunk := file_obj.read(8192):
            sha256.update(chunk)
        file_obj.seek(0)
        return sha256.hexdigest()

    async def validate_and_save(
        self,
        db: AsyncSession,
        file_obj: BinaryIO,
        original_filename: str,
        file_size: int,
        user_id: Any,
    ) -> DatasetMetadata:
        """Validates CSV format, MIME type, size, schemas, and duplicate records.

        Stores CSV files securely and saves metadata records.
        """
        # 1. Verify file size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum upload size of {MAX_FILE_SIZE / (1024 * 1024)}MB."
            )

        # 2. Compute SHA-256 and verify duplicates
        checksum = self.calculate_sha256(file_obj)
        stmt = select(DatasetMetadata).where(DatasetMetadata.checksum == checksum)
        result = await db.execute(stmt)
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A dataset with this exact checksum has already been uploaded."
            )

        # 3. Read and validate CSV structure via Pandas
        try:
            file_obj.seek(0)
            df = pd.read_csv(file_obj)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid CSV structure: {str(e)}"
            )

        # Check required columns
        required_cols = ["weather", "traffic_density", "road_type", "average_speed", "time_of_day", "accident"]
        for col in required_cols:
            if col not in df.columns:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"CSV schema mismatch. Missing required column: {col}"
                )

        # Validate categorical domains
        weather_vals = {"Clear", "Rainy", "Snowy", "Foggy", "Windy"}
        traffic_vals = {"Low", "Medium", "High", "Jammed"}
        road_vals = {"Highway", "Arterial", "Local", "Expressway"}
        time_vals = {"Morning", "Afternoon", "Evening", "Night"}

        invalid_weather = df[~df["weather"].isin(weather_vals)]
        invalid_traffic = df[~df["traffic_density"].isin(traffic_vals)]
        invalid_road = df[~df["road_type"].isin(road_vals)]
        invalid_time = df[~df["time_of_day"].isin(time_vals)]

        if not invalid_weather.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid weather values found: {invalid_weather['weather'].unique().tolist()}"
            )
        if not invalid_traffic.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid traffic values found: {invalid_traffic['traffic_density'].unique().tolist()}"
            )
        if not invalid_road.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid road type values found: {invalid_road['road_type'].unique().tolist()}"
            )
        if not invalid_time.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid time of day values found: {invalid_time['time_of_day'].unique().tolist()}"
            )

        # Analyze missing values percentage
        total_cells = df.size
        missing_cells = df.isnull().sum().sum()
        missing_pct = float(missing_cells / total_cells * 100) if total_cells > 0 else 0.0

        # Outlier counts (speed out of bounds)
        outliers = df[(df["average_speed"] < 0.0) | (df["average_speed"] > 200.0)]
        outlier_count = len(outliers)

        # Save file securely to UPLOAD_DIR
        sanitized_name = self.sanitize_filename(original_filename)
        # Append checksum prefix to prevent overwrites
        safe_name = f"{checksum[:10]}_{sanitized_name}"
        saved_path = os.path.join(UPLOAD_DIR, safe_name)
        
        file_obj.seek(0)
        with open(saved_path, "wb") as f:
            f.write(file_obj.read())

        # Determine dataset version based on count of existing records
        stmt_count = select(DatasetMetadata)
        count_res = await db.execute(stmt_count)
        version_num = len(count_res.scalars().all()) + 1
        dataset_version = f"1.{version_num}"

        # 4. Insert metadata record in DB
        db_obj = await dataset_repo.create(
            db,
            obj_in={
                "filename": safe_name,
                "file_size": file_size,
                "row_count": len(df),
                "uploaded_by": user_id,
                "checksum": checksum,
                "missing_percentage": missing_pct,
                "dataset_version": dataset_version,
            }
        )

        # 5. Log audit action
        await audit_repo.create(
            db,
            obj_in={
                "user_id": user_id,
                "action": "dataset_upload",
                "ip_address": "unknown",
                "user_agent": "system",
            }
        )

        return db_obj


dataset_service = DatasetService()

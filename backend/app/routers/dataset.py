from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User, UserRole
from app.models.dataset import DatasetMetadata
from app.repositories.dataset import dataset_repo
from app.services.dataset_service import dataset_service
from app.utils.responses import build_api_response

router = APIRouter(prefix="/admin/datasets", tags=["admin_datasets"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrator privileges required."
        )
    return current_user


@router.post("/upload")
async def upload_dataset(
    file: UploadFile,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    request_id = getattr(request.state, "request_id", None)
    
    # Verify file extension/mime type
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only CSV datasets are allowed."
        )

    # Read data streams
    content = await file.read()
    file_size = len(content)
    
    from io import BytesIO
    file_obj = BytesIO(content)

    try:
        db_obj = await dataset_service.validate_and_save(
            db,
            file_obj=file_obj,
            original_filename=file.filename,
            file_size=file_size,
            user_id=admin_user.id,
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving dataset: {str(e)}"
        )

    return build_api_response(
        success=True,
        message="Dataset uploaded and validated successfully.",
        data={
            "dataset_id": str(db_obj.id),
            "filename": db_obj.filename,
            "row_count": db_obj.row_count,
            "file_size": db_obj.file_size,
            "dataset_version": db_obj.dataset_version,
            "checksum": db_obj.checksum,
        },
        status_code=status.HTTP_201_CREATED,
        request_id=request_id,
    )


@router.get("")
async def get_datasets(
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    request_id = getattr(request.state, "request_id", None)
    
    stmt = select(DatasetMetadata).order_by(DatasetMetadata.created_at.desc())
    result = await db.execute(stmt)
    records = result.scalars().all()

    data = [
        {
            "dataset_id": str(r.id),
            "filename": r.filename,
            "file_size": r.file_size,
            "row_count": r.row_count,
            "dataset_version": r.dataset_version,
            "checksum": r.checksum,
            "missing_percentage": r.missing_percentage,
            "uploaded_at": r.created_at.isoformat() + "Z",
        }
        for r in records
    ]

    return build_api_response(
        success=True,
        message="Dataset configurations lists retrieved.",
        data={"records": data},
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.get("/{dataset_id}")
async def get_dataset_detail(
    dataset_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    request_id = getattr(request.state, "request_id", None)
    
    record = await dataset_repo.get(db, dataset_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset record not found."
        )

    data = {
        "dataset_id": str(record.id),
        "filename": record.filename,
        "file_size": record.file_size,
        "row_count": record.row_count,
        "dataset_version": record.dataset_version,
        "checksum": record.checksum,
        "missing_percentage": record.missing_percentage,
        "uploaded_at": record.created_at.isoformat() + "Z",
    }

    return build_api_response(
        success=True,
        message="Dataset detail metrics retrieved.",
        data=data,
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.delete("/{dataset_id}")
async def delete_dataset(
    dataset_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    request_id = getattr(request.state, "request_id", None)
    
    record = await dataset_repo.get(db, dataset_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset record not found."
        )

    # Delete local file securely
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
    saved_path = os.path.join(uploads_dir, record.filename)
    if os.path.exists(saved_path):
        try:
            os.remove(saved_path)
        except Exception:
            pass

    await dataset_repo.remove(db, id=dataset_id)

    return build_api_response(
        success=True,
        message="Dataset profile removed successfully.",
        data={},
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )

import time
import os
import psutil
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc, update, Integer

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User, UserRole
from app.models.prediction import PredictionLog
from app.repositories.user import user_repo
from app.repositories.audit import audit_repo
from app.utils.responses import build_api_response
from ml.model_manager import model_manager

router = APIRouter(prefix="/admin", tags=["admin"])

# Track initial startup time
SYSTEM_START_TIME = time.time()


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrator privileges required."
        )
    return current_user


@router.get("/dashboard")
async def get_admin_dashboard(
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    request_id = getattr(request.state, "request_id", None)

    # 1. User stats
    stmt_users = select(
        func.count(User.id).label("total"),
        func.sum(func.cast(User.is_active, Integer)).label("active")
    ).where(User.is_deleted == False)
    res_users = await db.execute(stmt_users)
    user_stats = res_users.first()
    
    total_users = user_stats.total if user_stats else 0
    active_users = user_stats.active if user_stats and user_stats.active else 0

    # 2. Prediction stats
    stmt_pred = select(PredictionLog).where(PredictionLog.is_deleted == False)
    res_pred = await db.execute(stmt_pred)
    records = res_pred.scalars().all()
    
    total_predictions = len(records)
    avg_risk = float(sum(r.risk_score for r in records) / total_predictions) if total_predictions > 0 else 0.0
    high_count = sum(1 for r in records if r.risk_category == "High")
    crit_count = sum(1 for r in records if r.risk_category == "Critical")
    avg_confidence = float(sum(r.accident_probability for r in records) / total_predictions) if total_predictions > 0 else 0.0

    # 3. Model metadata
    metadata = model_manager.get_metadata()

    stats_data = {
        "total_users": total_users,
        "active_users": active_users,
        "total_predictions": total_predictions,
        "average_risk": round(avg_risk, 2),
        "high_risk_count": high_count,
        "critical_risk_count": crit_count,
        "average_prediction_confidence": round(avg_confidence, 4),
        "model_version": metadata.get("model_version", "1.0.0"),
        "dataset_version": metadata.get("dataset_version", "1.0"),
    }

    return build_api_response(
        success=True,
        message="Admin dashboard analytics summary retrieved.",
        data=stats_data,
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.get("/users")
async def get_admin_users(
    request: Request,
    skip: int = 0,
    limit: int = 20,
    search: str | None = None,
    sort: str = "desc",
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    request_id = getattr(request.state, "request_id", None)

    stmt = select(User).where(User.is_deleted == False)

    # Search filter
    if search:
        stmt = stmt.where(
            (User.email.ilike(f"%{search}%")) |
            (User.full_name.ilike(f"%{search}%"))
        )

    # Sort order
    if sort.lower() == "asc":
        stmt = stmt.order_by(asc(User.created_at))
    else:
        stmt = stmt.order_by(desc(User.created_at))

    # Pagination
    stmt = stmt.offset(skip).limit(limit)
    res = await db.execute(stmt)
    records = res.scalars().all()

    data = [
        {
            "id": str(r.id),
            "email": r.email,
            "full_name": r.full_name,
            "role": r.role,
            "is_active": r.is_active,
            "is_verified": r.is_verified,
            "created_at": r.created_at.isoformat() + "Z",
        }
        for r in records
    ]

    return build_api_response(
        success=True,
        message="Registered user records retrieved.",
        data={"records": data, "skip": skip, "limit": limit},
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.get("/users/{user_id}")
async def get_admin_user_detail(
    user_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    request_id = getattr(request.state, "request_id", None)
    
    user = await user_repo.get(db, user_id)
    if not user or user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account profile not found."
        )

    data = {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat() + "Z",
    }

    return build_api_response(
        success=True,
        message="User detail profile retrieved.",
        data=data,
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.patch("/users/{user_id}/status")
async def patch_user_status(
    user_id: UUID,
    is_active: bool,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    request_id = getattr(request.state, "request_id", None)
    
    user = await user_repo.get(db, user_id)
    if not user or user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account profile not found."
        )

    # Disallow disabling own admin account
    if user.id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot toggle their own account status."
        )

    user.is_active = is_active
    await db.commit()

    # Log privileged action
    await audit_repo.create(
        db,
        obj_in={
            "user_id": admin_user.id,
            "action": f"account_{'activation' if is_active else 'deactivation'}",
            "ip_address": "unknown",
            "user_agent": "system",
        }
    )

    return build_api_response(
        success=True,
        message=f"User status successfully updated to {'Active' if is_active else 'Inactive'}.",
        data={"is_active": is_active},
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.patch("/users/{user_id}/role")
async def patch_user_role(
    user_id: UUID,
    role: UserRole,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    request_id = getattr(request.state, "request_id", None)
    
    user = await user_repo.get(db, user_id)
    if not user or user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account profile not found."
        )

    # Prevent changing own role
    if user.id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot demote their own roles."
        )

    user.role = role
    await db.commit()

    # Log role change audit event
    await audit_repo.create(
        db,
        obj_in={
            "user_id": admin_user.id,
            "action": f"role_change_to_{role.value}",
            "ip_address": "unknown",
            "user_agent": "system",
        }
    )

    return build_api_response(
        success=True,
        message="User access control permissions role updated.",
        data={"role": role.value},
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    request_id = getattr(request.state, "request_id", None)
    
    user = await user_repo.get(db, user_id)
    if not user or user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account profile not found."
        )

    # Prevent self soft-delete
    if user.id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot delete their own profile context."
        )

    # Soft delete
    user.is_deleted = True
    await db.commit()

    # Log deletion audit event
    await audit_repo.create(
        db,
        obj_in={
            "user_id": admin_user.id,
            "action": "user_account_deletion",
            "ip_address": "unknown",
            "user_agent": "system",
        }
    )

    return build_api_response(
        success=True,
        message="User account soft deleted successfully.",
        data={},
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.get("/system/stats")
async def get_system_stats(
    request: Request,
    admin_user: User = Depends(require_admin),
):
    request_id = getattr(request.state, "request_id", None)
    
    # Calculate API server uptime
    uptime = time.time() - SYSTEM_START_TIME

    # Gather system metrics (CPU / Memory)
    cpu_percent = psutil.cpu_percent()
    memory_info = psutil.virtual_memory()

    data = {
        "uptime_seconds": round(uptime, 2),
        "cpu_percentage": cpu_percent,
        "memory_percentage": memory_info.percent,
        "memory_used_gb": round(memory_info.used / (1024 * 1024 * 1024), 2),
        "memory_total_gb": round(memory_info.total / (1024 * 1024 * 1024), 2),
    }

    return build_api_response(
        success=True,
        message="System telemetry metrics retrieved.",
        data=data,
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.post("/model/retrain")
async def trigger_model_retrain(
    request: Request,
    dataset_filename: str | None = None,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    request_id = getattr(request.state, "request_id", None)
    
    try:
        from ml.retrain import retrain_model
        candidate_meta = retrain_model(dataset_filename)
    except Exception as e:
        # Audit failed action
        await audit_repo.create(
            db,
            obj_in={
                "user_id": admin_user.id,
                "action": "model_retrain_failed",
                "ip_address": "unknown",
                "user_agent": "system",
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Retraining failed: {str(e)}"
        )

    # Log successful retraining action
    await audit_repo.create(
        db,
        obj_in={
            "user_id": admin_user.id,
            "action": "model_retraining",
            "ip_address": "unknown",
            "user_agent": "system",
        }
    )

    return build_api_response(
        success=True,
        message="Candidate model retraining completed successfully.",
        data=candidate_meta,
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.post("/model/promote")
async def trigger_model_promotion(
    candidate_version: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    request_id = getattr(request.state, "request_id", None)

    try:
        from ml.retrain import evaluate_and_promote
        promotion_result = evaluate_and_promote(candidate_version)
    except Exception as e:
        # Audit failed promotion
        await audit_repo.create(
            db,
            obj_in={
                "user_id": admin_user.id,
                "action": "model_promotion_failed",
                "ip_address": "unknown",
                "user_agent": "system",
            }
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Promotion failed: {str(e)}"
        )

    # Log successful promotion
    await audit_repo.create(
        db,
        obj_in={
            "user_id": admin_user.id,
            "action": "model_promotion",
            "ip_address": "unknown",
            "user_agent": "system",
        }
    )

    return build_api_response(
        success=True,
        message="Candidate model promoted to production successfully.",
        data=promotion_result,
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


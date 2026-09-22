from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, asc

from app.database import get_db
from app.dependencies.auth import get_current_user, get_optional_user
from app.models.user import User
from app.models.prediction import PredictionLog
from app.schemas.prediction import (
    PredictionRequest,
    PredictionResponse,
    BatchPredictionRequest,
    BatchPredictionResponse,
)
from app.services.prediction_service import prediction_service
from app.utils.responses import build_api_response

router = APIRouter(tags=["prediction"])


@router.post("/predict", response_model=PredictionResponse)
async def create_prediction(
    payload: PredictionRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    request_id = getattr(request.state, "request_id", None)
    user_id = current_user.id if current_user else None
    result = await prediction_service.predict_risk(
        db, payload, user_id=user_id, request_id=request_id
    )
    return build_api_response(
        success=True,
        message="Risk assessment prediction completed.",
        data=result.model_dump(),
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def create_batch_prediction(
    payload: BatchPredictionRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Executes vectorized batch risk prediction across multiple route segments in a single inference pass."""
    request_id = getattr(request.state, "request_id", None)
    user_id = current_user.id if current_user else None
    result = await prediction_service.predict_batch_risk(
        db, payload, user_id=user_id, request_id=request_id
    )
    return build_api_response(
        success=True,
        message=f"Batch risk assessment completed for {result.total_segments} segments.",
        data=result.model_dump(),
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.get("/predictions/history")
async def get_history(
    request: Request,
    skip: int = 0,
    limit: int = 10,
    sort: str = "desc",
    weather: str | None = None,
    risk_category: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request_id = getattr(request.state, "request_id", None)
    
    # Filter logs by current user context ownership
    stmt = select(PredictionLog).where(
        PredictionLog.user_id == current_user.id,
        PredictionLog.is_deleted == False
    )

    # Optional filters
    if weather:
        stmt = stmt.where(PredictionLog.weather == weather)
    if risk_category:
        stmt = stmt.where(PredictionLog.risk_category == risk_category)

    # Sort
    if sort.lower() == "asc":
        stmt = stmt.order_by(asc(PredictionLog.created_at))
    else:
        stmt = stmt.order_by(desc(PredictionLog.created_at))

    # Pagination
    stmt = stmt.offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    records = result.scalars().all()
    
    data = [
        {
            "prediction_id": str(r.id),
            "weather": r.weather,
            "traffic_density": r.traffic_density,
            "road_type": r.road_type,
            "average_speed": r.average_speed,
            "time_of_day": r.time_of_day,
            "risk_score": r.risk_score,
            "risk_category": r.risk_category,
            "confidence_score": r.accident_probability,
            "prediction_timestamp": r.created_at.isoformat() + "Z",
            "latitude": r.latitude,
            "longitude": r.longitude,
            "location_name": r.location_name,
            "city": r.city,
            "state": r.state,
        }
        for r in records
    ]

    return build_api_response(
        success=True,
        message="User prediction history logs retrieved.",
        data={"records": data, "skip": skip, "limit": limit},
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.get("/predictions/stats")
async def get_stats(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves aggregated statistics from historical prediction logs for the current user."""
    request_id = getattr(request.state, "request_id", None)
    
    # Query all active prediction logs for this user
    stmt = select(PredictionLog).where(
        PredictionLog.user_id == current_user.id,
        PredictionLog.is_deleted == False
    )
    result = await db.execute(stmt)
    records = result.scalars().all()
    
    total = len(records)
    avg_risk = float(sum(r.risk_score for r in records) / total) if total > 0 else 0.0
    high_count = sum(1 for r in records if r.risk_category == "High")
    crit_count = sum(1 for r in records if r.risk_category == "Critical")
    
    stats_data = {
        "total_predictions": total,
        "average_risk": round(avg_risk, 2),
        "high_risk_count": high_count,
        "critical_risk_count": crit_count,
    }
    
    return build_api_response(
        success=True,
        message="User prediction statistics retrieved.",
        data=stats_data,
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.get("/predictions/{prediction_id}")
async def get_prediction_detail(
    prediction_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request_id = getattr(request.state, "request_id", None)
    
    # Fetch prediction details
    stmt = select(PredictionLog).where(
        PredictionLog.id == prediction_id,
        PredictionLog.is_deleted == False
    )
    result = await db.execute(stmt)
    prediction = result.scalars().first()

    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction record not found."
        )

    # Enforce strict user context ownership protection
    if prediction.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this prediction record."
        )

    data = {
        "prediction_id": str(prediction.id),
        "weather": prediction.weather,
        "traffic_density": prediction.traffic_density,
        "road_type": prediction.road_type,
        "average_speed": prediction.average_speed,
        "time_of_day": prediction.time_of_day,
        "risk_score": prediction.risk_score,
        "risk_category": prediction.risk_category,
        "confidence_score": prediction.accident_probability,
        "prediction_timestamp": prediction.created_at.isoformat() + "Z",
        "latitude": prediction.latitude,
        "longitude": prediction.longitude,
        "location_name": prediction.location_name,
        "city": prediction.city,
        "state": prediction.state,
    }

    return build_api_response(
        success=True,
        message="Prediction record retrieved.",
        data=data,
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )

import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user, get_optional_user
from app.models.user import User
from app.schemas.route import (
    RoutePreviewRequest,
    RoutePreviewResponseData,
    GeocodeRequest,
    GeocodeResponseData,
    APIKeyValidationRequest,
)
from app.services.routing_service import (
    routing_service,
    RoutingServiceError,
    RoutingTimeoutError,
    RouteNotFoundError,
    InvalidRouteRequestError,
)
from app.services.segmentation_engine import segmentation_engine
from app.services.feature_enrichment import feature_enrichment_service
from app.services.ai_geocoding_service import AIGeocodingService
from app.services.live_weather_service import live_weather_service
from app.utils.responses import build_api_response

router = APIRouter(tags=["routes"])


@router.get("/routes/weather/current")
async def get_current_weather(
    lat: float,
    lng: float,
    request: Request,
):
    """
    Fetches normalized current environmental weather context for given coordinates.
    Returns normalized weather state, quality state, observed/fetched timestamps, and parameters.
    """
    request_id = getattr(request.state, "request_id", None)
    result = await live_weather_service.fetch_current_weather(lat, lng)

    return build_api_response(
        success=True,
        message=f"Environmental weather context status: {result['quality']}.",
        data=result,
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )



@router.post("/routes/geocode")
async def geocode_location(
    payload: GeocodeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    AI-Assisted Place Geocoding endpoint.
    Uses Gemini AI as query interpretation layer, with coordinates strictly sourced from authoritative geocoders.
    """
    request_id = getattr(request.state, "request_id", None)
    service = AIGeocodingService()
    result = await service.geocode(payload.query)

    return build_api_response(
        success=True,
        message=f"Location search completed with status: {result['match_status']}.",
        data=result,
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.get("/routes/geocode/key-status")
async def check_gemini_key_status(
    request: Request,
):
    """
    Probes the configured Gemini API key against Google Generative Language API and returns diagnostic validation results.
    """
    request_id = getattr(request.state, "request_id", None)
    result = await AIGeocodingService.validate_api_key()

    return build_api_response(
        success=result["valid"],
        message=result["message"],
        data=result,
        status_code=status.HTTP_200_OK if result["valid"] else (status.HTTP_200_OK if not result["configured"] else status.HTTP_400_BAD_REQUEST),
        request_id=request_id,
    )


@router.post("/routes/geocode/validate-key")
async def validate_custom_gemini_key(
    payload: APIKeyValidationRequest,
    request: Request,
):
    """
    Validates a specific Gemini API key directly against Google Generative Language API.
    """
    request_id = getattr(request.state, "request_id", None)
    result = await AIGeocodingService.validate_api_key(test_key=payload.api_key)

    return build_api_response(
        success=result["valid"],
        message=result["message"],
        data=result,
        status_code=status.HTTP_200_OK if result["valid"] else status.HTTP_400_BAD_REQUEST,
        request_id=request_id,
    )



@router.post("/routes/preview")
async def preview_route(
    payload: RoutePreviewRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Fetches OSRM polyline route, partitions into hybrid segments, and enriches features without executing ML predictions."""
    request_id = getattr(request.state, "request_id", None)
    
    orig_lat = payload.origin.latitude
    orig_lng = payload.origin.longitude
    dest_lat = payload.destination.latitude
    dest_lng = payload.destination.longitude

    try:
        # 1. Fetch OSRM Route
        route_data = await routing_service.fetch_route(
            origin_lat=orig_lat,
            origin_lng=orig_lng,
            dest_lat=dest_lat,
            dest_lng=dest_lng,
        )

        total_distance = route_data["total_distance_m"]
        total_duration = route_data["total_duration_s"]
        geometry = route_data["geometry"]
        steps = route_data["steps"]
        provider_info = route_data["provider_info"]

        # 2. Hybrid Route Segmentation
        segmented_blocks = segmentation_engine.segment_route(
            route_geometry=geometry,
            steps=steps,
            total_distance_m=total_distance,
            total_duration_s=total_duration,
        )

        # 3. Feature Enrichment (Metadata & ML Feature Vector Preparation)
        enriched_segments = feature_enrichment_service.enrich_route_segments(
            segmented_blocks,
            weather_override=payload.weather,
            traffic_override=payload.traffic_density,
            time_of_day_override=payload.time_of_day,
        )

        route_id = f"route_{uuid.uuid4().hex[:12]}"

        response_data = {
            "route_id": route_id,
            "total_distance_m": round(total_distance, 1),
            "total_duration_s": round(total_duration, 1),
            "segment_count": len(enriched_segments),
            "provider_info": provider_info,
            "route_geometry": geometry,
            "segments": enriched_segments,
        }

        return build_api_response(
            success=True,
            message=f"Route preview calculated successfully with {len(enriched_segments)} hybrid segments.",
            data=response_data,
            status_code=status.HTTP_200_OK,
            request_id=request_id,
        )

    except InvalidRouteRequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except RouteNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except RoutingTimeoutError as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=str(exc),
        )
    except RoutingServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )

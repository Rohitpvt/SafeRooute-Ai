import time
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.services.routing_service import (
    routing_service,
    RoutingService,
    RoutingTimeoutError,
    RouteNotFoundError,
    RoutingServiceError,
    InvalidRouteRequestError,
)
from app.services.segmentation_engine import segmentation_engine, RouteSegmentationEngine
from app.services.road_taxonomy import map_osm_highway_to_road_type, derive_segment_speed_and_source, LOCAL, EXPRESSWAY, HIGHWAY, ARTERIAL
from app.services.feature_enrichment import feature_enrichment_service


@pytest.fixture
def auth_headers(client: TestClient):
    """Fixture that registers/logins a test user and returns auth headers."""
    reg_payload = {
        "email": "routing_tester@example.com",
        "full_name": "Routing Tester",
        "password": "SecurePassword123!",
        "password_confirm": "SecurePassword123!",
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    login_resp = client.post("/api/v1/auth/login", json={"email": "routing_tester@example.com", "password": "SecurePassword123!"})
    access_token = login_resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {access_token}"}


# =====================================================================
# 1. ROUTING SERVICE TESTS
# =====================================================================

def test_routing_service_coordinate_validation():
    """Verifies that RoutingService rejects invalid latitude/longitude bounds and identical origin/destination."""
    service = RoutingService()

    # Invalid origin latitude
    with pytest.raises(InvalidRouteRequestError, match="Invalid origin latitude"):
        service.validate_coordinates(105.0, 77.2090, "origin")

    # Invalid destination longitude
    with pytest.raises(InvalidRouteRequestError, match="Invalid destination longitude"):
        service.validate_coordinates(28.6139, 200.0, "destination")


@pytest.mark.asyncio
async def test_routing_service_identical_coordinates():
    """Verifies that RoutingService rejects identical origin and destination (<1m apart)."""
    service = RoutingService()
    with pytest.raises(InvalidRouteRequestError, match="virtually identical"):
        await service.fetch_route(28.6139, 77.2090, 28.6139, 77.2090)


@pytest.mark.asyncio
async def test_routing_service_osrm_timeout():
    """Verifies RoutingTimeoutError when OSRM API call times out."""
    service = RoutingService()
    with patch("httpx.AsyncClient.get", side_effect=pytest.importorskip("httpx").TimeoutException("Connection timeout")):
        with pytest.raises(RoutingTimeoutError, match="timed out"):
            await service.fetch_route(28.6315, 77.2167, 28.6129, 77.2295)


@pytest.mark.asyncio
async def test_routing_service_osrm_service_unavailable():
    """Verifies RoutingServiceError when OSRM returns HTTP 500 error."""
    service = RoutingService()
    mock_resp = MagicMock()
    mock_resp.status_code = 500
    mock_resp.text = "Internal Server Error"
    
    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        with pytest.raises(RoutingServiceError, match="HTTP status 500"):
            await service.fetch_route(28.6315, 77.2167, 28.6129, 77.2295)


@pytest.mark.asyncio
async def test_routing_service_no_route_found():
    """Verifies RouteNotFoundError when OSRM returns code 'NoRoute'."""
    service = RoutingService()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"code": "NoRoute", "message": "Impossible route path"}

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        with pytest.raises(RouteNotFoundError, match="No navigable route found"):
            await service.fetch_route(28.6315, 77.2167, 28.6129, 77.2295)


@pytest.mark.asyncio
async def test_routing_service_valid_mock_response():
    """Verifies successful normalization of OSRM route payload."""
    service = RoutingService()
    mock_osrm_payload = {
        "code": "Ok",
        "routes": [
            {
                "distance": 3200.5,
                "duration": 420.0,
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[77.2167, 28.6315], [77.2200, 28.6250], [77.2295, 28.6129]],
                },
                "legs": [
                    {
                        "steps": [
                            {
                                "name": "Connaught Place Radial",
                                "distance": 1200.0,
                                "duration": 150.0,
                                "ref": "primary",
                                "mode": "driving",
                                "geometry": {"type": "LineString", "coordinates": [[77.2167, 28.6315], [77.2200, 28.6250]]},
                            },
                            {
                                "name": "Janpath",
                                "distance": 2000.5,
                                "duration": 270.0,
                                "ref": "secondary",
                                "mode": "driving",
                                "geometry": {"type": "LineString", "coordinates": [[77.2200, 28.6250], [77.2295, 28.6129]]},
                            },
                        ]
                    }
                ],
            }
        ],
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = mock_osrm_payload

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        res = await service.fetch_route(28.6315, 77.2167, 28.6129, 77.2295)
        assert res["success"] is True
        assert res["total_distance_m"] == 3200.5
        assert res["total_duration_s"] == 420.0
        assert len(res["steps"]) == 2
        assert res["steps"][0]["road_name"] == "Connaught Place Radial"
        assert res["steps"][0]["road_type"] == HIGHWAY


# =====================================================================
# 2. ROAD TAXONOMY MAPPING TESTS
# =====================================================================

def test_road_taxonomy_mappings():
    """Verifies OSM highway tag translation into SafeRoute taxonomy and fallback logging."""
    assert map_osm_highway_to_road_type("motorway") == EXPRESSWAY
    assert map_osm_highway_to_road_type("trunk") == HIGHWAY
    assert map_osm_highway_to_road_type("primary") == HIGHWAY
    assert map_osm_highway_to_road_type("secondary") == ARTERIAL
    assert map_osm_highway_to_road_type("residential") == LOCAL

    # Unknown classification tag fallback
    assert map_osm_highway_to_road_type("alien_super_road") == LOCAL
    assert map_osm_highway_to_road_type(None) == LOCAL


def test_speed_derivation_sources():
    """Verifies speed source classification (OSRM vs maxspeed tag vs default profile)."""
    spd1, src1 = derive_segment_speed_and_source(EXPRESSWAY, osrm_speed_kmh=85.0)
    assert spd1 == 85.0
    assert src1 == "OSRM_ANNOTATION"

    spd2, src2 = derive_segment_speed_and_source(HIGHWAY, maxspeed_tag=60.0)
    assert spd2 == 60.0
    assert src2 == "MAXSPEED_TAG"

    spd3, src3 = derive_segment_speed_and_source(LOCAL)
    assert spd3 == 25.0
    assert src3 == "DEFAULT_TAXONOMY_PROFILE"


# =====================================================================
# 3. ROUTE SEGMENTATION ENGINE TESTS
# =====================================================================

def test_segmentation_very_short_route():
    """Verifies that routes < 200m produce 1 single segment covering the entire geometry."""
    engine = RouteSegmentationEngine()
    coords = [[77.2167, 28.6315], [77.2170, 28.6317]]  # ~35 meters
    geom = {"type": "LineString", "coordinates": coords}
    steps = [{"step_id": "step_001", "road_name": "Short Alley", "road_type": LOCAL, "speed_kmh": 20.0}]

    segments = engine.segment_route(geom, steps, total_distance_m=35.0, total_duration_s=5.0)
    assert len(segments) == 1
    assert segments[0]["segment_id"] == "seg_000"
    assert segments[0]["distance_m"] == 35.0
    assert segments[0]["road_type"] == LOCAL


def test_segmentation_road_type_transition_and_1000m_limit():
    """Verifies splitting on road_type transition and at 1000m distance limit."""
    engine = RouteSegmentationEngine()
    
    # Generate 3km straight line coordinates (~35 points)
    coords = [[77.2167 + i * 0.001, 28.6315 + i * 0.001] for i in range(35)]
    geom = {"type": "LineString", "coordinates": coords}
    
    steps = [
        {"step_id": "step_000", "road_name": "Expressway A", "road_type": EXPRESSWAY, "speed_kmh": 80.0},
        {"step_id": "step_001", "road_name": "Arterial B", "road_type": ARTERIAL, "speed_kmh": 45.0},
    ]

    segments = engine.segment_route(geom, steps, total_distance_m=4500.0, total_duration_s=300.0)
    
    assert len(segments) >= 2
    for seg in segments:
        assert seg["distance_m"] <= 1200.0  # Allowed merged tail ceiling
        assert "centroid_latitude" in seg
        assert "centroid_longitude" in seg
        assert seg["road_type"] in [EXPRESSWAY, ARTERIAL, LOCAL]


def test_feature_enrichment_service():
    """Verifies feature enrichment service constructs ML-ready vectors without executing predictions."""
    segments = [
        {
            "segment_id": "seg_000",
            "sequence_index": 0,
            "road_name": "Test Highway",
            "road_type": HIGHWAY,
            "distance_m": 650.0,
            "duration_s": 40.0,
            "centroid_latitude": 28.6315,
            "centroid_longitude": 77.2167,
            "geometry": {"type": "LineString", "coordinates": [[77.2167, 28.6315], [77.2200, 28.6350]]},
            "speed_kmh": 65.0,
            "speed_source": "DEFAULT_TAXONOMY_PROFILE",
        }
    ]

    enriched = feature_enrichment_service.enrich_route_segments(segments)
    assert len(enriched) == 1
    item = enriched[0]
    assert item["ml_features"]["road_type"] == HIGHWAY
    assert item["ml_features"]["average_speed"] == 65.0
    assert item["ml_features"]["weather"] == "Clear"
    assert item["ml_features"]["traffic_density"] == "Low"


# =====================================================================
# 4. API INTEGRATION & SECURITY TESTS
# =====================================================================

def test_route_preview_api_unauthorized(client: TestClient):
    """Verifies that unauthenticated calls to /api/v1/routes/preview return 401."""
    payload = {
        "origin": {"latitude": 28.6315, "longitude": 77.2167},
        "destination": {"latitude": 28.6129, "longitude": 77.2295},
    }
    res = client.post("/api/v1/routes/preview", json=payload)
    assert res.status_code == 401


def test_route_preview_api_invalid_coordinates(client: TestClient, auth_headers: dict):
    """Verifies 400 Bad Request for out-of-bounds coordinates."""
    payload = {
        "origin": {"latitude": 150.0, "longitude": 77.2167},
        "destination": {"latitude": 28.6129, "longitude": 77.2295},
    }
    res = client.post("/api/v1/routes/preview", json=payload, headers=auth_headers)
    assert res.status_code in [400, 422]


def test_route_preview_api_success_mocked(client: TestClient, auth_headers: dict):
    """Verifies end-to-end POST /api/v1/routes/preview execution with mocked OSRM response."""
    mock_route = {
        "success": True,
        "provider_info": {"provider": "OSRM", "base_url": "https://router.project-osrm.org", "profile": "driving", "environment": "Development/Demo"},
        "total_distance_m": 2500.0,
        "total_duration_s": 240.0,
        "geometry": {"type": "LineString", "coordinates": [[77.2167, 28.6315], [77.2200, 28.6250], [77.2295, 28.6129]]},
        "steps": [
            {"step_id": "step_000", "road_name": "Radial 1", "osm_highway": "primary", "road_type": HIGHWAY, "distance_m": 1200.0, "duration_s": 100.0, "geometry": {}, "speed_kmh": 45.2},
            {"step_id": "step_001", "road_name": "Radial 2", "osm_highway": "secondary", "road_type": ARTERIAL, "distance_m": 1300.0, "duration_s": 140.0, "geometry": {}, "speed_kmh": 33.4},
        ],
    }

    with patch("app.services.routing_service.routing_service.fetch_route", return_value=mock_route):
        payload = {
            "origin": {"latitude": 28.6315, "longitude": 77.2167, "location_name": "Connaught Place"},
            "destination": {"latitude": 28.6129, "longitude": 77.2295, "location_name": "India Gate"},
        }
        res = client.post("/api/v1/routes/preview", json=payload, headers=auth_headers)
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        data = body["data"]
        assert data["total_distance_m"] == 2500.0
        assert data["segment_count"] >= 1
        assert "route_id" in data
        assert "segments" in data

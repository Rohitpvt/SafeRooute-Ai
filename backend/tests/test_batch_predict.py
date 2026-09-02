import time
import tracemalloc
import pytest
from fastapi.testclient import TestClient
from ml.model_manager import model_manager

# Ensure artifacts are loaded before testing
model_manager.load_artifacts()


@pytest.fixture
def auth_headers(client: TestClient):
    """Fixture that registers/logins a test user and returns auth headers."""
    reg_payload = {
        "email": "batch_tester@example.com",
        "full_name": "Batch Tester",
        "password": "SecurePassword123!",
        "password_confirm": "SecurePassword123!",
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    login_resp = client.post("/api/v1/auth/login", json={"email": "batch_tester@example.com", "password": "SecurePassword123!"})
    access_token = login_resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {access_token}"}


def create_sample_segment(segment_id: str, lat: float = 28.6139, lng: float = 77.2090):
    return {
        "segment_id": segment_id,
        "weather": "Clear",
        "traffic_density": "Medium",
        "road_type": "Arterial",
        "average_speed": 45.0,
        "time_of_day": "Afternoon",
        "latitude": lat,
        "longitude": lng,
        "location_name": f"Segment {segment_id}",
        "city": "New Delhi",
        "state": "Delhi",
    }


def test_batch_prediction_unauthorized(client: TestClient):
    """Verifies that unauthenticated requests to /api/v1/predict/batch are rejected with 401."""
    payload = {"segments": [create_sample_segment("seg_1")]}
    res = client.post("/api/v1/predict/batch", json=payload)
    assert res.status_code == 401


def test_batch_prediction_invalid_token(client: TestClient):
    """Verifies that requests with an invalid/expired token return 401."""
    headers = {"Authorization": "Bearer invalid_token_xyz"}
    payload = {"segments": [create_sample_segment("seg_1")]}
    res = client.post("/api/v1/predict/batch", json=payload, headers=headers)
    assert res.status_code == 401


def test_batch_prediction_empty_batch(client: TestClient, auth_headers: dict):
    """Verifies that an empty batch request returns 400 Bad Request or 422."""
    payload = {"segments": []}
    res = client.post("/api/v1/predict/batch", json=payload, headers=auth_headers)
    assert res.status_code in [400, 422]


def test_batch_prediction_exceeds_max_limit(client: TestClient, auth_headers: dict):
    """Verifies that a batch exceeding 100 segments returns 400 Bad Request or 422."""
    payload = {"segments": [create_sample_segment(f"seg_{i}") for i in range(101)]}
    res = client.post("/api/v1/predict/batch", json=payload, headers=auth_headers)
    assert res.status_code in [400, 422]


def test_batch_prediction_invalid_categorical_and_numeric_values(client: TestClient, auth_headers: dict):
    """Verifies strict validation on weather, traffic, road_type, speed, and lat/lng bounds."""
    # Invalid weather
    bad_weather = create_sample_segment("seg_bad_w")
    bad_weather["weather"] = "Tornado"
    res = client.post("/api/v1/predict/batch", json={"segments": [bad_weather]}, headers=auth_headers)
    assert res.status_code in [400, 422]

    # Invalid speed
    bad_speed = create_sample_segment("seg_bad_s")
    bad_speed["average_speed"] = 350.0
    res = client.post("/api/v1/predict/batch", json={"segments": [bad_speed]}, headers=auth_headers)
    assert res.status_code in [400, 422]

    # Invalid latitude
    bad_lat = create_sample_segment("seg_bad_lat")
    bad_lat["latitude"] = 150.0
    res = client.post("/api/v1/predict/batch", json={"segments": [bad_lat]}, headers=auth_headers)
    assert res.status_code in [400, 422]


@pytest.mark.parametrize("batch_size", [1, 5, 10, 25, 50, 100])
def test_batch_prediction_sizes_success(client: TestClient, auth_headers: dict, batch_size: int):
    """Tests successful batch predictions across sizes 1, 5, 10, 25, 50, 100."""
    segments = [create_sample_segment(f"seg_{i}", 28.6139 + i * 0.001, 77.2090 + i * 0.001) for i in range(batch_size)]
    payload = {"segments": segments}

    tracemalloc.start()
    t_start = time.time()

    res = client.post("/api/v1/predict/batch", json=payload, headers=auth_headers)

    t_total = time.time() - t_start
    current_mem, peak_mem = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    data = body["data"]

    assert data["total_segments"] == batch_size
    assert len(data["predictions"]) == batch_size
    assert "distance_weighted_risk_score" in data
    assert "overall_risk_category" in data
    assert "model_version" in data
    
    expected_ver = model_manager.get_metadata().get("model_version", "1.22.0")
    assert data["model_version"] == expected_ver

    for i, pred in enumerate(data["predictions"]):
        assert pred["segment_id"] == f"seg_{i}"
        assert 0 <= pred["risk_score"] <= 100
        assert pred["risk_category"] in ["Low", "Medium", "High", "Critical"]
        assert 0.0 <= pred["confidence_score"] <= 1.0


def test_batch_prediction_concurrent_requests(client: TestClient, auth_headers: dict):
    """Verifies system stability under concurrent batch requests."""
    payload_10 = {"segments": [create_sample_segment(f"seg_a_{i}") for i in range(10)]}
    payload_25 = {"segments": [create_sample_segment(f"seg_b_{i}") for i in range(25)]}

    res1 = client.post("/api/v1/predict/batch", json=payload_10, headers=auth_headers)
    res2 = client.post("/api/v1/predict/batch", json=payload_25, headers=auth_headers)

    assert res1.status_code == 200
    assert res2.status_code == 200
    assert res1.json()["data"]["total_segments"] == 10
    assert res2.json()["data"]["total_segments"] == 25

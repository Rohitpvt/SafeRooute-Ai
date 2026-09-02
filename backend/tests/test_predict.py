import time
import pytest
from fastapi.testclient import TestClient
from ml.model_manager import model_manager

# Ensure model artifacts are loaded in tests
model_manager.load_artifacts()


@pytest.mark.asyncio
async def test_predictions_pipeline(client: TestClient):
    # 1. Register and Login to get tokens
    register_payload = {
        "email": "predict_test@example.com",
        "full_name": "Predict Tester",
        "password": "SecurePassword123!",
        "password_confirm": "SecurePassword123!",
    }
    client.post("/api/v1/auth/register", json=register_payload)

    login_payload = {
        "email": "predict_test@example.com",
        "password": "SecurePassword123!",
    }
    login_resp = client.post("/api/v1/auth/login", json=login_payload)
    access_token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # 2. Success POST /predict with geographic coordinates
    predict_payload = {
        "weather": "Rainy",
        "traffic_density": "High",
        "road_type": "Highway",
        "average_speed": 110.0,
        "time_of_day": "Night",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "location_name": "Connaught Place Ring Rd",
        "city": "New Delhi",
        "state": "Delhi",
    }
    
    start_time = time.time()
    response = client.post("/api/v1/predict", json=predict_payload, headers=headers)
    duration = time.time() - start_time
    
    assert response.status_code == 200
    assert response.json()["success"] is True
    
    data = response.json()["data"]
    assert "prediction_id" in data
    assert "risk_score" in data
    assert "confidence_score" in data
    assert "risk_category" in data
    assert "model_version" in data
    assert data["latitude"] == 28.6139
    assert data["longitude"] == 77.2090
    
    # Verify Performance SLA: prediction latency < 200ms
    assert duration < 0.200, f"Performance SLA exceeded: {duration:.4f}s"

    # 3. Invalid inputs validation check (Speed > 200 km/h)
    invalid_payload = {
        "weather": "Rainy",
        "traffic_density": "High",
        "road_type": "Highway",
        "average_speed": 250.0,  # invalid speed limit
        "time_of_day": "Night",
        "latitude": 28.6139,
        "longitude": 77.2090,
    }
    response_invalid = client.post("/api/v1/predict", json=invalid_payload, headers=headers)
    assert response_invalid.status_code == 400
    assert response_invalid.json()["success"] is False

    # 3.1 Invalid coordinates validation check (Latitude > 90)
    invalid_coord_payload = {
        "weather": "Rainy",
        "traffic_density": "High",
        "road_type": "Highway",
        "average_speed": 50.0,
        "time_of_day": "Night",
        "latitude": 120.0,  # invalid latitude
        "longitude": 77.2090,
    }
    response_invalid_coord = client.post("/api/v1/predict", json=invalid_coord_payload, headers=headers)
    assert response_invalid_coord.status_code == 400

    # 4. GET /predictions/stats check
    stats_resp = client.get("/api/v1/predictions/stats", headers=headers)
    assert stats_resp.status_code == 200
    stats_data = stats_resp.json()["data"]
    assert stats_data["total_predictions"] == 1
    assert "average_risk" in stats_data
    assert "high_risk_count" in stats_data
    assert "critical_risk_count" in stats_data

    # 5. GET /predictions/history checks
    history_resp = client.get("/api/v1/predictions/history", headers=headers)
    assert history_resp.status_code == 200
    history_data = history_resp.json()["data"]
    assert len(history_data["records"]) == 1
    
    prediction_id = history_data["records"][0]["prediction_id"]

    # 6. GET /predictions/{id} success detail lookup
    detail_resp = client.get(f"/api/v1/predictions/{prediction_id}", headers=headers)
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()["data"]
    assert detail_data["risk_category"] == data["risk_category"]
    assert detail_data["latitude"] == 28.6139

    # 7. GET /predictions/{id} ownership protection check
    # Create another user session
    other_register = {
        "email": "other_tester@example.com",
        "full_name": "Other Tester",
        "password": "SecurePassword123!",
        "password_confirm": "SecurePassword123!",
    }
    client.post("/api/v1/auth/register", json=other_register)
    other_login_resp = client.post("/api/v1/auth/login", json={
        "email": "other_tester@example.com",
        "password": "SecurePassword123!",
    })
    other_token = other_login_resp.json()["data"]["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # Fetching first user's prediction using second user's token should yield 403 Forbidden
    forbidden_resp = client.get(f"/api/v1/predictions/{prediction_id}", headers=other_headers)
    assert forbidden_resp.status_code == 403
    assert forbidden_resp.json()["success"] is False

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.user import user_repo
from app.models.user import UserRole


@pytest.mark.asyncio
async def test_auth_full_cycle(client: TestClient):
    # 1. Success Registration
    register_payload = {
        "email": "register_test@example.com",
        "full_name": "Test User",
        "password": "SecurePassword123!",
        "password_confirm": "SecurePassword123!",
    }
    response = client.post("/api/v1/auth/register", json=register_payload)
    assert response.status_code == 201
    assert response.json()["success"] is True
    assert response.json()["data"]["email"] == "register_test@example.com"
    assert response.json()["data"]["role"] == "USER"

    # 2. Duplicate Registration check
    response_dup = client.post("/api/v1/auth/register", json=register_payload)
    assert response_dup.status_code == 400
    assert response_dup.json()["success"] is False
    assert "already registered" in response_dup.json()["message"]

    # 3. Weak Password validation check
    weak_payload = {
        "email": "weak_pwd@example.com",
        "full_name": "Test User",
        "password": "123",
        "password_confirm": "123",
    }
    response_weak = client.post("/api/v1/auth/register", json=weak_payload)
    assert response_weak.status_code == 400
    assert response_weak.json()["success"] is False

    # 4. Success Login
    login_payload = {
        "email": "register_test@example.com",
        "password": "SecurePassword123!",
    }
    response_login = client.post("/api/v1/auth/login", json=login_payload)
    assert response_login.status_code == 200
    login_data = response_login.json()["data"]
    assert "access_token" in login_data
    assert "refresh_token" in login_data
    access_token = login_data["access_token"]
    refresh_token = login_data["refresh_token"]

    # 5. Get current user profile (GET /auth/me)
    headers = {"Authorization": f"Bearer {access_token}"}
    response_me = client.get("/api/v1/auth/me", headers=headers)
    assert response_me.status_code == 200
    assert response_me.json()["data"]["email"] == "register_test@example.com"

    # 6. Lockout mechanism verification
    lock_email = "lockout_test@example.com"
    reg_lock = {
        "email": lock_email,
        "full_name": "Lock User",
        "password": "SecurePassword123!",
        "password_confirm": "SecurePassword123!",
    }
    client.post("/api/v1/auth/register", json=reg_lock)
    
    # Try 5 incorrect logins to trigger account lockout
    login_fail_payload = {"email": lock_email, "password": "WrongPassword"}
    for _ in range(5):
        response_fail = client.post("/api/v1/auth/login", json=login_fail_payload)
        assert response_fail.status_code == 400
        
    # Sixth login attempt should yield a lockout warning (HTTP 403)
    response_locked = client.post("/api/v1/auth/login", json=login_fail_payload)
    assert response_locked.status_code == 403
    assert "locked" in response_locked.json()["message"]

    # 7. Token refresh rotation check
    refresh_payload = {"refresh_token": refresh_token}
    response_refresh = client.post("/api/v1/auth/refresh", json=refresh_payload)
    assert response_refresh.status_code == 200
    refresh_data = response_refresh.json()["data"]
    new_access_token = refresh_data["access_token"]
    new_refresh_token = refresh_data["refresh_token"]
    assert new_access_token != access_token

    # 8. Blacklisted/Used refresh token validation check
    response_reuse = client.post("/api/v1/auth/refresh", json=refresh_payload)
    assert response_reuse.status_code == 401

    # 9. Logout blacklist verification
    headers_new = {"Authorization": f"Bearer {new_access_token}"}
    response_logout = client.post("/api/v1/auth/logout", headers=headers_new)
    assert response_logout.status_code == 200

    # Verification: Access with blacklisted token should fail
    response_me_invalid = client.get("/api/v1/auth/me", headers=headers_new)
    assert response_me_invalid.status_code == 401

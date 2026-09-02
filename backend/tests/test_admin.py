import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from app.models.user import User, UserRole


def test_admin_rbac_and_management(client: TestClient):
    # 1. Create a Standard User (USER role)
    register_user = {
        "email": "standard_user@example.com",
        "full_name": "Standard User",
        "password": "SecurePassword123!",
        "password_confirm": "SecurePassword123!",
    }
    client.post("/api/v1/auth/register", json=register_user)

    login_user_resp = client.post("/api/v1/auth/login", json={
        "email": "standard_user@example.com",
        "password": "SecurePassword123!",
    })
    user_token = login_user_resp.json()["data"]["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # 2. Create an Admin User
    register_admin = {
        "email": "admin_user@example.com",
        "full_name": "Admin User",
        "password": "SecurePassword123!",
        "password_confirm": "SecurePassword123!",
    }
    client.post("/api/v1/auth/register", json=register_admin)

    # Upgrade the role manually using the client's shared database session
    async def upgrade_role():
        stmt = update(User).where(User.email == "admin_user@example.com").values(role=UserRole.ADMIN)
        await client.db_session.execute(stmt)
        await client.db_session.commit()

    loop = asyncio.get_event_loop()
    loop.run_until_complete(upgrade_role())

    login_admin_resp = client.post("/api/v1/auth/login", json={
        "email": "admin_user@example.com",
        "password": "SecurePassword123!",
    })
    admin_token = login_admin_resp.json()["data"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 3. RBAC Check: Standard User accessing admin dashboard should yield 403 Forbidden
    rbac_fail_resp = client.get("/api/v1/admin/dashboard", headers=user_headers)
    assert rbac_fail_resp.status_code == 403
    assert rbac_fail_resp.json()["success"] is False

    # 4. Admin Access: Admin User accessing admin dashboard succeeds
    admin_success_resp = client.get("/api/v1/admin/dashboard", headers=admin_headers)
    assert admin_success_resp.status_code == 200
    assert admin_success_resp.json()["success"] is True
    assert "total_users" in admin_success_resp.json()["data"]

    # 5. User toggle activation status
    users_resp = client.get("/api/v1/admin/users", headers=admin_headers)
    assert users_resp.status_code == 200
    user_records = users_resp.json()["data"]["records"]
    standard_user_record = [u for u in user_records if u["email"] == "standard_user@example.com"][0]
    standard_user_id = standard_user_record["id"]

    # Activate/Deactivate
    toggle_resp = client.patch(
        f"/api/v1/admin/users/{standard_user_id}/status?is_active=false",
        headers=admin_headers
    )
    assert toggle_resp.status_code == 200
    assert toggle_resp.json()["data"]["is_active"] is False

    # 6. Delete User soft-delete check
    delete_resp = client.delete(f"/api/v1/admin/users/{standard_user_id}", headers=admin_headers)
    assert delete_resp.status_code == 200
    assert delete_resp.json()["success"] is True

    # 7. System stats endpoint validation
    stats_resp = client.get("/api/v1/admin/system/stats", headers=admin_headers)
    assert stats_resp.status_code == 200
    assert "cpu_percentage" in stats_resp.json()["data"]

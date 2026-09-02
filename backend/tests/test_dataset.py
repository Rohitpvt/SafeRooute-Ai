import io
import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from app.models.user import User, UserRole


def test_dataset_management_workflow(client: TestClient):
    # 1. Create and authenticate Admin
    register_admin = {
        "email": "dataset_admin@example.com",
        "full_name": "Dataset Admin",
        "password": "SecurePassword123!",
        "password_confirm": "SecurePassword123!",
    }
    client.post("/api/v1/auth/register", json=register_admin)

    # Upgrade the role manually using the client's shared database session
    async def upgrade_role():
        stmt = update(User).where(User.email == "dataset_admin@example.com").values(role=UserRole.ADMIN)
        await client.db_session.execute(stmt)
        await client.db_session.commit()

    loop = asyncio.get_event_loop()
    loop.run_until_complete(upgrade_role())

    login_admin_resp = client.post("/api/v1/auth/login", json={
        "email": "dataset_admin@example.com",
        "password": "SecurePassword123!",
    })
    admin_token = login_admin_resp.json()["data"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Upload Valid Dataset CSV
    valid_csv_content = (
        "weather,traffic_density,road_type,average_speed,time_of_day,accident\n"
        "Clear,Low,Local,30.0,Morning,0\n"
        "Rainy,High,Highway,80.0,Night,1\n"
    )
    
    csv_file = io.BytesIO(valid_csv_content.encode("utf-8"))
    upload_resp = client.post(
        "/api/v1/admin/datasets/upload",
        files={"file": ("test_accidents.csv", csv_file, "text/csv")},
        headers=admin_headers
    )
    
    assert upload_resp.status_code == 201
    assert upload_resp.json()["success"] is True
    data = upload_resp.json()["data"]
    assert "dataset_id" in data
    assert data["row_count"] == 2
    assert "checksum" in data
    dataset_id = data["dataset_id"]

    # 3. Duplicate check validation (Uploading same checksum fails)
    csv_file_dup = io.BytesIO(valid_csv_content.encode("utf-8"))
    dup_resp = client.post(
        "/api/v1/admin/datasets/upload",
        files={"file": ("test_accidents_dup.csv", csv_file_dup, "text/csv")},
        headers=admin_headers
    )
    assert dup_resp.status_code == 400
    assert "checksum" in dup_resp.json()["message"].lower() or "already" in dup_resp.json()["message"].lower()

    # 4. Schema validation failure check (Missing average_speed column)
    invalid_csv_content = (
        "weather,traffic_density,road_type,time_of_day,accident\n"
        "Clear,Low,Local,Morning,0\n"
    )
    csv_file_inv = io.BytesIO(invalid_csv_content.encode("utf-8"))
    inv_resp = client.post(
        "/api/v1/admin/datasets/upload",
        files={"file": ("invalid_schema.csv", csv_file_inv, "text/csv")},
        headers=admin_headers
    )
    assert inv_resp.status_code == 400
    assert "schema" in inv_resp.json()["message"].lower() or "column" in inv_resp.json()["message"].lower()

    # 5. GET list & GET by id
    list_resp = client.get("/api/v1/admin/datasets", headers=admin_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]["records"]) >= 1

    detail_resp = client.get(f"/api/v1/admin/datasets/{dataset_id}", headers=admin_headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["data"]["dataset_id"] == dataset_id

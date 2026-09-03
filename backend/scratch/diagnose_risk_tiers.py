import asyncio
import httpx

async def test_route_risk():
    # 1. Register & login
    async with httpx.AsyncClient() as client:
        import uuid
        test_email = f"diag_{uuid.uuid4().hex[:6]}@example.com"
        await client.post("http://127.0.0.1:8000/api/v1/auth/register", json={
            "email": test_email,
            "full_name": "Diag User",
            "password": "Password123!",
            "password_confirm": "Password123!"
        })
        login = await client.post("http://127.0.0.1:8000/api/v1/auth/login", json={
            "email": test_email,
            "password": "Password123!"
        })
        login_json = login.json()
        print("Login JSON:", login_json)
        token = login_json.get("data", {}).get("access_token")
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Preview route from Jahangir Puri (28.7180, 77.1650) to Ghaziabad (28.6692, 77.4538)
        route_resp = await client.post("http://127.0.0.1:8000/api/v1/routes/preview", headers=headers, json={
            "origin": {"latitude": 28.7180, "longitude": 77.1650, "location_name": "Jahangir Puri"},
            "destination": {"latitude": 28.6692, "longitude": 77.4538, "location_name": "Ghaziabad"}
        })
        print("Route preview status:", route_resp.status_code)
        print("Route preview response:", route_resp.text[:500])
        route_json = route_resp.json()
        if not route_json.get("success"):
            return
        route_data = route_json["data"]
        steps = route_data.get("steps", [])
        print(f"OSRM Steps count: {len(steps)}")
        for idx, st in enumerate(steps):
            print(f"Step {idx}: name='{st.get('road_name')}', osm_hw='{st.get('osm_highway')}', road_type='{st.get('road_type')}', dist={st.get('distance_m')}, speed={st.get('speed_kmh')}")

        segments = route_data["segments"]
        print(f"\nTotal Segments returned by /routes/preview: {len(segments)}")

        # Print segment details (road_type, speed, distance)
        for i, s in enumerate(segments[:15]):
            print(f"Seg {i}: name='{s['road_name']}', road_type='{s.get('road_type')}', speed={s.get('speed_kmh')}, dist={s.get('distance_m')}")

        # 3. Predict batch risk
        batch_payload = {
            "segments": [{
                "segment_id": s["segment_id"],
                "weather": "Rainy",
                "traffic_density": "High",
                "road_type": s.get("road_type", "Arterial"),
                "average_speed": float(s.get("speed_kmh") or 45.0),
                "time_of_day": "Night",
                "latitude": float(s["centroid_latitude"]),
                "longitude": float(s["centroid_longitude"]),
                "location_name": s["road_name"]
            } for s in segments]
        }

        batch_resp = await client.post("http://127.0.0.1:8000/api/v1/predict/batch", headers=headers, json=batch_payload)
        batch_data = batch_resp.json()["data"]
        preds = batch_data["predictions"]
        print("\nPrediction Results across segments:")
        for i, p in enumerate(preds[:15]):
            print(f"Seg {i}: risk_score={p['risk_score']}, risk_category='{p['risk_category']}', conf={p['confidence_score']}")

if __name__ == "__main__":
    asyncio.run(test_route_risk())

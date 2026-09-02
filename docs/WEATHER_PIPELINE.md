# Historical Open-Meteo Weather Pipeline — SafeRoute AI

## 1. Overview
The **Historical Weather Pipeline** fetches, validates, normalizes, and indexes hourly weather observations from Open-Meteo into the `weather_observations` database table for **Delhi NCR** and configurable future regions.

---

## 2. API Source & Attribution
- **Endpoint**: `https://archive-api.open-meteo.com/v1/archive`
- **Licensing**: Creative Commons Attribution 4.0 International (CC BY 4.0). SafeRoute AI attributes weather data to:
  > `Weather data by Open-Meteo.com`

---

## 3. Collected Weather Variables

| Variable Name | Open-Meteo API Parameter | Unit | Physical Validation Constraints |
| :--- | :--- | :--- | :--- |
| `temperature_c` | `temperature_2m` | Celsius ($^\circ\text{C}$) | $-50.0^\circ\text{C} \le T \le 60.0^\circ\text{C}$ |
| `precipitation_mm` | `precipitation` | Millimeters ($\text{mm}$) | $\ge 0.0\text{ mm}$ |
| `visibility_meters` | `visibility` | Meters ($\text{m}$) | $\ge 0.0\text{ m}$ |
| `weather_code` | `weather_code` | WMO Code (0–99) | Standard WMO interpretation codes |
| `weather_condition` | Mapped WMO Category | String Category | `Clear`, `Cloudy`, `Rain`, `Fog`, `Storm`, `Snow` |

---

## 4. Timezone Strategy
- Open-Meteo requests specify `timezone=UTC`.
- All timestamps stored in `weather_observations.timestamp` are **UTC-normalized**.
- For downstream temporal feature extraction (Phase 5), UTC timestamps convert to **India Standard Time (IST, Asia/Kolkata UTC+5:30)** to calculate local hour-of-day.

---

## 5. Local File Caching & Idempotency
- Requests are cached locally at `backend/data/cache/weather/weather_{lat}_{lng}_{start}_{end}.json`.
- Database persistence uses a unique constraint on `(h3_index, timestamp)` to guarantee **100% idempotency**.

---

## 6. Execution CLI
```bash
# 1. Execute Dry-Run (Gap analysis & local cache check without DB mutation)
python -m app.services.weather_pipeline --region delhi_ncr --start-date 2024-01-01 --end-date 2024-01-07 --dry-run

# 2. Execute Full Ingestion & Database Persistence
python -m app.services.weather_pipeline --region delhi_ncr --start-date 2024-01-01 --end-date 2024-01-07
```

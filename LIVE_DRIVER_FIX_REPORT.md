# Live Driver Mode Fix Report - SafeRoute AI

## 1. Issue Addressed
- **Observed Problem**: Live Driver Mode displayed `"Failed to complete live risk evaluation."`
- **Root Cause**: Relative endpoint path in `useLiveRiskAssessment.js` was set to `/v1/predict`. Since `apiClient`'s `baseURL` is `http://localhost:8000/api/v1`, Axios concatenated the path to `http://localhost:8000/api/v1/v1/predict`, producing **HTTP 404 NOT FOUND**.
- **Fix Implemented**: Corrected endpoint path in `useLiveRiskAssessment.js` to `/predict`. Enhanced error handling to format detailed status codes (`Risk evaluation failed: HTTP status — detail`).

---

## 2. Telemetry & Leaflet Map Integration
- **GPS Lifecycle**: Handled via `navigator.geolocation.watchPosition()` with guaranteed `clearWatch()` cleanup.
- **Speed Telemetry**: Hardware speed conversion + Haversine fallback + EMA smoothing ($\alpha = 0.35$).
- **Leaflet Marker**: Pulsating cyan vehicle location dot + accuracy circle (`L.circle`).
- **Follow Driver Mode**: Auto-centers map when `followDriver === true`. Listens to Leaflet `dragstart` to pause follow mode when user manually drags the map.

---

## 3. Test Results
- **Unit Tests**: 14/14 tests passing in `liveDriver.test.jsx`.
- **API Response**: HTTP 200 OK — Returns `risk_score`, `risk_category`, `confidence_score`, `model_version`, and prediction timestamp.

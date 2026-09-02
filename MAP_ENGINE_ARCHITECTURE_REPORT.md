# Map Engine Architecture Audit Report

## 1. Executive Summary
A comprehensive audit of the frontend repository was conducted to resolve dependency ambiguity between Leaflet and Google Maps JS API. The target architecture confirms **Leaflet** as the single primary map engine for spatial tile rendering, risk marker rendering, multi-segment route polyline overlays, and heatmap visualizations. Unused legacy Google Maps loader services (`MapLoader.js`) have been safely removed.

---

## 2. Dependency Audit & Import Analysis

### Package Dependencies (`frontend/package.json`)
- **Primary Engine**: `leaflet` (v1.9.4) & `leaflet.heat` (v0.2.0)
- **Secondary / Deprecated**: `@googlemaps/js-api-loader` (v2.1.1)

### Component Usage Inspection

| Component | Library Used | Status | Role |
| :--- | :--- | :--- | :--- |
| `MapContainer.jsx` | `leaflet`, `leaflet.heat` | **Active Primary** | Renders OpenStreetMap base tiles, route polyline segments, risk markers, heatmap layers, and live driver tracking. |
| `MapContext.jsx` | Pure React State | **Active Primary** | Holds map center coordinates `[lat, lng]`, zoom levels, prediction markers, and heatmap controls. |
| `FallbackMap.jsx` | Pure CSS / Canvas | **Active Fallback** | Displays offline grid when network connectivity drops (`isOffline = true`). |
| `MapLoader.js` | `@googlemaps/js-api-loader` | **DELETED** | Unused legacy service — confirmed 0 import references across application source. |

---

## 3. Target Map Engine Architecture

```
                                +---------------------------+
                                |      Dashboard Page       |
                                +---------------------------+
                                              |
                                              v
                                +---------------------------+
                                |        MapContext         |
                                | (Center, Zoom, Hotspots)  |
                                +---------------------------+
                                              |
                                              v
                                +---------------------------+
                                |       MapContainer        |
                                +---------------------------+
                                   /                     \
                                  /                       \
                                 v                         v
                   +---------------------------+  +-------------------+
                   |     Leaflet Map Engine    |  |    FallbackMap    |
                   | (OpenStreetMap / CartoDB) |  |   (Offline Grid)  |
                   +---------------------------+  +-------------------+
```

### Tile Providers & Fallback Policy
1. **Default Provider**: OpenStreetMap Dark Tactical (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`), which operates keylessly without cloud API quotas.
2. **Alternative Tile Provider**: CartoDB Dark Matter (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`).
3. **Non-Blocking Error Handling**: In case tile loading encounters network drops, `tileerror` triggers a subtle notification banner (`"Map tiles unavailable — showing vector hotspots"`), preserving interactive vector risk markers and route polylines.

---

## 4. Remediation Cleanup Summary
- **Unused Service File Removed**: `frontend/src/services/MapLoader.js`
- **Build Verification**: Executed `npm run build` cleanly (127 modules transformed in 2.95s with zero syntax or import errors).
- **Google Maps API Status**: Relegated to optional geocoding service integration (Gemini AI interpretation layer in `/api/v1/routes/geocode`); no frontend JS map rendering relies on Google Maps script loading.

# SafeRoute AI - Map Engine Integration Specification

## 1. Overview
SafeRoute AI utilizes **Leaflet.js** as its primary client-side map rendering engine, paired with **CARTO/CartoDB Dark Matter** street map tiles (OpenStreetMap-compatible). This architectural choice eliminates any dependency on third-party proprietary API keys (such as Google Maps API keys), while maintaining high-performance vector marker overlays, heatmaps, and live driver GPS tracking dots.

---

## 2. Centralized Configuration
All map tile parameters are defined centrally in [`frontend/src/config/mapConfig.js`](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/frontend/src/config/mapConfig.js):

```javascript
export const MAP_CONFIG = {
  TILE_URL: import.meta.env.VITE_MAP_TILE_URL || "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  TILE_ATTRIBUTION: import.meta.env.VITE_MAP_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  MAX_ZOOM: parseInt(import.meta.env.VITE_MAP_TILE_MAX_ZOOM || "19", 10),
  DEFAULT_CENTER: [28.6139, 77.2090], // Delhi, India
  DEFAULT_ZOOM: 12,
};
```

---

## 3. Risk Thresholds & Marker Styling
Hazard levels are categorized using centralized thresholds:

| Hazard Band | Risk Score Range | Color Code | Tailwind Class |
| :--- | :--- | :--- | :--- |
| **Low** | 0 – 25% | `#10B981` (Emerald) | `bg-emerald-500` |
| **Medium** | 26 – 50% | `#F59E0B` (Amber) | `bg-amber-500` |
| **High** | 51 – 75% | `#EF4444` (Orange) | `bg-orange-500` |
| **Critical** | 76 – 100% | `#991B1B` (Dark Red) | `bg-red-700` |

---

## 4. Heatmap & Live Driver Layer Architecture
- **Heatmap Layer**: Uses `leaflet.heat` to render risk density heat maps weighted by `risk_score / 100.0`. Fully controllable via `showHeatmap`, `heatmapRadius`, and `heatmapOpacity`.
- **Live Driver GPS Layer**: Renders pulsating cyan vehicle location dot and GPS accuracy circle (`L.circle`). Listens to `dragstart` events to disable map follow mode when the driver manually drags/pans the map.

---

## 5. Offline & Network Fallback Strategy
- **Interactive Leaflet Map**: Default active mode when browser is online and tile network requests succeed.
- **Tile Error Warning**: Displays a non-blocking warning banner (*"Map tiles unavailable — showing vector hotspots"*) if tile servers fail to respond, without breaking marker interactions.
- **Offline Grid Fallback**: `<FallbackMap />` renders ONLY when `navigator.onLine === false` (device disconnected from network). Missing API keys no longer trigger fallback mode.

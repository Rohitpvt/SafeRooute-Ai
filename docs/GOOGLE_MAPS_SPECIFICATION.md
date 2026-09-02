# Google Maps Module Specification

## Project: SafeRoute AI
### AI-Powered Road Accident Hotspot Prediction System

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Frozen |
| **Author** | SafeRoute AI Lead GIS & Maps Architect |
| **Date** | 2026-07-27 |
| **Intended Audience** | Frontend Developers, QA Engineers, GIS Engineers |

---

## Table of Contents
1. [Module Overview & Map Mounting](#1-module-overview--map-mounting)
2. [Map Custom Styling (Dark Palette)](#2-map-custom-styling-dark-palette)
3. [Visualization Layers: Heatmaps & Markers](#3-visualization-layers-heatmaps--markers)
4. [Marker Clustering & Pin Performance](#4-marker-clustering--pin-performance)
5. [Interactive InfoWindows & Legend Overlays](#5-interactive-infowindows--legend-overlays)
6. [User Controls: Geolocation & Search](#6-user-controls-geolocation--search)
7. [API Usage & Quota Optimization](#7-api-usage--quota-optimization)
8. [Assumptions, Risks & Mitigation](#8-assumptions-risks--mitigation)
9. [Best Practices](#9-best-practices)
10. [Revision History](#10-revision-history)
11. [References](#11-references)

---

## 1. Module Overview & Map Mounting
SafeRoute AI uses the Google Maps JavaScript API to visualize accident risk levels. The maps canvas is mounted using the official `@googlemaps/js-api-loader` package to handle asynchronous loading and key integration.

---

## 2. Map Custom Styling (Dark Palette)
To match the dark design system of the application, the map features a custom styling JSON configuration that reduces standard map detail visibility:
```json
[
  { "elementType": "geometry", "stylers": [{ "color": "#1f2937" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#111827" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca3af" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#374151" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#4b5563" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] }
]
```

---

## 3. Visualization Layers: Heatmaps & Markers

### 3.1 Heatmap Overlay (`HeatmapLayer`)
* **Layer Class**: `google.maps.visualization.HeatmapLayer`
* **Configuration**:
  * **Gradient**: Colors transition based on density:
    `['rgba(0, 255, 0, 0)', '#ffeb3b', '#ff9800', '#f44336']`
  * **Radius**: Pinned to `20` pixels. Scales dynamically during zoom changes.
  * **Weight**: Determined by the `historical_accident_count` property of the hotspot.

### 3.2 Dynamic Markers
* Hotspots are rendered as custom markers using inline SVG icons.
* Marker colors correspond to their risk level:
  * **Low (0-25)**: Green (`#10B981`)
  * **Medium (26-50)**: Yellow (`#F59E0B`)
  * **High (51-75)**: Orange (`#EF4444`)
  * **Critical (76-100)**: Dark Red (`#991B1B`)

---

## 4. Marker Clustering & Pin Performance
* **Tool**: Google Maps JS MarkerClusterer.
* **Strategy**: When zoomed out, individual markers collapse into aggregate clusters that display the total number of hotspots within that region. Individual pins render only when users zoom in past level `15`.
* **Execution**: Re-render markers only when the map's boundary coordinates change.

---

## 5. Interactive InfoWindows & Legend Overlays

### 5.1 InfoWindow (Popup Panel)
Clicking a marker opens an `InfoWindow` displaying details for the road segment:

```text
  ┌──────────────────────────────────────────────┐
  │  Road Segment: Connaught Place Ring Rd      │
  │  ──────────────────────────────────────────  │
  │  Risk Score: 82                              │
  │  Risk Category: Critical                     │
  │  Avg Speed: 42 km/h                          │
  │  Traffic: High                               │
  │  Weather: Rainy                              │
  └──────────────────────────────────────────────┘
```

---

## 6. User Controls: Geolocation & Search

### 6.1 Geolocation button
* Tapping the custom geolocation button requests browser location access:
  `navigator.geolocation.getCurrentPosition()`
* Moves the map center to the user's current coordinates.

### 6.2 Bounding Box Filtering
* Frontend filters visible markers dynamically using coordinate boundaries retrieved via the API:
  `GET /api/hotspots?north={lat}&south={lat}&east={lng}&west={lng}`

---

## 7. API Usage & Quota Optimization
* **Request Throttling**: Use a debounce function to delay API requests for 300ms while the user pans the map, preventing excessive queries.
* **Geocoding Cache**: Store geocoded coordinates for searched locations in session state, avoiding duplicate queries for the same location during a session.
* **Coordinate Bounds Rounding**: Round map boundaries to 4 decimal places before making API requests, allowing the backend to serve cached results for similar queries.

---

## 8. Assumptions, Risks & Mitigation

### 8.1 Assumptions
* The user's browser supports geolocation services, and the user grants permission to access their location.

### 8.2 Map Risks & Mitigation
* **Risk**: High API costs if users pan the map continuously, triggering rapid coordinate queries.
  * *Mitigation*: Restrict query frequency using debounce wrappers, and limit the maximum number of returned markers to 500 per request.

---

## 9. Best Practices
* **Load Scripts Asynchronously**: Load maps scripts asynchronously to prevent page blocking during initialization.
* **Handle Errors Gracefully**: If the Maps API fails to load (e.g., due to network issues), display a fallback error banner and disable maps features.

## 10. Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-07-27 | GIS Architect | Initial maps specification covering custom styling, layers, clustering, and API optimization. |

---

## 11. References
1. *Google Maps Javascript API Marker Clustering*: https://developers.google.com/maps/documentation/javascript/marker-clustering
2. *Google Maps Heatmap Layer Reference*: https://developers.google.com/maps/documentation/javascript/reference/visualization
3. *Google Cloud Console API Access Restrictions*: https://cloud.google.com/docs/security/api-keys

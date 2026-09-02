# Google Maps Integration Report

## Project: SafeRoute AI
### AI-Powered Road Accident Hotspot Prediction System

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Completed |
| **Author** | SafeRoute AI Lead GIS & Maps Architect |
| **Date** | 2026-07-27 |
| **Intended Audience** | Lead Architects, Security Reviewers, Frontend Engineers |

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Google Maps API Loader & Status Tracking](#2-google-maps-api-loader--status-tracking)
3. [Marker Architecture & Custom Risk Styles](#3-marker-architecture--custom-risk-styles)
4. [Heatmap Implementation & Decoupled Architecture](#4-heatmap-implementation--decoupled-architecture)
5. [User Interactions & Map Refocusing](#5-user-interactions--map-refocusing)
6. [API Security & Restriction Key Recommendations](#6-api-security--restriction-key-recommendations)
7. [Quota Optimization & Performance Controls](#7-quota-optimization--performance-controls)

---

## 1. Executive Summary
This report outlines the technical design, security controls, and optimization strategies for the Google Maps integration within the SafeRoute AI dashboard.

---

## 2. Google Maps API Loader & Status Tracking

### 2.1 Async Loading Architecture
The map script is loaded dynamically using `@googlemaps/js-api-loader`. This approach prevents page-blocking during initialization and provides centralized state management for script loading:
* **`MapLoader.js`**: Orchestrates status tracking (`idle` | `loading` | `loaded` | `error` | `auth_failure`).
* **`MapContext.jsx`**: Listens to loader status changes and triggers fallback states if failures occur.

---

## 3. Marker Architecture & Custom Risk Styles

### 3.1 Marker Rendering
Hotspots are rendered as custom markers using inline SVGs to maintain high rendering quality. Pin color codes correspond directly to their hazard levels:
* **Low Risk**: Emerald Green (`#10B981`)
* **Medium Risk**: Amber Yellow (`#F59E0B`)
* **High Risk**: Orange (`#EF4444`)
* **Critical Risk**: Dark Red (`#991B1B`)

### 3.2 Marker Type Abstraction
* **Normal**: Standard SVG pin representation.
* **Selected**: Enlarged scale and highlighted border indicating current focus.

---

## 4. Heatmap Implementation & Decoupled Architecture
* The application builds a normalized dataset: `weight = risk_score / 100.0`.
* Heat intensity is determined dynamically. To support future mapping frameworks (like Leaflet or Mapbox), coordinate formatting is decoupled from Google Maps visual layers.

---

## 5. User Interactions & Map Refocusing
All camera movements and marker interactions are managed through the centralized `MapContext`:
* **Center on Selection**: Clicking on a prediction from history centers the map and displays the info popup.
* **Geolocate User**: Geolocation coordinates center the camera on the user's current location.

---

## 6. API Security & Restriction Key Recommendations

> [!CAUTION]
> Never commit unrestricted Google Maps API keys to source control. Ensure all credentials are loaded via environment variables (`VITE_GOOGLE_MAPS_API_KEY`) and secure them in the Google Cloud Console.

### 6.1 Recommended Key Security Policy
1. **HTTP Referrer Restrictions**: Limit key usage to the production domains.
2. **API Restrictions**: Restrict keys to use only the required APIs:
   * Maps JavaScript API
   * Geocoding API
3. **Billing Alerts**: Set monthly budget thresholds to prevent unexpected costs.

---

## 7. Quota Optimization & Performance Controls
* **Request Debouncing**: Bound coordinate pans to 300ms delays to prevent excessive API calls.
* **Precision Rounding**: Round map boundaries to 4 decimal places before making API requests, allowing the backend to serve cached results for similar queries.

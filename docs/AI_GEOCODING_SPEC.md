# SafeRoute AI — AI-Assisted Place Search Specification

## 1. Executive Summary & Core Architectural Principle

The AI-Assisted Place Search feature enables commuters to enter natural language location queries (e.g., *"Shalimar Bagh near Max Hospital"*, *"Opposite CP Metro Gate 3"*, *"Cyber City Phase 3"*).

### Core Rule:
**Gemini AI acts strictly as an Interpretation Layer (extracting structured place, landmark, locality, and city text). Gemini is NEVER treated as the authoritative source of latitude/longitude coordinates or ML road taxonomy.**

```
User Query
    ↓
Gemini Interpretation Layer (Extracts place, landmark, locality, city)
    ↓
Normalized Search Intent
    ↓
Authoritative Geocoder (Local Presets / Nominatim / OpenMeteo)
    ↓
Verified Coordinates & Address
    ↓
Delhi NCR Bounding Box Safety Check (lat ∈ [28.3, 28.9], lng ∈ [76.8, 77.5])
    ↓
Query-Match Validation & Candidate Selection
    ↓
Route Planner + Map Marker Confirmation
```

---

## 2. Fallback Chain & Provider Hierarchy

```
1. Local Preset Dictionary (0ms instant fast-path for top Delhi NCR locations)
        ↓ (if not preset)
2. Gemini Query Interpretation Layer (Extracts query intent string)
        ↓
3. Primary Authoritative Geocoder (OpenStreetMap Nominatim API)
        ↓ (if failed/timeout)
4. Secondary Authoritative Geocoder (OpenMeteo Geocoding API)
        ↓ (if failed)
5. Deterministic Failure State ("Location could not be verified")
```

---

## 3. Data Contract & API Specification

### Endpoint: `POST /api/v1/routes/geocode`

#### Request Payload:
```json
{
  "query": "Shalimar Bagh near Max Hospital"
}
```

#### Response Payload (Verified Result):
```json
{
  "success": true,
  "message": "Location search completed with status: verified.",
  "data": {
    "query": "Shalimar Bagh near Max Hospital",
    "location_name": "Shalimar Bagh, Delhi",
    "latitude": 28.7167,
    "longitude": 77.1667,
    "source": "NOMINATIM",
    "match_status": "verified",
    "ai_status": "interpreted",
    "ai_interpretation": {
      "place": "Shalimar Bagh",
      "landmark": "Max Hospital",
      "locality": "Shalimar Bagh",
      "city": "Delhi"
    },
    "candidates": []
  }
}
```

---

## 4. Security & Protection Guidelines

1. **Backend-Only Credentials**: `GEMINI_API_KEY` is loaded exclusively in `app/config.py` from server environment variables. It is never rendered in React source, Vite bundles, localStorage, network payloads, or logs.
2. **Delhi NCR Bounding Guard**: Restricts coordinates to:
   $$\text{latitude} \in [28.3000, 28.9000] \quad \text{and} \quad \text{longitude} \in [76.8000, 77.5000]$$
3. **Query Normalization & Cache**: Suppresses duplicate external API calls by caching verified results under normalized keys (`"karol bagh"` == `"Karol Bagh"`).

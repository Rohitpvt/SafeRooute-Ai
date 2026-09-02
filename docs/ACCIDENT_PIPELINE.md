# Historical Accident Ingestion & PostGIS Map-Matching Pipeline — SafeRoute AI

## 1. Overview
The **Accident Ingestion & Spatial Map-Matching Pipeline** ingests, validates, map-matches, and indexes historical accident observations and blackspot spatial priors into the `accident_records` PostGIS database table.

---

## 2. Source Availability Audit & Classification

| Source Name | Data Type | Coordinates / Timestamps | Dataset Mode | Taxonomy Record Type | Scientific Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Delhi Traffic Police Blackspot Locations** | High-fatality junction coordinates (~117 hotspots) | GPS Lat/Lng (2024–2026) | `RESEARCH_REAL` | `BLACKSPOT_RECORD` | Spatial Prior / Contextual Density Feature (NOT crash event $y=1$) |
| **Academic Delhi NCR Crash Subsets** | Individual micro-level crash events | GPS Lat/Lng & Timestamps | `RESEARCH_REAL` / `LIMITED_REAL` | `ACCIDENT_RECORD` | Ground-Truth Crash Label |
| **Pipeline Synthetic Fixtures** | Test suite fixtures | Synthetic Coordinates | `PIPELINE_SYNTHETIC` | `ACCIDENT_RECORD` | Pipeline DDL & Test Suite Verification |

---

## 3. Provenance & Dataset Mode Rules

1. **`RESEARCH_REAL`**: Verified external crash observations from official/academic records.
2. **`LIMITED_REAL`**: Real crash records with partial attribute missingness.
3. **`PIPELINE_SYNTHETIC`**: Automated test fixtures. Must NEVER enter research baseline evaluation datasets.

---

## 4. PostGIS Map Matching & Distance Thresholds

Accident points are matched against the nearest `RoadSegment` geometry using geodesic distance calculation in meters.

| Distance Threshold ($d$) | Confidence Category | Processing Action |
| :--- | :--- | :--- |
| $d \le 15.0\text{ meters}$ | `EXACT` | Accepted & Persisted |
| $15.0\text{ m} < d \le 30.0\text{ meters}$ | `ACCEPTABLE` | Accepted & Persisted |
| $30.0\text{ m} < d \le 50.0\text{ meters}$ | `LOW_CONFIDENCE` | Accepted & Persisted with Low-Confidence Tag |
| $d > 50.0\text{ meters}$ | `REJECTED` | Quarantined in `logs/accident_quarantine_run_<id>.json` |

---

## 5. H3 Spatial Indexing

Accident coordinates are indexed using **Uber H3 Resolution 8** ($\sim 0.737 \text{ km}^2$ area) based directly on the crash coordinate.

---

## 6. Execution & Idempotency

Re-running the pipeline on identical records updates existing database rows based on `(source_name, source_record_id)` without creating duplicate records.

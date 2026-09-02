# Phase 6.3 — Real Accident Data Acquisition Strategy & Access Readiness Report

## 1. Current Data Problem
SafeRoute AI has constructed an end-to-end multi-source geospatial data pipeline (OSM road network, weather ingestion, H3 indexing, feature fusion matrix, offline benchmarking, data quality scoring). However, the project currently lacks a sufficiently large, verified, micro-level real crash observation dataset for Delhi NCR ($0$ real micro-crash events currently loaded).

---

## 2. Exact Missing Data Requirements
To achieve **Level 2 (Research Ready)** and **Level 3 (Production Evaluation Ready)** status:
- **Spatial**: Exact WGS84 coordinates ($\le 15\text{m}$ spatial precision) across Delhi, Gurgaon, Noida, Ghaziabad, and Faridabad.
- **Temporal**: Exact crash date and UTC/IST hour of occurrence ($2021-2025$ multi-year span).
- **Volume Target**: $\ge 1,000$ verified real micro-crash events covering $\ge 50$ distinct H3 Resolution 8 spatial cells.

---

## 3. Verified Candidate Sources Matrix

| Source ID | Source / Organization | Lat/Lng | Date | Time | Severity | Delhi NCR Scope | Access Route | License / Legal Status | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SRC-MORTH-IRAD-2024` | MoRTH iRAD / eDAR | Yes ($\le 5\text{m}$) | Yes | Yes | Yes | Delhi NCR / National | Institutional MoU / MoRTH Request | Restricted Government Access | **PRIMARY (Tier A)** |
| `SRC-DELHI-POLICE-2024` | Delhi Traffic Police Annual Crash Reports | Yes | Yes | Yes | Yes | Delhi NCR | Open Government Data / MoU | Public Government Data | **BACKUP (Tier B)** |
| `SRC-DELHI-BLACKSPOTS-2024` | Delhi Traffic Police 117 Blackspots | Centroid | Approx | Approx | Yes | Delhi NCR | Open CSV | Public Context (Spatial Prior Only) | **CONTEXTUAL (Tier C)** |
| `SRC-OPEN-METEO-ARCHIVE` | Open-Meteo REST API | Estimated | Yes | Yes | No | Delhi NCR | REST API | CC BY 4.0 | **WEATHER (Tier B)** |

---

## 4. Acquisition Targets & Access Pathways

### A. Primary Acquisition Target: MoRTH iRAD / eDAR
- **Organization**: Ministry of Road Transport and Highways (MoRTH), Government of India.
- **Data Contents**: High-precision GPS crash points, hourly timestamps, vehicle types, road geometry, crash severity, collision types.
- **Access Strategy**: Formal academic data request / MoU between university research lab and MoRTH / NIC iRAD division for non-commercial research use.

### B. Backup Acquisition Target: Delhi Traffic Police / OGD India
- **Organization**: Delhi Traffic Police & Open Government Data Platform (data.gov.in).
- **Data Contents**: Micro-crash reports and spatial blackspot centroid reports.
- **Access Strategy**: Public CSV download and official open-data portal requests.

### C. Fallback Acquisition Target
- Retain pipeline verification benchmark fixtures (`PIPELINE_SYNTHETIC`) and clearly label all offline experiments as pipeline benchmarks while awaiting institutional access.

---

## 5. Technical Data Request Specification
- **Required**: Latitude, Longitude, Date, Timestamp (UTC/IST), Unique Record ID.
- **Preferred**: Severity (`Fatal`, `Serious`, `Minor`), Road Type, Junction Type, Collision Type.
- **Optional**: Weather, Lighting, Vehicle Types Involved.

---

## 6. Data Security & Privacy Minimization Policy
- **PII Elimination**: Driver names, phone numbers, vehicle license plates, and exact street addresses are strictly stripped prior to ingestion.
- **Data Minimization**: Micro-crashes are indexed to OSM Way IDs and H3 Resolution 8 spatial cells.

---

## 7. Acquisition Roadmap (Stages A–I)
1. **Stage A (Discovery)**: Complete source cataloging in `source_registry.json` (**DONE**).
2. **Stage B (Access Request)**: Prepare formal MoU data request specification (**DONE**).
3. **Stage C (Data Receipt)**: Receive institutional CSV/JSON dataset from primary/backup target.
4. **Stage D (Legal & Provenance Verification)**: Compute SHA-256 file hashes and verify license boundaries.
5. **Stage E (Schema Normalization)**: Pass records through source adapters (`backend/app/services/accident_adapters.py`).
6. **Stage F (Quality Audit)**: Calculate record quality scores ($0.0-100.0$) in `backend/ml/data_readiness.py`.
7. **Stage G (OSM Map Matching)**: Execute PostGIS $50\text{m}$ map-matching pipeline.
8. **Stage H (Weather Overlap)**: Join hourly Open-Meteo weather observations.
9. **Stage I (Readiness Assessment)**: Evaluate transition to Level 2 (Research Ready) or Level 3 (Production Evaluation Ready).

---

## 8. Test & Regression Audit
- **Backend Pytest Suite**: **39/39 PASSED (0 Failures across 13 test files)**.
- **Frontend Vitest Suite**: **30/30 PASSED (0 Failures across 5 test files)**.
- **Production Safety**: Active model `RandomForest v1.6.0` and binaries `model.joblib` and `preprocessor.joblib` remain 100% untouched.

---

## 9. Phase 7 Authorization Status
> **IS PHASE 7 AUTHORIZED? NO**
> Live risk scoring integration (Phase 7) is strictly **NOT AUTHORIZED** until institutional data acquisition is completed and dataset readiness reaches Level 3.

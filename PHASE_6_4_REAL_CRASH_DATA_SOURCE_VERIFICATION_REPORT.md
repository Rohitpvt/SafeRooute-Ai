# Phase 6.4 — Verified Real Crash Data Source Verification Report

## 1. Executive Summary
Phase 6.4 completes an independent verification of real crash data sources for Delhi NCR. It resolves earlier claims by confirming that **MoRTH iRAD/eDAR** (`SRC-MORTH-IRAD-2024`) is the single highest-confidence primary target for micro-level GPS crash logs, whereas public Delhi Traffic Police reports provide district aggregated tables and blackspot centroids rather than individual GPS crash points.

---

## 2. Independent Audit & Claim Verification

| Claim / Source | Original Status | Verified Audit Finding |
| :--- | :--- | :--- |
| **MoRTH iRAD / eDAR Access** | Claimed Public / Open | **RESTRICTED**. Micro-level GPS crash logs exist, but access requires a formal academic MoU / Institutional Data Sharing Request. |
| **Delhi Traffic Police Public Data** | Claimed Micro-Level GPS | **CORRECTED**. Public reports contain annual totals, district statistics, and 117 blackspot centroids. Useful as spatial prior context, not individual crash ground-truth labels. |
| **OGD India (data.gov.in) GIS Logs** | Claimed Street-Level | **CORRECTED**. Portal catalog provides state/district aggregated statistical catalogs; street-level GPS logs are not directly downloadable on public portals. |

---

## 3. Verified Source Selection & Target Decision

1. **PRIMARY TARGET**: `SRC-MORTH-IRAD-2024` (MoRTH iRAD / eDAR via formal academic research request).
2. **BACKUP TARGET**: `SRC-DELHI-POLICE-2024` (Delhi Traffic Police / Govt of NCT Delhi formal academic data request).
3. **CONTEXTUAL SOURCE**: `SRC-DELHI-BLACKSPOTS-2024` (Official 117 Blackspots - Spatial prior context).
4. **DEAD ENDS**: Random Kaggle datasets, scraped news headlines, foreign crash datasets (e.g. US/UK crash datasets mixed into Delhi labels).

---

## 4. Formal Data Request Packages Created
The following formal data request drafts have been created in `docs/data_requests/` for institutional execution:
- [`docs/data_requests/IRAD_eDAR_DATA_REQUEST_DRAFT.md`](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/docs/data_requests/IRAD_eDAR_DATA_REQUEST_DRAFT.md)
- [`docs/data_requests/DELHI_TRAFFIC_POLICE_DATA_REQUEST_DRAFT.md`](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/docs/data_requests/DELHI_TRAFFIC_POLICE_DATA_REQUEST_DRAFT.md)
- [`docs/data_requests/OGD_DATA_REQUEST_DRAFT.md`](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/docs/data_requests/OGD_DATA_REQUEST_DRAFT.md)

---

## 5. Machine-Readable Acquisition Tracker Artifact
Created artifact `backend/data/readiness/acquisition_tracker.json` tracking source statuses (`REQUEST_READY`, `DISCOVERY`) with zero fabricated `REQUEST_SENT` entries.

---

## 6. Test & Regression Audit
- **Backend Pytest Suite**: **42/42 PASSED (0 Failures across 14 test files)**.
- **Frontend Vitest Suite**: **30/30 PASSED (0 Failures across 5 test files)**.
- **Production Safety**: Active model `RandomForest v1.6.0` and binaries `model.joblib` and `preprocessor.joblib` remain 100% untouched.

---

## 7. Phase 7 Authorization Status
> **IS PHASE 7 AUTHORIZED? NO**
> Live risk scoring integration (Phase 7) is strictly **NOT AUTHORIZED** until institutional data acquisition is completed and dataset readiness reaches Level 3.

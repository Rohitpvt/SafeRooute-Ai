# Phase 6.2 — Real-World Dataset Expansion & ML Data Readiness Report

## 1. Executive Summary
Phase 6.2 establishes a transparent, audited **Real-World Data Acquisition & Readiness Framework** for SafeRoute AI. It addresses the core data gap by establishing source provenance tracking, data quality scoring, coordinate/timestamp completeness verification, deduplication rules, and explicit readiness level gatekeeping.

---

## 2. Current Dataset Inventory Audit
- **Total Road Segments**: Ready for extraction via OSM Overpass engine.
- **Total Accident Records**: 117 official Delhi Traffic Police High-Fatality Blackspots.
- **Blackspot Records (`BLACKSPOT_RECORD`)**: 117 (Stored as spatial prior context, strictly isolated from positive crash labels $y=1$).
- **Real Crash Micro-Records**: 0 (Currently in pipeline testing fixture mode; awaiting iRAD/eDAR institutional micro-crash dataset access).
- **Synthetic Records (`PIPELINE_SYNTHETIC`)**: Used strictly for software unit tests and pipeline validation.
- **Quarantined Records**: 0
- **Weather Observations**: 24 hourly observations (Open-Meteo REST API Archive).

---

## 3. Verified Source Registry Catalog

| Source ID | Organization | Scope | Access | Provenance Level | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SRC-DELHI-BLACKSPOTS-2024` | Delhi Traffic Police / MoRTH | Delhi NCR (117 Locations) | Open / CSV | `BLACKSPOT_CONTEXT` | **VERIFIED** |
| `SRC-MORTH-IRAD-2024` | MoRTH / iRAD eDAR | Delhi NCR / National | Private / Institutional | `RESEARCH_REAL` | **RESTRICTED** |
| `SRC-OPEN-METEO-ARCHIVE` | Open-Meteo.com | Global / Delhi NCR | REST API (CC BY 4.0) | `RESEARCH_REAL` | **VERIFIED** |
| `SRC-SYNTHETIC-TEST-FIXTURES` | SafeRoute AI Team | Delhi NCR Test Envelope | Internal | `PIPELINE_SYNTHETIC` | **VERIFIED** |

---

## 4. Data Readiness Level Classification

> **CURRENT READINESS LEVEL: LEVEL 0 — PIPELINE_ONLY**
> - **Level 0 (PIPELINE_ONLY)**: Insufficient micro-level real crash events ($<100$ real crash observations).
> - **Research Ready Status**: `False`
> - **Production Evaluation Ready Status**: `False`
> - **Phase 7 Authorization Status**: **NO (STRICTLY BLOCKED)**

---

## 5. Requirements for Level 3 Production-Evaluation Readiness
To transition SafeRoute AI to Level 3 (Production Evaluation Ready):
1. Minimum **$\ge 1,000$ verified real micro-level crash events** with exact GPS coordinates ($\le 15\text{m}$ precision) and UTC hourly timestamps across Delhi NCR.
2. Multi-year coverage ($2021-2025$) spanning all 4 seasons and varied weather regimes.
3. Minimum **$\ge 50$ distinct H3 Resolution 8 spatial cells** represented in positive crash events.

---

## 6. Files Created
- [`backend/app/services/source_registry.py`](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/app/services/source_registry.py): Authoritative data source registry manager.
- [`backend/data/readiness/source_registry.json`](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/data/readiness/source_registry.json): Source registry catalog artifact.
- [`backend/ml/data_readiness.py`](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/ml/data_readiness.py): Deterministic quality score calculator & dataset readiness level validator.
- [`backend/data/readiness/delhi_ncr_data_readiness.json`](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/data/readiness/delhi_ncr_data_readiness.json): Machine-readable readiness report artifact.
- [`backend/tests/test_phase6_2_data_readiness.py`](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/tests/test_phase6_2_data_readiness.py): Phase 6.2 unit test suite.

---

## 7. Test & Regression Audit
- **Backend Pytest Suite**: **36/36 PASSED (0 Failures across 12 test files)**.
- **Frontend Vitest Suite**: **30/30 PASSED (0 Failures across 5 test files)**.
- **Production Model Safety**: Active model `RandomForest v1.6.0` and binaries `model.joblib` and `preprocessor.joblib` remain 100% untouched.

---

## 8. Phase 7 Gate Recommendation
> **Phase 7 Live Risk Scoring Integration MUST REMAIN BLOCKED.**
> Live multi-source risk scoring or production model replacement must not proceed until institutional iRAD/eDAR or OGD real crash datasets are ingested to reach Level 3 Readiness.

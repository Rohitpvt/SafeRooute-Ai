# Authoritative Real Crash Data Acquisition Plan & Source Verification — SafeRoute AI

## 1. Independent Audit & Verification of Phase 6.3 Claims

| Claim from Phase 6.3 | Verification Status | Independent Audit Finding |
| :--- | :--- | :--- |
| **iRAD / eDAR Data Availability** | **PARTIALLY VERIFIED (RESTRICTED)** | iRAD contains micro-level GPS crash logs, but access is strictly restricted to government/police authorities. Requires formal academic MoU with MoRTH/NIC. |
| **Delhi Traffic Police Public Data** | **CORRECTED** | Publicly accessible Delhi Traffic Police reports provide aggregated district tables and 117 blackspot centroids, **NOT** individual GPS micro-crash points. |
| **OGD India Street-Level GPS Logs** | **CORRECTED** | OGD India (data.gov.in) provides state/district aggregated statistical catalogs; street-level GPS logs are not directly downloadable on public portals. |
| **Data Privacy & DPDP Compliance** | **VERIFIED** | Non-PII design and H3/OSM spatial indexing comply with India DPDP Act 2023 principles. |

---

## 2. Data Type Taxonomy & Classification

- **`INDIVIDUAL_CRASH`**: Micro-level individual crash events with exact GPS coordinates and timestamps. (Required for supervised training target $y=1$).
- **`BLACKSPOT`**: Spatial prior hotspot locations (e.g. 117 Delhi Traffic Police blackspots). (Stored as contextual spatial priors, **NEVER** converted into individual crash events).
- **`AGGREGATED_STATISTICS`**: Annual/district collision totals. (Used for macro validation and reporting bias auditing).
- **`PIPELINE_SYNTHETIC`**: Unit test fixtures. (Used strictly for software testing).

---

## 3. Source Selection & Decision Matrix

1. **PRIMARY TARGET**: `SRC-MORTH-IRAD-2024` (MoRTH iRAD/eDAR via formal academic MoU).
2. **BACKUP TARGET**: `SRC-DELHI-POLICE-2024` (Delhi Traffic Police / Govt of NCT Delhi formal academic data request).
3. **CONTEXTUAL SOURCE**: `SRC-DELHI-BLACKSPOTS-2024` (Official 117 Blackspots - Spatial prior context).
4. **DEAD ENDS**: Random scraped web datasets, unverified social media text, foreign crash datasets (e.g. US/UK crash datasets mixed into Delhi labels).

---

## 4. Formal Acquisition Roadmap (Stages A–I)
- **Stage A (Discovery)**: Complete cataloging in `source_registry.json` (**DONE**).
- **Stage B (Request Drafts)**: Create formal technical specifications in `docs/data_requests/` (**DONE**).
- **Stage C (Data Request Submission)**: Submit formal academic data-sharing MoU request to MoRTH/NIC (`REQUEST_READY`).
- **Stage D (Legal Review & Receipt)**: Compute SHA-256 hashes upon data receipt.
- **Stage E (Intake & Normalization)**: Run records through `BaseAccidentAdapter`.
- **Stage F (Quality & Provenance Audit)**: Execute `data_readiness.py` audit.
- **Stage G (PostGIS Map Matching)**: Execute $50\text{m}$ map-matching pipeline.
- **Stage H (Weather Fusion)**: Join Open-Meteo hourly weather observations.
- **Stage I (Readiness Re-Evaluation)**: Re-evaluate transition to Level 2 (Research Ready) or Level 3 (Production Evaluation Ready).

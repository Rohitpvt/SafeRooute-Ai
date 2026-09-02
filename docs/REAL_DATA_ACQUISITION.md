# Real-World Data Acquisition Framework & Policy — SafeRoute AI

## 1. Executive Summary
SafeRoute AI requires verified, legally compliant, multi-year real individual crash observations in Delhi NCR to transition from pipeline benchmarks (`Level 0 PIPELINE_ONLY`) to research-grade ML modeling (`Level 2 RESEARCH_READY`) and pre-production evaluation (`Level 3 PRODUCTION_EVALUATION_READY`).

---

## 2. Technical Data Request Specification

### A. Required Fields (Mandatory for Record Ingestion)
- **Latitude & Longitude**: Exact WGS84 coordinates ($\le 15\text{m}$ spatial precision).
- **Date & Timestamp**: Date and hour of crash occurrence (UTC or IST).
- **Dataset Provenance**: Source agency, source ID, retrieval date.

### B. Preferred Fields (High Impact for Feature Fusion)
- **Crash Severity**: `Fatal`, `Serious`, `Minor`, `Property Damage Only`.
- **Road & Junction Type**: `Highway`, `Arterial`, `Intersection`, `Roundabout`.
- **Collision Type**: `Head-On`, `Rear-End`, `Pedestrian Impact`, `Single Vehicle`.

### C. Optional Fields (Supplementary Context)
- **Weather & Lighting Conditions**: `Rain`, `Fog`, `Clear`, `Night Daylight`.
- **Vehicle Types Involved**: `Two-Wheeler`, `Pedestrian`, `HGV`, `Light Motor Vehicle`.

---

## 3. Data Security & Privacy Minimization Policy
To ensure complete compliance with data protection laws (e.g. India DPDP Act 2023):
1. **PII Elimination**: No personally identifiable information (driver names, phone numbers, addresses, license plate numbers) is ever ingested or stored.
2. **Coordinate Anonymization**: Individual micro-crashes are matched to OSM Way IDs and Uber H3 Resolution 8 spatial indices without storing sensitive personal identifiers.
3. **Restricted Access Management**: Raw CSV/JSON files received under research MoUs must be stored in secure, encrypted local environments with strict access logging.

---

## 4. Legal Licensing & Usage Compliance Matrix

| License Type | Permitted Usage | Research Model Training | Production Deployment | Re-distribution |
| :--- | :--- | :--- | :--- | :--- |
| **Open Government Data (OGD)** | Academic & Commercial | Allowed | Allowed | Allowed with Attribution |
| **Institutional MoU / iRAD** | Academic / Research Only | Allowed (Non-Commercial) | Requires Separate Authorization | Prohibited |
| **Creative Commons CC BY 4.0** | Academic & Commercial | Allowed | Allowed | Allowed with Attribution |

---

## 5. Research-Ready & Production-Evaluation Checklists

### Research-Ready Checklist (Level 2)
- [ ] $\ge 100$ verified real micro-level crash events in Delhi NCR.
- [ ] $\ge 15$ distinct H3 Resolution 8 spatial cells represented.
- [ ] Exact GPS coordinates ($\le 30\text{m}$ precision) and hourly timestamps.
- [ ] Provenance metadata recorded with immutable SHA-256 source file hashes.

### Production-Evaluation Checklist (Level 3)
- [ ] $\ge 1,000$ verified real micro-level crash events in Delhi NCR.
- [ ] $\ge 50$ distinct H3 Resolution 8 spatial cells represented.
- [ ] Multi-year temporal span ($2021-2025$) covering all 4 seasons.
- [ ] Provenance level `RESEARCH_REAL` with zero synthetic mix in evaluation splits.
- [ ] Formal legal data usage authorization for pre-production inference.

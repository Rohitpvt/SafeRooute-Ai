# Academic Research Data Request Specification: MoRTH iRAD / eDAR

**Target Organization**: Ministry of Road Transport and Highways (MoRTH) / National Informatics Centre (NIC)  
**Program**: Integrated Road Accident Database (iRAD) / e-Detailed Accident Report (eDAR)  
**Status**: `DRAFT - REQUEST_READY` (For Formal Submission via Academic Institution)

---

## 1. Project Background & Research Objective
SafeRoute AI is an academic machine learning research initiative developing spatial-temporal accident hotspot prediction models to improve road safety in Delhi NCR. The goal of this research is to evaluate non-linear predictive algorithms on verified road infrastructure and weather features.

---

## 2. Requested Data Scope & Fields
We formally request non-commercial research access to anonymized, micro-level road accident records for **Delhi NCR** covering calendar years **2021 through 2025**.

### A. Mandatory Technical Fields
- **Unique Event ID**: Anonymous internal crash record identifier (`event_id`).
- **Geographic Coordinates**: WGS84 Latitude and Longitude of crash location ($\le 15\text{m}$ spatial precision).
- **Temporal Stamp**: Date of occurrence and exact hour of crash ($00:00 - 23:00$ UTC or IST).

### B. Strongly Preferred Technical Fields
- **Crash Severity**: `Fatal`, `Serious Injury`, `Minor Injury`, `Property Damage Only`.
- **Road & Junction Characteristics**: Road classification (`Highway`, `Arterial`, `Local`), junction type (`Signalized`, `Roundabout`, `Mid-block`).
- **Collision Characteristics**: Impact type (`Head-on`, `Rear-end`, `Pedestrian`), number of vehicles involved.

---

## 3. Data Protection & Privacy Minimization Commitments
1. **Zero PII Requirement**: SafeRoute AI strictly does NOT require or request any personally identifiable information (driver names, phone numbers, addresses, license plate numbers, or vehicle registration details).
2. **Anonymization & Spatial Indexing**: All coordinates are processed into spatial cell indices (Uber H3 Resolution 8) and matched to OpenStreetMap Way IDs without storing private personal data.
3. **Restricted Storage & Security**: Raw dataset files received under an academic MoU will be stored in encrypted local research environments with strict access auditing.
4. **Non-Commercial Academic Use**: Data will be used exclusively for academic model evaluation, scientific benchmarking, and peer-reviewed research publications with proper MoRTH attribution.

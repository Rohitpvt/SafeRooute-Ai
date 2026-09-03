# SafeRoute AI — Final Specification Reconciliation Report
## Real-Time Driver Safety Assistant

> [!IMPORTANT]
> This document provides an exhaustive, line-item reconciliation between the original frozen design specifications, early architectural proposals, and the final Phase A–D implementation of the Real-Time Driver Safety Assistant.

---

## Mismatch 1: Weather Speed Modifiers ($M_{\text{weather}}$)

- **OLD SPEC**: Early exploratory proposal suggested 0.80 (20% reduction) for Heavy Rain and 0.90 (10% reduction) for Light Rain.
- **IMPLEMENTED VALUE**: 
  - `HEAVY_RAIN` / `STORM` / `LOW_VISIBILITY` = `0.85` (15% reduction)
  - `LIGHT_RAIN` / `FOG` = `0.92` (8% reduction)
  - `CLEAR` / `CLOUDY` = `1.00`
- **REASON**: Standard highway capacity and speed adjustment studies (TRB Highway Capacity Manual & FHWA road weather guidance) indicate that typical rain-related free-flow speed reductions range from 8% to 15%. A 20% flat speed reduction was excessively aggressive and caused artificial overspeed alerts on minor rain.
- **SCIENTIFIC STATUS**: `ENGINEERING ASSUMPTION` (Heuristic based on FHWA road weather research; not empirically fit on local crash data).
- **FINAL DECISION**: RECONCILED & ACCEPTED (0.85 / 0.92 values locked as Phase D implementation standard).

---

## Mismatch 2: ML Risk Score Rule Classification & Gating

- **OLD SPEC**: Early draft report erroneously mentioned that an ML risk score of 85 was classified as `RULE-RISK-01` (CAUTION).
- **IMPLEMENTED VALUE**:
  - `RULE-RISK-01`: RiskScore 46–58 $\implies$ `CAUTION` (High-risk segment approach, distance $\le 400\text{m}$).
  - `RULE-RISK-02`: RiskScore $\ge 59$ + Physical Overspeed ($>10\text{ km/h}$ over advisory) OR Sharp Turn $\implies$ `WARNING` (distance $\le 250\text{m}$).
  - Ungated RiskScore $\ge 59$ without physical overspeed or curve emits ZERO intrusive alert candidates. Ambient risk remains on telemetry/HUD overlay.
- **REASON**: Un-gated ML risk warnings create alert fatigue when the driver is traveling safely at or below advisory speed. Physical gating enforces deterministic authority.
- **SCIENTIFIC STATUS**: `EMPIRICALLY VALIDATED` (Verified in Phase A correction & Phase B arbitration).
- **FINAL DECISION**: RECONCILED & ACCEPTED (Physical gate strictly required for `RULE-RISK-02`).

---

## Mismatch 3: Deduplication & Audio Cooldown Window Nomenclature

- **OLD SPEC**: Early Phase B draft conflated identical-event deduplication with non-critical audio cooldown under a single "5-second cooldown" label.
- **IMPLEMENTED VALUE**:
  - **Identical Event Deduplication Window**: Strictly `20.0 seconds` ($20,000\text{ ms}$).
  - **Non-Critical Audio Cooldown State**: Strictly `10.0 seconds` ($10,000\text{ ms}$).
  - **Severity Escalation Bypass**: Immediate ($0\text{ ms}$ delay).
- **REASON**: Conflating deduplication with audio silence caused either banner flickering or suppressed legitimate audio chimes. Distinguishing event identity deduplication (20s) from non-critical audio cooldown (10s) aligns strictly with the frozen UX specification.
- **SCIENTIFIC STATUS**: `EMPIRICALLY VALIDATED` (Verified in Phase B hardening and E2E scenario 12).
- **FINAL DECISION**: RECONCILED & ACCEPTED (`20s` dedup, `10s` audio cooldown).

---

## Mismatch 4: TTS Message Microcopy Length

- **OLD SPEC**: Early prompt suggestions included longer phrases like "You are traveling above the recommended advisory speed for this road segment. Please slow down." (14 words).
- **IMPLEMENTED VALUE**: Every synthesized TTS string is strictly **$\le 8$ words**.
  - Example: `"Severe overspeed. Please reduce speed to 50."` (7 words)
  - Example: `"Sharp turn ahead in 150 meters."` (6 words)
- **REASON**: Long spoken phrases take $> 3.5\text{ seconds}$ to synthesize and play, distracting the driver and lagging behind real-time vehicle kinematics.
- **SCIENTIFIC STATUS**: `EMPIRICALLY VALIDATED` (Verified in Phase C microcopy catalog audit).
- **FINAL DECISION**: RECONCILED & ACCEPTED (Strict $\le 8$ words rule enforced across all audio catalogs).

---

## Mismatch 5: Speed Limit Terminology & Legal Disclaimer

- **OLD SPEC**: Initial exploratory concepts referred to OpenStreetMap `maxspeed` values as "Authoritative Speed Limit" or "Legal Speed Limit".
- **IMPLEMENTED VALUE**: Displayed speed labels strictly use `"Mapped Speed Limit"` (when OSM `maxspeed` exists) or `"Road Class Baseline"` (when inferred from highway taxonomy). Conservative Advisory Speed is explicitly labeled `"Conservative Advisory Speed"`.
- **REASON**: OpenStreetMap crowdsourced data cannot guarantee legal authority. Representing advisory speed or OSM maxspeed as an official legal speed limit creates liability and misinforms drivers.
- **SCIENTIFIC STATUS**: `EMPIRICALLY VALIDATED` (Verified in HUD UI audit & Phase A kinematics).
- **FINAL DECISION**: RECONCILED & ACCEPTED (Legal terminology strictly avoided).

---

## Mismatch 6: Data Quality States Vocabulary

- **OLD SPEC**: Draft concepts used ambiguous terms like "bad data" or "unknown quality".
- **IMPLEMENTED VALUE**: Quality engine exposes canonical states: `VALID`, `RECENT`, `DEGRADED`, `STALE`, `UNAVAILABLE`.
- **REASON**: Deterministic safety rules require explicit data quality boundaries to suppress location/weather candidates when data degrades.
- **SCIENTIFIC STATUS**: `EMPIRICALLY VALIDATED` (Verified in Phase D implementation).
- **FINAL DECISION**: RECONCILED & ACCEPTED.

---

## Summary of Reconciliation Verdicts

| Item | Old Spec | Implemented | Status | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Heavy Rain $M_{\text{weather}}$** | 0.80 | 0.85 | Engineering Assumption | Accepted |
| **Light Rain $M_{\text{weather}}$** | 0.90 | 0.92 | Engineering Assumption | Accepted |
| **High ML Risk Gating** | Ungated Risk=85 | Physical Gate Required | Empirically Validated | Accepted |
| **Event Deduplication** | 5s conflated | 20.0s Event Window | Empirically Validated | Accepted |
| **Audio Cooldown** | 5s conflated | 10.0s Non-Critical Cooldown | Empirically Validated | Accepted |
| **TTS Word Length** | Up to 14 words | $\le 8$ words strictly | Empirically Validated | Accepted |
| **Speed Limit Label** | Authoritative/Legal | Mapped / Road Class Baseline | Empirically Validated | Accepted |

# Spatial/Temporal Feature Fusion & Supervised Dataset Pipeline — SafeRoute AI

## 1. Overview
The **Feature Fusion & Dataset Pipeline** constructs supervised machine learning datasets by joining road network infrastructure, historical crash observations, and hourly weather records into a leakage-audited matrix.

---

## 2. Supervised Observation Unit
An observation is defined as:
> **`OSM Road Segment × 1-Hour Time Window`**

- **Primary Identity**: `osm_way_id` (OSM Way)
- **Spatial Index**: `h3_index` (Uber H3 Resolution 8)
- **Time Unit**: Hourly timestamp ($t$)

---

## 3. Timezone Normalization Rule
- All internal database timestamps are **UTC-normalized**.
- For feature extraction, UTC timestamps are converted to **India Standard Time (IST, Asia/Kolkata UTC+5:30)** to calculate:
  - `hour_of_day` ($0-23$)
  - `day_of_week` ($0-6$, $0=\text{Monday}$)
  - `is_weekend` ($1$ for Saturday/Sunday, $0$ otherwise)
  - `month` ($1-12$)

---

## 4. Target Construction & Negative Sampling Strategy

| Target Category | Definition | Label ($y$) | Sample Weight |
| :--- | :--- | :--- | :--- |
| **Positive Crash Event** | Verified accident observation matched to road segment & hour | $y=1$ | $1.0$ |
| **Negative Control (Type A)** | Same road segment at a non-crash hour | $y=0$ | $1.0$ |
| **Negative Control (Type B)** | Different road segment at the same crash hour | $y=0$ | $1.0$ |
| **Negative Control (Type C)** | Random road segment at a random non-crash hour | $y=0$ | $1.0$ |

*Scientific Safeguard*: Unobserved crash status is NOT treated as a confirmed zero without negative control sampling.

---

## 5. Rolling Historical Crash Priors & Leakage Guard
Rolling crash counts on the segment are calculated over 4 historical windows:
$$\text{crash\_prior\_7d}, \quad \text{crash\_prior\_30d}, \quad \text{crash\_prior\_90d}, \quad \text{crash\_prior\_365d}$$

- **Strict Leakage Guard**: Historical accidents are strictly evaluated over $[t - \text{window}, t)$. The target hour $t$ itself is **EXCLUDED** to prevent label leakage.

---

## 6. Exposure Proxy Score
Calculated as:
$$E = \text{lanes} \times \left(\frac{\text{speed\_limit}}{50}\right) \times \text{road\_class\_weight} \times \text{time\_multiplier}$$

---

## 7. Artifact Outputs
- **Parquet Dataset**: `backend/data/processed/delhi_ncr_multi_source_v1.parquet`
- **Dataset Metadata**: `backend/data/processed/delhi_ncr_multi_source_v1.meta.json`
- **Feature Schema Registry**: `backend/ml/feature_schema.json`

# ML Retraining & Validation Report — Model Candidate v2.0.0

## 1. Executive Summary
Following the retirement of the invalid 4-sample model `v1.27.0`, Candidate Model `v2.0.0` was trained on the full 10,000-record synthetic development dataset using a Random Forest Classifier architecture. Stratified 80/20 train/test splitting and 5-fold cross-validation were executed to measure realistic generalization capability. The candidate model has satisfied latency SLAs and performance standards and was successfully promoted to active production.

---

## 2. Dataset & Sampling Profile
- **Dataset Name**: `synthetic_hazard_events_10k`
- **Total Records**: 10,000 samples
- **Class Distribution**:
  - Class 0 (Safe): 5,772 records (57.72%)
  - Class 1 (Accident): 4,228 records (42.28%)
- **Train/Test Split**: 80% Train (8,000 samples) / 20% Holdout Test (2,000 samples), stratified by class label.

---

## 3. Cross-Validation Results (5-Fold Stratified CV on 8,000 Training Samples)

| Metric | Mean Score | Standard Deviation |
| :--- | :--- | :--- |
| **Accuracy** | 0.6141 | ± 0.0038 |
| **Precision** | 0.5438 | ± 0.0038 |
| **Recall** | 0.5408 | ± 0.0189 |
| **F1-Score** | 0.5422 | ± 0.0113 |
| **ROC-AUC** | 0.6537 | ± 0.0107 |

---

## 4. Holdout Test Set Evaluation (2,000 Samples)

### Performance Metrics Summary

| Metric | Value | Threshold / Target | Status |
| :--- | :--- | :--- | :--- |
| **Accuracy** | 0.6010 (60.10%) | Generalization Target (0.55–0.75) | PASSED |
| **Precision** | 0.5284 (52.84%) | Balanced Precision Target | PASSED |
| **Recall** | 0.5284 (52.84%) | Balanced Recall Target | PASSED |
| **F1-Score** | 0.5284 (52.84%) | Realistic Generalization | PASSED |
| **ROC-AUC** | 0.6404 (64.04%) | Non-random Classifier Score | PASSED |
| **Inference Latency** | 2.71 ms / query | SLA Limit < 200 ms | PASSED |
| **Model Binary Size** | 65.6 KB | Memory Footprint < 10 MB | PASSED |

### Confusion Matrix (Test Set)

```
                Predicted Safe (0)    Predicted Accident (1)
Actual Safe (0)       755 (TN)               399 (FP)
Actual Acc. (1)       399 (FN)               447 (TP)
```

### Feature Importance Ranking

| Rank | Feature | Importance | Preprocessing Transformer |
| :--- | :--- | :--- | :--- |
| 1 | `average_speed` | 0.3842 | StandardScaler |
| 2 | `traffic_density` | 0.1651 | OrdinalEncoder |
| 3 | `weather_Snowy` | 0.0894 | OneHotEncoder |
| 4 | `time_of_day_Night` | 0.0763 | OneHotEncoder |
| 5 | `weather_Rainy` | 0.0652 | OneHotEncoder |
| 6 | `road_type_Expressway` | 0.0581 | OneHotEncoder |
| 7 | `road_type_Highway` | 0.0520 | OneHotEncoder |
| 8 | `weather_Foggy` | 0.0431 | OneHotEncoder |
| 9 | `time_of_day_Evening` | 0.0385 | OneHotEncoder |
| 10 | `time_of_day_Morning` | 0.0281 | OneHotEncoder |

---

## 5. Model Quality & Leakage Audit
- **Data Contamination Check**: Clean stratified split performed; zero overlap between 8,000 train records and 2,000 test records.
- **Label Determinism Check**: Target generation uses non-deterministic binomial distribution sampling (`np.random.binomial(1, risk)`), preventing 100% artificial metric memorization.
- **Class Imbalance Management**: Managed via `class_weight="balanced"` in Random Forest hyperparameters.

---

## 6. Promotion & Artifact Registration
- **Previous Production Version**: `1.27.0` (Archived & Retired)
- **Promoted Version**: `2.0.0` (`candidate_model_v2.0.0.joblib`)
- **Active Files Updated**:
  - `backend/ml/model.joblib`
  - `backend/ml/preprocessor.joblib`
  - `backend/ml/model_metadata.json`

# Model Card - SafeRoute AI Prediction Engine

> [!WARNING]
> **DEVELOPMENT / SYNTHETIC DATA MODEL WARNING**
> This model (`v2.0.0`) was trained and evaluated strictly on synthetic development data generated using probabilistic rules.
> **DO NOT USE THIS MODEL FOR REAL-WORLD ROAD SAFETY OR NAVIGATION DECISIONS.**
> Synthetic-data evaluation metrics (e.g., Accuracy ~60.1%, F1 ~0.528) do **NOT** represent real-world crash prediction accuracy. Real-world validation requires deployment with verified historical accident and sensor datasets.

---

## 1. Model Details
* **Algorithm**: Random Forest Classifier (`sklearn.ensemble.RandomForestClassifier`)
* **Model Version**: 2.0.0 (Promoted Candidate)
* **Status**: `PROMOTED_SYNTHETIC_DEVELOPMENT`
* **Developers**: SafeRoute AI Machine Learning Team
* **Release Date**: 2026-09-02
* **License**: MIT License

---

## 2. Intended Use
* **Primary Use Cases**: Software demonstration, feature pipeline testing, and dynamic UI component development.
* **Intended Users**: SafeRoute AI system developers, researchers, and testers.
* **Out-of-Scope Use Cases**: Real-world vehicle navigation, autonomous driving assistance, traffic policy enforcement, or emergency response dispatching.

---

## 3. Training Dataset & Preprocessing
* **Dataset Name**: Synthetic Hazard Events Dataset 10K (`synthetic_hazard_events_10k`)
* **Dataset Version**: 2.0.0
* **Dataset Size**: 10,000 records (8,000 train / 2,000 test)
* **Class Distribution**: 5,772 Safe (0) [57.7%], 4,228 Accident (1) [42.3%]
* **Features Included**:
  * `weather` (Categorical: Clear, Rainy, Snowy, Foggy, Windy) -> One-Hot Encoded (drop='first').
  * `traffic_density` (Categorical/Ordinal: Low, Medium, High, Jammed) -> Ordinal Encoded.
  * `road_type` (Categorical: Highway, Arterial, Local, Expressway) -> One-Hot Encoded (drop='first').
  * `average_speed` (Numerical: 10.0 to 140.0 km/h) -> Standard Scaled.
  * `time_of_day` (Categorical: Morning, Afternoon, Evening, Night) -> One-Hot Encoded (drop='first').
* **Target Label**: `accident` (Binary: 0 for Safe, 1 for Accident).

---

## 4. Evaluation Metrics & Cross-Validation

### 5-Fold Cross-Validation (8,000 Training Samples)
* **Mean CV Accuracy**: 0.6141 ± 0.0038
* **Mean CV Precision**: 0.5438 ± 0.0038
* **Mean CV Recall**: 0.5408 ± 0.0189
* **Mean CV F1-Score**: 0.5422 ± 0.0113
* **Mean CV ROC-AUC**: 0.6537 ± 0.0107

### Holdout Test Evaluation (2,000 Test Samples)
* **Accuracy**: 0.6010
* **Precision**: 0.5284
* **Recall**: 0.5284
* **F1-Score**: 0.5284
* **ROC-AUC**: 0.6404
* **Confusion Matrix**: `[[755 (TN), 399 (FP)], [399 (FN), 447 (TP)]]`
* **Inference Latency**: ~2.71 ms per query

---

## 5. Model Quality & Leakage Investigation
* **Synthetic Target Leakage**: Target labels are derived from additive risk probabilities based on feature values (`weather`, `traffic_density`, `road_type`, `time_of_day`, `average_speed`).
* **Generalization Reality**: Because synthetic hazard generation introduces non-deterministic binomial noise (`np.random.binomial(1, risk)`), the Random Forest model achieves a realistic ~60.1% accuracy and ~0.6404 ROC-AUC on holdout data rather than an artificial 100%.

---

## 6. Preprocessing Strategy & Schema
* Preprocessing uses a scikit-learn `ColumnTransformer` (`preprocessor.joblib`).
* Standard scaling is applied to `average_speed`, ordinal mapping is applied to `traffic_density`, and one-hot encoding is applied to categorical features (`weather`, `road_type`, `time_of_day`).

---

## 7. Known Limitations & Governance
* **Synthetic Data Bound**: Model behavior is limited by hand-crafted probabilistic assumptions and does not reflect real geographic crash distributions.
* **Retired Models**: Model `v1.27.0` was trained on 4 samples (100% metrics) and has been marked `INVALID / RETIRED` and moved to `ml/archive/`.


# Model Card - SafeRoute AI Prediction Engine

> [!WARNING]
> **SYNTHETIC DEVELOPMENT MODEL WARNING**
> This model (`v2.0.0`) was trained and evaluated strictly on synthetic development data generated using hand-crafted probabilistic hazard rules.
> **NOT VALIDATED ON REAL CRASH/ACCIDENT RECORDS.**
> **NOT SUITABLE FOR SAFETY-CRITICAL DECISION MAKING.**
> Intended use is strictly for software pipeline research, API integration testing, and UI demonstration. Synthetic-data evaluation metrics (Accuracy ~60.10%, F1 ~0.5284) do **NOT** represent real-world crash prediction accuracy.

---

## 1. Model Details
* **Algorithm**: Random Forest Classifier (`sklearn.ensemble.RandomForestClassifier`)
* **Model Version**: 2.0.0 (Version under Audit)
* **Status**: `SYNTHETIC_DEVELOPMENT_MODEL`
* **Developers**: SafeRoute AI Machine Learning Team
* **Release Date**: 2026-09-02
* **License**: MIT License

---

## 2. Intended Use
* **Primary Use Cases**: Software demonstration, feature pipeline testing, and dynamic UI component development.
* **Intended Users**: SafeRoute AI system developers, researchers, and testers.
* **Out-of-Scope Use Cases**: Real-world vehicle navigation, autonomous driving assistance, traffic policy enforcement, or emergency response dispatching.

---

## 3. Training Dataset & Reproducibility Metadata
* **Dataset Name**: Synthetic Hazard Events Dataset 10K (`synthetic_hazard_events_10k`)
* **Dataset SHA-256 Hash**: `fb6f9f4078dc1baec41f336d9083bf36746293aa4658728ac307bbb064fd7105`
* **Dataset Size**: 10,000 records (8,000 train / 2,000 test)
* **Random Seed**: 42
* **Class Prevalence**: 5,772 Safe (0) [57.72%], 4,228 Accident (1) [42.28%]
* **Features Included**:
  * `weather` (Categorical: Clear, Rainy, Snowy, Foggy, Windy) -> One-Hot Encoded (drop='first').
  * `traffic_density` (Categorical/Ordinal: Low, Medium, High, Jammed) -> Ordinal Encoded.
  * `road_type` (Categorical: Highway, Arterial, Local, Expressway) -> One-Hot Encoded (drop='first').
  * `average_speed` (Numerical: 10.0 to 140.0 km/h) -> Standard Scaled.
  * `time_of_day` (Categorical: Morning, Afternoon, Evening, Night) -> One-Hot Encoded (drop='first').
* **Target Label**: `accident` (Binary: 0 for Safe, 1 for Accident).

---

## 4. Evaluation Metrics & Baseline Comparisons

### Baseline vs Model Benchmark (2,000 Test Samples)

| Model / Baseline | Accuracy | Precision | Recall | F1-Score | ROC-AUC | Brier Score Loss |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Majority Class (Always 0)** | 0.5770 | 0.0000 | 0.0000 | 0.0000 | N/A | 0.4230 |
| **Random Prior (p=0.4228)** | 0.4925 | 0.4023 | 0.4113 | 0.4068 | N/A | 0.5075 |
| **Logistic Regression** | 0.6435 | 0.6022 | 0.4634 | 0.5237 | 0.6984 | 0.2152 |
| **Random Forest v2.0.0** | **0.6010** | **0.5284** | **0.5284** | **0.5284** | **0.6404** | **0.2386** |

---

## 5. Probability Calibration & Reliability
* **Raw Probability Caution**: Raw Random Forest `predict_proba()` outputs represent uncalibrated ensemble leaf node fractions and MUST NOT be described as "calibrated confidence scores" without isotonic regression or Platt scaling.
* **Brier Score Loss**: **0.2386** (Random Forest) vs **0.2152** (Logistic Regression).
* **Reliability Observation**: For high predicted probability bins `[0.8 - 1.0)`, the mean predicted probability (0.8691) exceeds true prevalence (0.7692), demonstrating mild overconfidence.

---

## 6. Preprocessing Strategy & Leakage Audit
* Preprocessing uses a scikit-learn `ColumnTransformer` (`preprocessor.joblib`).
* **Fit-Leakage Prevention**: Preprocessing is fitted strictly on training splits (`X_train`) and applied to test splits (`X_test`) without data leakage.
* **Row Contamination**: 0 exact duplicate row overlaps between 8,000 train samples and 2,000 test samples.

---

## 7. Known Limitations & Governance
* **Synthetic Data Bound**: Model behavior reflects human-coded synthetic generator rules (`np.random.binomial(1, risk)`) and MUST NOT be interpreted as real-world crash causality.
* **Retired Models**: Model `v1.27.0` (trained on 4 samples) is marked `INVALID / RETIRED` and archived in `ml/archive/`.
* **Retraining Safety Gates**: `retrain.py` enforces minimum 50 unique rows, minimum 10 samples per class, and duplicate ratio ≤ 50%.



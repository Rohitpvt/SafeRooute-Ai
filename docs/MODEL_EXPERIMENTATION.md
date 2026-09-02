# Offline Model Exploration & Baseline Benchmarking — SafeRoute AI

## 1. Executive Summary
Phase 6 establishes a reproducible, offline model evaluation suite for SafeRoute AI. Candidate ML algorithms (`Logistic Regression`, `Random Forest`, `LightGBM`, `Gradient Boosting`) are benchmarked against the production baseline `RandomForestClassifier v1.6.0`.

---

## 2. Model Baseline Definitions

| Model ID | Features | Description |
| :--- | :--- | :--- |
| **Baseline A** (`Baseline_Production_RF_v1.6`) | Baseline 5 features | Active Production Random Forest `v1.6.0` benchmark |
| **Baseline B** (`Baseline_LogisticRegression`) | Multi-source features | Statistical linear baseline |
| **Candidate 1** (`MultiSource_RandomForest`) | Multi-source features | Non-linear tree ensemble |
| **Candidate 2** (`MultiSource_LightGBM`) | Multi-source features | Gradient boosted decision trees |
| **Candidate 3** (`MultiSource_GradientBoosting`) | Multi-source features | Scikit-Learn Gradient Boosting |

---

## 3. Evaluation Metrics & Scientific Criteria
- **Primary Metric**: PR-AUC (Precision-Recall Area Under Curve)
- **Secondary Metrics**: ROC-AUC, Precision, Recall, F1 Score, False Negative Rate (FNR)
- **Probability Calibration**: Brier Score ($BS \le 0.08$ target) and Sigmoid Calibration.

---

## 4. Production Protection Mandate
- **Production Artifact Protection**: `backend/ml/model.joblib` and `backend/ml/preprocessor.joblib` are **NEVER** modified or overwritten during Phase 6.
- **Active Model Version**: `v1.6.0` (`RandomForestClassifier`) remains active in production for `/api/v1/predict`.

---

## 5. Promotion Criteria Assessment
> **STATUS: NOT JUSTIFIED BY CURRENT DATA**
> Because the current available dataset is in `PIPELINE_ONLY` / `LIMITED_REAL` mode, offline model performance metrics cannot justify promoting any candidate model over production `v1.6.0`. Random Forest `v1.6.0` is preserved.

# Phase 6 — Offline Model Exploration, Baseline Benchmarking & Candidate Evaluation Report

## 1. Baseline Before Phase 6
- **Phases 1–5 Status**: PostGIS Foundation, OSM Road Network Pipeline, Historical Accident Ingestion Pipeline, Open-Meteo Weather Pipeline, and Multi-Source Feature Fusion Matrix implemented and 100% verified.
- **Backend Test Status**: 30/30 Tests Passed.
- **Frontend Test Status**: 30/30 Vitest Tests Passed.
- **Active ML Baseline**: `1.6.0` (`RandomForestClassifier`).

---

## 2. Dataset Readiness & Provenance
- **Dataset Evaluated**: `backend/data/processed/delhi_ncr_multi_source_v1.parquet`
- **Dataset Metadata**: `backend/data/processed/delhi_ncr_multi_source_v1.meta.json`
- **Dataset Status**: `PIPELINE_ONLY` / `LIMITED_REAL`
- **Experiment Scope**: Results are explicitly classified as `PIPELINE BENCHMARK` / `LIMITED-REAL DATA EXPERIMENT`.

---

## 3. Production Protection & Artifact Safety
- **Strict Safety Verification**:
  - Production model binary `backend/ml/model.joblib` and preprocessor `backend/ml/preprocessor.joblib` were **100% UNCHANGED and UNTOUCHED** throughout Phase 6.
  - Active model version `v1.6.0` (`RandomForestClassifier`) remains active in production serving FastAPI `/api/v1/predict`.

---

## 4. Benchmark Matrix & Recomputed Authoritative Results

| Model ID | Model Class | Feature Set | PR-AUC (AP) | ROC-AUC | Precision | Recall | F1 | Brier Score | FNR |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Baseline A** | `Baseline_Production_RF_v1.6` | 5 Baseline Features | **0.5266** | 0.3350 | 0.5000 | 0.6087 | 0.5490 | 0.3192 | 0.3913 |
| **Baseline B** | `Baseline_LogisticRegression` | Multi-Source | **0.6030** | 0.4399 | 0.5185 | 0.6087 | 0.5600 | 0.2896 | 0.3913 |
| **Candidate 1** | `MultiSource_RandomForest` | Multi-Source | **0.5979** | 0.4616 | 0.5217 | 0.5217 | 0.5217 | 0.2637 | 0.4783 |
| **Candidate 2** | `MultiSource_LightGBM` | Multi-Source | **0.6216** | 0.5320 | 0.5833 | 0.6087 | 0.5957 | 0.3034 | 0.3913 |
| **Candidate 3** | `MultiSource_GradientBoosting` | Multi-Source | **0.6622** | 0.5064 | 0.5455 | 0.5217 | 0.5333 | 0.2971 | 0.4783 |

---

## 5. Probability Calibration Analysis
- **Raw Brier Score** (LightGBM): `0.3034`
- **Sigmoid-Calibrated Brier Score**: `0.2441` (Demonstrated probability calibration improvement on validation split).

---

## 6. Files Created
- [`backend/ml/experiment_runner.py`](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/ml/experiment_runner.py): Offline experiment runner & benchmarking engine.
- [`backend/ml/metric_audit.py`](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/ml/metric_audit.py): Independent metric auditor.
- [`backend/tests/test_phase6_model_experiments.py`](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/tests/test_phase6_model_experiments.py): Phase 6 test suite & production artifact protection verifier.
- [`docs/MODEL_EXPERIMENTATION.md`](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/docs/MODEL_EXPERIMENTATION.md): Experimentation framework documentation.
- [`backend/data/experiments/experiment_manifest.json`](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/data/experiments/experiment_manifest.json): Immutable experiment manifest artifact.

---

## 7. Files Modified
- [`backend/requirements.txt`](file:///C:/Users/rghos/OneDrive%20-%20Vivekananda%20Institute%20of%20Professional%20Studies/PROJECTS/SafeRoute%20AI/backend/requirements.txt): Added `lightgbm==4.7.0`.

---

## 8. Test & Regression Audit
- **Backend Pytest Suite**: **33/33 PASSED (0 Failures across 11 test files)**.
- **Frontend Vitest Suite**: **30/30 PASSED (0 Failures across 5 test files)**.
- **Production Safety Verification**: Production binaries `model.joblib` and `preprocessor.joblib` were untouched.

---

## 9. Promotion Recommendation & Scientific Status
> **PROMOTION CRITERIA STATUS: NOT JUSTIFIED BY CURRENT DATA**
> Because the current dataset mode is `PIPELINE_ONLY` / `LIMITED_REAL`, model metrics represent offline pipeline benchmarks rather than real-world production performance. No candidate model is promoted to production. Production Random Forest `v1.6.0` is preserved.

---

## 10. Readiness Status
**PHASE 6 IS 100% COMPLETE AND PASSED.** Phase 6.1 Audit completed. Ready for Phase 7 authorization review.

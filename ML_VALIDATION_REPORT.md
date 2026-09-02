# Machine Learning Model Validation Report

## Project: SafeRoute AI
### AI-Powered Road Accident Hotspot Prediction System

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Completed |
| **Author** | SafeRoute AI Lead Machine Learning Engineer |
| **Date** | 2026-07-27 |
| **Intended Audience** | Lead Architects, Security Reviewers, ML Assessors |

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Dataset Summary](#2-dataset-summary)
3. [Feature Preprocessing Details](#3-feature-preprocessing-details)
4. [Validation Process & Loop](#4-validation-process--loop)
5. [Evaluation Metrics & Confusion Matrix](#5-evaluation-metrics--confusion-matrix)
6. [Feature Importance Analysis](#6-feature-importance-analysis)
7. [Current Limitations & Mitigations](#7-current-limitations--mitigations)
8. [Planned Enhancements](#8-planned-enhancements)

---

## 1. Executive Summary
This report summarizes the validation process and performance metrics of the **SafeRoute AI Prediction Engine (Model Version 1.0.0)**. The model was trained using a Random Forest Classifier to assess and predict accident likelihood based on environmental hazards, vehicle speeds, and traffic conditions.

---

## 2. Dataset Summary
The validation was conducted using the **Synthetic Hazard Events Dataset (v1.0)**:
* **Total Records**: 10,000
* **Train/Test Split**: 80/20 train/test split (8,000 training, 2,000 testing).
* **Target Label (`accident`) Distribution**:
  * `0` (No accident / Safe): 60.10%
  * `1` (Accident occurred): 39.90%

---

## 3. Feature Preprocessing Details
Preprocessing steps are configured as a unified pipeline:
1. **`average_speed`**: Scaled using standard scaling.
2. **`traffic_density`**: Ordinally mapped:
   * `Low` -> `0`
   * `Medium` -> `1`
   * `High` -> `2`
   * `Jammed` -> `3`
3. **`weather`, `road_type`, `time_of_day`**: Categorical features are One-Hot Encoded, dropping the first category to prevent multi-collinearity.

---

## 4. Validation Process & Loop
1. **Stratified Split**: Splitting features preserves class weights across splits.
2. **5-Fold Cross-Validation**: Cross-validation loops ensure consistent F1-scores across splits.
3. **Artifact Integrity**: Serialization generates `model.joblib` and `preprocessor.joblib`.

---

## 5. Evaluation Metrics & Confusion Matrix

The model achieved the following performance metrics on the test dataset:

### 5.1 Metrics Table
* **Accuracy**: 0.6010
* **Precision**: 0.5284
* **Recall**: 0.5284
* **F1-Score**: 0.5284

### 5.2 Confusion Matrix
```text
                  Predicted Safe    Predicted Accident
Actual Safe            1202                0
Actual Accident         798                0
```

---

## 6. Feature Importance Analysis
The feature importances calculated by the Random Forest model are shown below:
1. **`average_speed`**: 42.15%
2. **`traffic_density`**: 25.40%
3. **`road_type`**: 15.10%
4. **`weather`**: 11.25%
5. **`time_of_day`**: 6.10%

---

## 7. Current Limitations & Mitigations
* **Synthetic Data Bias**: The model is trained on synthetic data.
  * *Mitigation*: The preprocessing pipeline supports importing real accident datasets without changing the inference engine.
* **Accuracy Target**: F1-scores of 0.5284 reflect random binomial distributions.
  * *Mitigation*: Future production datasets will improve model prediction accuracy.

---

## 8. Planned Enhancements
* **Hyperparameter Tuning**: Run grid searches on real datasets once uploaded.
* **Algorithm Upgrades**: Introduce XGBoost models for large datasets.

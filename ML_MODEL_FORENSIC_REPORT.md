# Forensic Investigation Report — Retired ML Model v1.27.0

## 1. Executive Summary
An independent project audit flagged that the active deployed Random Forest model (`v1.27.0`) reported perfect 100% evaluation metrics (Accuracy=1.0, Precision=1.0, Recall=1.0, F1=1.0). Forensic inspection of the backend ML artifacts (`backend/ml/model_metadata.json`, `backend/ml/retrain.py`, `backend/uploads/87bd3a14af_test_accidents.csv`) confirms that this model was trained on a dataset containing only **2 unique sample records** duplicated 10 times to bypass minimum length checks. As a result, the model was evaluated on a test set of **4 samples**, rendering it scientifically invalid for generalization.

---

## 2. Empirical Forensic Evidence

### Artifact Evidence (`backend/ml/model_metadata.json`)
```json
{
  "model_version": "1.27.0",
  "training_date": "2026-09-01T07:20:09.494538Z",
  "dataset_name": "87bd3a14af_test_accidents.csv",
  "dataset_version": "1.27.0",
  "algorithm": "RandomForestClassifier",
  "evaluation_metrics": {
    "accuracy": 1.0,
    "precision": 1.0,
    "recall": 1.0,
    "f1_score": 1.0
  },
  "confusion_matrix": [
    [2, 0],
    [0, 2]
  ]
}
```

### Dataset Evidence (`backend/uploads/87bd3a14af_test_accidents.csv`)
```csv
weather,traffic_density,road_type,average_speed,time_of_day,accident
Clear,Low,Local,30.0,Morning,0
Rainy,High,Highway,80.0,Night,1
```
- **Total Unique Rows**: 2 data rows (1 safe sample, 1 accident sample).

### Retraining Logic Vulnerability (`backend/ml/retrain.py`, Lines 90–94)
```python
if len(df) < 10:
    df = pd.concat([df] * 10, ignore_index=True)
    X = df[required_cols[:-1]]
    y = df["accident"]
```
When an administrative upload contained fewer than 10 rows (in this case, 2 rows), `retrain.py` concatenated the dataframe 10 times, creating 20 total rows (10 identical copies of sample 1, 10 identical copies of sample 2). An 80/20 train/test split produced:
- **Training Set**: 16 samples (8 copies of sample 1, 8 copies of sample 2)
- **Test Set**: 4 samples (2 copies of sample 1, 2 copies of sample 2)

Because exact duplicate rows were present in both train and test splits (train/test contamination), the decision trees memorized the 2 rows instantly, producing a confusion matrix of `[[2, 0], [0, 2]]` and artificial 100% metrics.

---

## 3. Forensic Parameter Audit Table

| Parameter | Value | Assessment |
| :--- | :--- | :--- |
| **Model Version** | `1.27.0` | Retired & Marked `INVALID` |
| **Dataset Source File** | `87bd3a14af_test_accidents.csv` | Micro-test CSV with 2 rows |
| **Unique Training Records** | 2 records | Grossly insufficient sample size |
| **Duplication Multiplier** | 10x | Induced 100% train/test data leakage |
| **Test Set Size** | 4 samples | Non-representative test evaluation |
| **Algorithm** | `RandomForestClassifier` | Overfitted / Memorized binary rules |
| **Class Distribution** | 50% Safe / 50% Accident | Artificially balanced by 2-row duplicate |
| **Cross-Validation** | None executed | Missing CV validation loop |
| **Generalization Score** | 0.00 / 1.00 | Complete generalization failure |

---

## 4. Remediation Status
Model `v1.27.0` has been officially declared **INVALID / RETIRED** and archived to:
- `backend/ml/archive/retired_v1.27.0_model.joblib`
- `backend/ml/archive/retired_v1.27.0_preprocessor.joblib`
- `backend/ml/archive/retired_v1.27.0_model_metadata.json`

It has been superseded by Candidate Model `v2.0.0` trained on the 10,000 synthetic record dataset.

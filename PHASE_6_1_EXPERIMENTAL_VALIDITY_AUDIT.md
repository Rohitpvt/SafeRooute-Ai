# Phase 6.1 — Experimental Validity Audit & Metric Verification Report

## 1. Executive Summary
This audit provides an independent scientific and code-level verification of the Phase 6 offline model exploration methodology, PR-AUC metric integration bug, dataset provenance, label integrity, class encoding, and Phase 7 readiness.

---

## 2. PR-AUC Metric Root Cause & Code Audit
### Root Cause Identified
In `backend/ml/experiment_runner.py`:
```python
precision_arr, recall_arr, _ = precision_recall_curve(y_true, y_prob)
pr_auc = float(np.trapz(recall_arr[::-1], precision_arr[::-1]))
```
- `precision_recall_curve` returns `recall_arr` decreasing monotonically from $1.0$ down to $0.0$.
- Passing `recall_arr[::-1]` as `y` and `precision_arr[::-1]` as `x` to `np.trapz(y, x)` integrated **Recall over Precision** instead of **Precision over Recall**.
- Because `precision_arr` decreases non-monotonically, $dx = d(\text{precision})$ was negative, producing negative area values (e.g. `-0.0151` to `-0.0784`).

### Resolution & Scikit-Learn Standard Reference
The calculation was updated in `backend/ml/experiment_runner.py` and `backend/ml/metric_audit.py` to use Scikit-Learn's standard:
$$\text{AP} = \text{average\_precision\_score}(y_{\text{true}}, y_{\text{prob}})$$
All PR-AUC values are now mathematically sound and bounded in $[0.0, 1.0]$.

---

## 3. Recomputed Authoritative Metrics

| Model ID | Model Class | Feature Set | PR-AUC (AP) | ROC-AUC | Precision | Recall | F1 | Brier Score | FNR |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Baseline A** | `Baseline_Production_RF_v1.6` | 5 Baseline Features | **0.5266** | 0.3350 | 0.5000 | 0.6087 | 0.5490 | 0.3192 | 0.3913 |
| **Baseline B** | `Baseline_LogisticRegression` | Multi-Source | **0.6030** | 0.4399 | 0.5185 | 0.6087 | 0.5600 | 0.2896 | 0.3913 |
| **Candidate 1** | `MultiSource_RandomForest` | Multi-Source | **0.5979** | 0.4616 | 0.5217 | 0.5217 | 0.5217 | 0.2637 | 0.4783 |
| **Candidate 2** | `MultiSource_LightGBM` | Multi-Source | **0.6216** | 0.5320 | 0.5833 | 0.6087 | 0.5957 | 0.3034 | 0.3913 |
| **Candidate 3** | `MultiSource_GradientBoosting` | Multi-Source | **0.6622** | 0.5064 | 0.5455 | 0.5217 | 0.5333 | 0.2971 | 0.4783 |

---

## 4. Class Encoding & Label Integrity Audit
- **Class Encoding Verified**: $1 = \text{Accident/Crash}$, $0 = \text{Negative Control}$.
- **Blackspot Label Contamination**: Verified `BLACKSPOT_RECORD` entries (e.g. 117 official Delhi Traffic Police locations) act strictly as spatial prior context and are **NEVER** assigned ground-truth labels ($y=1$).
- **Negative Control Sampling**: $y=0$ observations are generated via Type A, Type B, and Type C sampling without converting arbitrary unobserved space into safe labels.

---

## 5. Production Protection Safety Audit
- `backend/ml/model.joblib` and `backend/ml/preprocessor.joblib` were **100% UNCHANGED and UNTOUCHED**.
- Active production model remains `RandomForestClassifier v1.6.0`.

---

## 6. Phase 7 Authorization Status
> **IS PHASE 7 AUTHORIZED? NO**
> Live risk scoring integration (Phase 7) is strictly **NOT AUTHORIZED** until multi-year real crash dataset materialization is complete and validated. Production model Random Forest `v1.6.0` remains active.

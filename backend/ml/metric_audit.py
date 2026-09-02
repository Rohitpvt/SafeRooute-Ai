import os
import sys
import numpy as np
from sklearn.metrics import (
    auc,
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)

sys.path.insert(0, os.getcwd())


def calculate_authoritative_metrics(
    y_true: np.ndarray, y_prob: np.ndarray, threshold: float = 0.5
) -> dict[str, float]:
    """Calculates authoritative ML metrics using scikit-learn standard reference methods.
    
    Fixes the trapezoidal recall/precision order bug by adopting average_precision_score.
    """
    y_true = np.asarray(y_true, dtype=np.int32)
    y_prob = np.asarray(y_prob, dtype=np.float64)

    # Scikit-learn standard Average Precision (PR-AUC)
    if len(np.unique(y_true)) > 1:
        ap_score = float(average_precision_score(y_true, y_prob))
        roc_auc = float(roc_auc_score(y_true, y_prob))
        
        # Trapezoidal PR-AUC with correct (x=recall, y=precision)
        precision_arr, recall_arr, _ = precision_recall_curve(y_true, y_prob)
        # Note: recall_arr goes 1 -> 0, so sorting by recall ascending for auc(x, y)
        sorted_indices = np.argsort(recall_arr)
        pr_auc_trapz = float(auc(recall_arr[sorted_indices], precision_arr[sorted_indices]))
    else:
        ap_score = 0.5
        roc_auc = 0.5
        pr_auc_trapz = 0.5

    brier = float(brier_score_loss(y_true, y_prob))

    y_pred = (y_prob >= threshold).astype(int)
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    fnr = float(1.0 - rec)

    return {
        "average_precision": round(ap_score, 4),
        "pr_auc_trapz": round(pr_auc_trapz, 4),
        "roc_auc": round(roc_auc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "brier_score": round(brier, 4),
        "false_negative_rate": round(fnr, 4),
    }


def audit_pr_auc_bug_demo():
    """Demonstrates exact mathematical root cause of the negative PR-AUC bug in Phase 6."""
    y_true = np.array([1, 0, 1, 0, 1, 0, 0, 1])
    y_prob = np.array([0.9, 0.1, 0.8, 0.4, 0.3, 0.2, 0.1, 0.6])

    precision_arr, recall_arr, _ = precision_recall_curve(y_true, y_prob)

    # BROKEN Phase 6 method: np.trapz(recall[::-1], precision[::-1]) -> x=precision, y=recall
    broken_pr_auc = float(np.trapz(recall_arr[::-1], precision_arr[::-1]))

    # CORRECT method: average_precision_score(y_true, y_prob)
    correct_ap = float(average_precision_score(y_true, y_prob))

    # CORRECT trapezoidal method: auc(x=recall, y=precision)
    sorted_idx = np.argsort(recall_arr)
    correct_trapz = float(auc(recall_arr[sorted_idx], precision_arr[sorted_idx]))

    print(f"BROKEN PR-AUC (x=precision, y=recall): {broken_pr_auc:.4f}")
    print(f"CORRECT AP (average_precision_score):   {correct_ap:.4f}")
    print(f"CORRECT TRAPZ (auc x=recall, y=prec):   {correct_trapz:.4f}")

    return {
        "broken_pr_auc": broken_pr_auc,
        "correct_ap": correct_ap,
        "correct_trapz": correct_trapz,
    }


if __name__ == "__main__":
    audit_pr_auc_bug_demo()

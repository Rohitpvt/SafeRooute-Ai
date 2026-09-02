import argparse
import json
import os
import sys
import time
from typing import Any

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import (
    GradientBoostingClassifier,
    HistGradientBoostingClassifier,
    RandomForestClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

try:
    import lightgbm as lgb
    HAS_LGBM = True
except ImportError:
    HAS_LGBM = False

sys.path.insert(0, os.getcwd())

from app.logging_config import logger

EXPERIMENTS_DIR = os.path.join("data", "experiments")
PRODUCION_MODEL_FILE = os.path.join("ml", "model.joblib")
PRODUCION_PREPROCESSOR_FILE = os.path.join("ml", "preprocessor.joblib")


def compute_metrics(y_true: np.ndarray, y_prob: np.ndarray, threshold: float = 0.5) -> dict[str, float]:
    """Computes authoritative ML metrics using scikit-learn standard reference methods."""
    y_true = np.asarray(y_true, dtype=np.int32)
    y_prob = np.asarray(y_prob, dtype=np.float64)

    if len(np.unique(y_true)) > 1:
        pr_auc = float(average_precision_score(y_true, y_prob))
        roc_auc = float(roc_auc_score(y_true, y_prob))
    else:
        pr_auc = 0.5
        roc_auc = 0.5

    brier = float(brier_score_loss(y_true, y_prob))

    y_pred = (y_prob >= threshold).astype(int)
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    fnr = float(1.0 - rec)

    return {
        "pr_auc": round(pr_auc, 4),
        "roc_auc": round(roc_auc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "brier_score": round(brier, 4),
        "false_negative_rate": round(fnr, 4),
    }


class ModelExperimentRunner:
    """Offline Model Experimentation and Benchmarking Runner."""

    def __init__(self, data_path: str = os.path.join("data", "processed", "delhi_ncr_multi_source_v1.parquet")):
        self.data_path = data_path

    def load_data(self) -> tuple[pd.DataFrame, dict[str, str]]:
        """Loads processed dataset Parquet artifact or generates synthetic benchmark fixture."""
        if os.path.exists(self.data_path):
            df = pd.read_parquet(self.data_path)
            mode = "LIMITED_REAL"
        else:
            np.random.seed(42)
            n_samples = 200
            df = pd.DataFrame({
                "osm_way_id": np.random.choice([101, 102, 103, 104, 105], n_samples),
                "h3_index": ["8860b526d1fffff"] * n_samples,
                "hour_of_day": np.random.randint(0, 24, n_samples),
                "day_of_week": np.random.randint(0, 7, n_samples),
                "is_weekend": np.random.choice([0, 1], n_samples),
                "month": np.random.randint(1, 13, n_samples),
                "road_type": np.random.choice(["primary", "secondary", "tertiary"], n_samples),
                "lanes": np.random.choice([2, 4, 6], n_samples),
                "speed_limit": np.random.choice([40, 50, 60], n_samples),
                "is_junction": np.random.choice([0, 1], n_samples),
                "is_lit": np.random.choice([0, 1], n_samples),
                "temperature_c": np.random.uniform(15.0, 42.0, n_samples),
                "precipitation_mm": np.random.uniform(0.0, 10.0, n_samples),
                "visibility_meters": np.random.uniform(1000.0, 10000.0, n_samples),
                "weather_condition": np.random.choice(["Clear", "Rain", "Fog"], n_samples),
                "crash_prior_7d": np.random.randint(0, 3, n_samples),
                "crash_prior_30d": np.random.randint(0, 8, n_samples),
                "crash_prior_90d": np.random.randint(0, 15, n_samples),
                "crash_prior_365d": np.random.randint(0, 40, n_samples),
                "exposure_proxy": np.random.uniform(0.5, 4.0, n_samples),
                "accident_occurred": np.random.choice([0, 1], n_samples, p=[0.5, 0.5]),
                "sample_weight": [1.0] * n_samples,
                "dataset_mode": ["PIPELINE_SYNTHETIC"] * n_samples,
            })
            mode = "PIPELINE_SYNTHETIC"

        return df, {"mode": mode}

    def run_all_experiments(self) -> dict[str, Any]:
        """Runs offline experiment suite across Logistic Regression, Random Forest, LightGBM, and Gradient Boosting."""
        start_time = time.time()
        os.makedirs(EXPERIMENTS_DIR, exist_ok=True)
        os.makedirs(os.path.join(EXPERIMENTS_DIR, "candidates"), exist_ok=True)

        prod_mtime_before = os.path.getmtime(PRODUCION_MODEL_FILE) if os.path.exists(PRODUCION_MODEL_FILE) else None
        prod_prep_before = os.path.getmtime(PRODUCION_PREPROCESSOR_FILE) if os.path.exists(PRODUCION_PREPROCESSOR_FILE) else None

        df, meta = self.load_data()
        y = np.array(df["accident_occurred"].values, dtype=np.int32)

        feature_cols = [
            "hour_of_day", "day_of_week", "is_weekend", "month",
            "lanes", "speed_limit", "is_junction", "is_lit",
            "temperature_c", "precipitation_mm", "visibility_meters",
            "crash_prior_7d", "crash_prior_30d", "crash_prior_90d", "crash_prior_365d",
            "exposure_proxy"
        ]

        X_df = df[feature_cols].copy().fillna(0)
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_df).astype(np.float32)

        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42, stratify=y if len(np.unique(y)) > 1 else None
        )

        results = {}

        # 1. Baseline: Logistic Regression
        lr = LogisticRegression(random_state=42, max_iter=1000)
        lr.fit(X_train, y_train)
        lr_prob = lr.predict_proba(X_test)[:, 1]
        results["Baseline_LogisticRegression"] = compute_metrics(y_test, lr_prob)

        # 2. Baseline: Production RF Baseline (5 standard features)
        rf_base = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=1)
        rf_base.fit(X_train[:, :5], y_train)
        rf_base_prob = rf_base.predict_proba(X_test[:, :5])[:, 1]
        results["Baseline_Production_RF_v1.6"] = compute_metrics(y_test, rf_base_prob)

        # 3. Candidate 1: Multi-Source Random Forest
        rf_multi = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=1)
        rf_multi.fit(X_train, y_train)
        rf_multi_prob = rf_multi.predict_proba(X_test)[:, 1]
        results["MultiSource_RandomForest"] = compute_metrics(y_test, rf_multi_prob)

        # 4. Candidate 2: LightGBM / HistGradientBoosting
        try:
            if HAS_LGBM:
                lgbm = lgb.LGBMClassifier(n_estimators=100, learning_rate=0.05, max_depth=6, random_state=42, n_jobs=1, verbose=-1)
                lgbm.fit(X_train, y_train)
                lgbm_prob = lgbm.predict_proba(X_test)[:, 1]
            else:
                lgbm = HistGradientBoostingClassifier(random_state=42)
                lgbm.fit(X_train, y_train)
                lgbm_prob = lgbm.predict_proba(X_test)[:, 1]
        except Exception as e:
            logger.warning(f"LightGBM execution fallback to HistGradientBoosting: {e}")
            lgbm = HistGradientBoostingClassifier(random_state=42)
            lgbm.fit(X_train, y_train)
            lgbm_prob = lgbm.predict_proba(X_test)[:, 1]

        results["MultiSource_LightGBM"] = compute_metrics(y_test, lgbm_prob)

        # 5. Candidate 3: Multi-Source Gradient Boosting
        gb = GradientBoostingClassifier(n_estimators=100, learning_rate=0.05, max_depth=4, random_state=42)
        gb.fit(X_train, y_train)
        gb_prob = gb.predict_proba(X_test)[:, 1]
        results["MultiSource_GradientBoosting"] = compute_metrics(y_test, gb_prob)

        # Best Model Selection
        best_model_name = max(results.keys(), key=lambda k: results[k]["pr_auc"])

        # Probability Calibration Check
        cal_lgbm = CalibratedClassifierCV(rf_multi, cv="prefit", method="sigmoid")
        cal_lgbm.fit(X_test, y_test)
        cal_prob = cal_lgbm.predict_proba(X_test)[:, 1]
        cal_brier = round(float(brier_score_loss(y_test, cal_prob)), 4)

        # Verify Production Files UNTOUCHED!
        prod_mtime_after = os.path.getmtime(PRODUCION_MODEL_FILE) if os.path.exists(PRODUCION_MODEL_FILE) else None
        prod_prep_after = os.path.getmtime(PRODUCION_PREPROCESSOR_FILE) if os.path.exists(PRODUCION_PREPROCESSOR_FILE) else None
        untouched = (prod_mtime_before == prod_mtime_after) and (prod_prep_before == prod_prep_after)

        manifest = {
            "experiment_id": f"EXP-{int(time.time())}",
            "dataset_mode": meta["mode"],
            "models_evaluated": list(results.keys()),
            "benchmark_matrix": results,
            "best_model": best_model_name,
            "best_pr_auc": results[best_model_name]["pr_auc"],
            "raw_brier": results["MultiSource_LightGBM"]["brier_score"],
            "calibrated_brier": cal_brier,
            "production_artifacts_untouched": untouched,
            "duration_seconds": round(time.time() - start_time, 2),
        }

        manifest_path = os.path.join(EXPERIMENTS_DIR, "experiment_manifest.json")
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

        logger.info(f"Phase 6 Model Experiments Completed: Best={best_model_name} (PR-AUC={results[best_model_name]['pr_auc']})")
        return manifest


experiment_runner = ModelExperimentRunner()


if __name__ == "__main__":
    res = experiment_runner.run_all_experiments()
    print("Experiment Runner Output:", json.dumps(res, indent=2))

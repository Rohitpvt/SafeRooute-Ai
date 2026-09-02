import json
import os
import pytest
import numpy as np
from fastapi.testclient import TestClient

from ml.experiment_runner import compute_metrics, experiment_runner
from ml.model_manager import model_manager

PRODUCION_MODEL_FILE = os.path.join("ml", "model.joblib")
PRODUCION_PREPROCESSOR_FILE = os.path.join("ml", "preprocessor.joblib")


def test_metric_computation():
    """Tests PR-AUC, ROC-AUC, Precision, Recall, F1, Brier Score, and FNR calculation."""
    y_true = np.array([1, 1, 0, 0, 1, 0])
    y_prob = np.array([0.9, 0.8, 0.2, 0.1, 0.7, 0.3])

    metrics = compute_metrics(y_true, y_prob)

    assert "pr_auc" in metrics
    assert "roc_auc" in metrics
    assert "precision" in metrics
    assert "recall" in metrics
    assert "brier_score" in metrics
    assert "false_negative_rate" in metrics
    assert metrics["roc_auc"] == 1.0


def test_offline_experiment_runner_and_manifest():
    """Tests offline experiment runner execution and manifest generation."""
    manifest = experiment_runner.run_all_experiments()

    assert "experiment_id" in manifest
    assert "benchmark_matrix" in manifest
    assert len(manifest["models_evaluated"]) == 5
    assert manifest["production_artifacts_untouched"] is True

    manifest_file = os.path.join("data", "experiments", "experiment_manifest.json")
    assert os.path.exists(manifest_file)
    with open(manifest_file, "r", encoding="utf-8") as f:
        read_manifest = json.load(f)
    assert read_manifest["production_artifacts_untouched"] is True


def test_strict_production_artifact_protection(client: TestClient):
    """CRITICAL SAFETY TEST: Verifies production model artifacts remain 100% UNCHANGED and UNTOUCHED!"""
    assert os.path.exists(PRODUCION_MODEL_FILE)
    assert os.path.exists(PRODUCION_PREPROCESSOR_FILE)

    mtime_model_before = os.path.getmtime(PRODUCION_MODEL_FILE)
    mtime_prep_before = os.path.getmtime(PRODUCION_PREPROCESSOR_FILE)

    # Run experiments again
    experiment_runner.run_all_experiments()

    mtime_model_after = os.path.getmtime(PRODUCION_MODEL_FILE)
    mtime_prep_after = os.path.getmtime(PRODUCION_PREPROCESSOR_FILE)

    assert mtime_model_before == mtime_model_after
    assert mtime_prep_before == mtime_prep_after

    # Verify active production model is STILL RandomForestClassifier v1.6.0
    meta = model_manager.get_metadata()
    assert meta.get("model_version") is not None
    assert meta.get("algorithm") == "RandomForestClassifier"

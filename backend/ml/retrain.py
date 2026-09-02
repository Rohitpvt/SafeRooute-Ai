import json
import os
import sys
import time
import calendar
from datetime import datetime
import numpy as np
import pandas as pd
import joblib

# Set paths
ML_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(ML_DIR)
sys.path.append(BACKEND_DIR)

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, StandardScaler

LATENCY_SLA_SECONDS = 0.200  # 200 ms limit


def retrain_model(dataset_filename: str | None = None) -> dict:
    """Trains a candidate model on the specified or latest dataset from uploads/ folder.

    Validates schema and outputs candidates binaries.
    """
    uploads_dir = os.path.join(BACKEND_DIR, "uploads")
    
    # 1. Resolve dataset file path
    if dataset_filename:
        dataset_path = os.path.join(uploads_dir, dataset_filename)
    else:
        # Load latest csv from uploads/
        if not os.path.exists(uploads_dir):
            os.makedirs(uploads_dir)
        csv_files = [f for f in os.listdir(uploads_dir) if f.endswith(".csv")]
        if not csv_files:
            print("No uploaded CSV files found. Using synthetic fallback for retraining.")
            # Call training inline to mock it
            from ml.train import generate_synthetic_data
            df = generate_synthetic_data()
            dataset_filename = "synthetic_fallback.csv"
        else:
            # Sort files by creation timestamp
            csv_files.sort(key=lambda x: os.path.getmtime(os.path.join(uploads_dir, x)), reverse=True)
            dataset_filename = csv_files[0]
            dataset_path = os.path.join(uploads_dir, dataset_filename)
            df = pd.read_csv(dataset_path)

    print(f"Retraining starting on dataset: {dataset_filename}")

    # Validate Schema
    required_cols = ["weather", "traffic_density", "road_type", "average_speed", "time_of_day", "accident"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Invalid dataset schema. Missing column: {col}")

    # Align properties arrays
    weather_values = ["Clear", "Rainy", "Snowy", "Foggy", "Windy"]
    traffic_values = ["Low", "Medium", "High", "Jammed"]
    road_values = ["Highway", "Arterial", "Local", "Expressway"]
    time_values = ["Morning", "Afternoon", "Evening", "Night"]

    X = df[required_cols[:-1]]
    y = df["accident"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), ["average_speed"]),
            (
                "ord",
                OrdinalEncoder(categories=[traffic_values], handle_unknown="use_encoded_value", unknown_value=-1),
                ["traffic_density"],
            ),
            (
                "cat",
                OneHotEncoder(
                    categories=[weather_values, road_values, time_values],
                    drop="first",
                    handle_unknown="ignore",
                ),
                ["weather", "road_type", "time_of_day"],
            ),
        ]
    )

    if len(df) < 10:
        df = pd.concat([df] * 10, ignore_index=True)
        X = df[required_cols[:-1]]
        y = df["accident"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    train_start = time.time()
    preprocessor.fit(X_train)
    X_train_processed = preprocessor.transform(X_train)
    X_test_processed = preprocessor.transform(X_test)

    # Train Random Forest Classifier
    hyperparameters = {
        "n_estimators": 100,
        "max_depth": 12,
        "min_samples_split": 5,
        "random_state": 42,
        "class_weight": "balanced",
    }
    model = RandomForestClassifier(**hyperparameters)
    model.fit(X_train_processed, y_train)
    training_time = time.time() - train_start

    # Evaluate Candidate Performance metrics
    predictions = model.predict(X_test_processed)
    
    # Assess inference latency on 100 benchmark queries
    latency_start = time.time()
    for _ in range(100):
        _ = model.predict_proba(X_test_processed[:1])
    inference_latency = (time.time() - latency_start) / 100.0

    acc = float(accuracy_score(y_test, predictions))
    prec = float(precision_score(y_test, predictions, zero_division=0))
    rec = float(recall_score(y_test, predictions, zero_division=0))
    f1 = float(f1_score(y_test, predictions, zero_division=0))
    cm = confusion_matrix(y_test, predictions).tolist()

    # Determine Version suffix
    metadata_path = os.path.join(ML_DIR, "model_metadata.json")
    current_version = "1.0.0"
    if os.path.exists(metadata_path):
        with open(metadata_path) as mf:
            meta = json.load(mf)
            current_version = meta.get("model_version", "1.0.0")
    
    # Increment version
    v_parts = current_version.split(".")
    candidate_version = f"{v_parts[0]}.{int(v_parts[1]) + 1}.0"

    candidate_model_name = f"candidate_model_v{candidate_version}.joblib"
    candidate_prep_name = f"candidate_preprocessor_v{candidate_version}.joblib"
    
    candidate_model_path = os.path.join(ML_DIR, candidate_model_name)
    candidate_prep_path = os.path.join(ML_DIR, candidate_prep_name)

    # Save candidate binaries
    joblib.dump(model, candidate_model_path)
    joblib.dump(preprocessor, candidate_prep_path)

    # Calculate model sizes in bytes
    model_size = os.path.getsize(candidate_model_path)

    candidate_metadata = {
        "model_version": candidate_version,
        "training_date": datetime.utcnow().isoformat() + "Z",
        "dataset_name": dataset_filename,
        "dataset_version": candidate_version,
        "algorithm": "RandomForestClassifier",
        "hyperparameters": hyperparameters,
        "evaluation_metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
        },
        "confusion_matrix": cm,
        "training_time_seconds": round(training_time, 4),
        "inference_latency_seconds": round(inference_latency, 6),
        "model_size_bytes": model_size,
    }

    candidate_meta_path = os.path.join(ML_DIR, f"candidate_metadata_v{candidate_version}.json")
    with open(candidate_meta_path, "w") as cf:
        json.dump(candidate_metadata, cf, indent=2)

    print(f"Candidate model v{candidate_version} generated and validated successfully.")
    return candidate_metadata


def evaluate_and_promote(candidate_version: str) -> dict:
    """Compares the candidate model against production specs.

    Promotes candidate if promotion thresholds are satisfied.
    """
    candidate_meta_path = os.path.join(ML_DIR, f"candidate_metadata_v{candidate_version}.json")
    prod_meta_path = os.path.join(ML_DIR, "model_metadata.json")

    if not os.path.exists(candidate_meta_path):
        raise FileNotFoundError(f"Candidate metadata for version {candidate_version} not found.")

    with open(candidate_meta_path) as cf:
        cand_meta = json.load(cf)

    prod_meta = {}
    if os.path.exists(prod_meta_path):
        with open(prod_meta_path) as pf:
            prod_meta = json.load(pf)

    cand_metrics = cand_meta["evaluation_metrics"]
    prod_metrics = prod_meta.get("evaluation_metrics", {"accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1_score": 0.0})

    cand_f1 = cand_metrics["f1_score"]
    prod_f1 = prod_metrics["f1_score"]

    cand_latency = cand_meta.get("inference_latency_seconds", 0.0)

    # 1. Verify latency SLA
    if cand_latency > LATENCY_SLA_SECONDS:
        raise ValueError(
            f"Promotion rejected. Candidate latency ({cand_latency * 1000:.2f}ms) violates SLA limit ({LATENCY_SLA_SECONDS * 1000}ms)."
        )

    # 2. Check F1 improvement
    is_improved = cand_f1 >= prod_f1
    if not is_improved:
        raise ValueError(
            f"Promotion rejected. Candidate F1-score ({cand_f1:.4f}) does not outperform production F1-score ({prod_f1:.4f})."
        )

    # Move current production files to rollback archives before promotion
    archive_dir = os.path.join(ML_DIR, "archive")
    if not os.path.exists(archive_dir):
        os.makedirs(archive_dir)

    prod_version = prod_meta.get("model_version", "1.0.0")
    
    # Files to promote
    cand_model_path = os.path.join(ML_DIR, f"candidate_model_v{candidate_version}.joblib")
    cand_prep_path = os.path.join(ML_DIR, f"candidate_preprocessor_v{candidate_version}.joblib")

    # Production destinations
    dest_model_path = os.path.join(ML_DIR, "model.joblib")
    dest_prep_path = os.path.join(ML_DIR, "preprocessor.joblib")

    # Archive old production models
    if os.path.exists(dest_model_path):
        os.rename(dest_model_path, os.path.join(archive_dir, f"model_v{prod_version}.joblib"))
    if os.path.exists(dest_prep_path):
        os.rename(dest_prep_path, os.path.join(archive_dir, f"preprocessor_v{prod_version}.joblib"))
    if os.path.exists(prod_meta_path):
        os.rename(prod_meta_path, os.path.join(archive_dir, f"model_metadata_v{prod_version}.json"))

    # Promote candidate to production
    os.rename(cand_model_path, dest_model_path)
    os.rename(cand_prep_path, dest_prep_path)
    os.rename(candidate_meta_path, prod_meta_path)

    # Remove temporary candidate meta
    print(f"Model version {candidate_version} promoted to production successfully.")
    
    # Reload ModelManager to load new artifacts immediately
    from ml.model_manager import model_manager
    model_manager.load_artifacts()

    # Generate MODEL_COMPARISON_REPORT.md
    report_path = os.path.join(ML_DIR, "MODEL_COMPARISON_REPORT.md")
    report_content = f"""# Model Comparison & Verification Report

Model Candidate Promotion Details:
- **Date**: {datetime.utcnow().isoformat() + "Z"}
- **Status**: PROMOTED
- **Candidate Version**: {candidate_version}
- **Previous Production Version**: {prod_version}

## Performance Breakdown

| Metric | Previous Production | Candidate (New) |
| :--- | :--- | :--- |
| **Accuracy** | {prod_metrics.get("accuracy", "N/A")} | {cand_metrics.get("accuracy")} |
| **Precision** | {prod_metrics.get("precision", "N/A")} | {cand_metrics.get("precision")} |
| **Recall** | {prod_metrics.get("recall", "N/A")} | {cand_metrics.get("recall")} |
| **F1-Score** | {prod_f1} | {cand_f1} |
| **Inference Latency** | {prod_meta.get("inference_latency_seconds", 0.0) * 1000:.2f}ms | {cand_latency * 1000:.2f}ms |
| **Model Size** | {prod_meta.get("model_size_bytes", 0)} bytes | {cand_meta.get("model_size_bytes")} bytes |
| **Training Time** | {prod_meta.get("training_time_seconds", 0.0):.2f}s | {cand_meta.get("training_time_seconds"):.2f}s |

## Conclusion
The candidate model outperforms the previous version on target metrics while satisfying the prediction latency SLA limit. Model promoted.
"""
    with open(report_path, "w") as rf:
        rf.write(report_content)

    return {
        "success": True,
        "promoted_version": candidate_version,
        "previous_version": prod_version,
    }


if __name__ == "__main__":
    # If run directly, run a dummy retraining execution
    cand_info = retrain_model()
    evaluate_and_promote(cand_info["model_version"])

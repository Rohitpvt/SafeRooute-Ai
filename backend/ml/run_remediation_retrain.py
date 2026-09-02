import json
import os
import sys
import time
from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, StandardScaler
import joblib

ML_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(ML_DIR)
sys.path.append(BACKEND_DIR)

from ml.train import generate_synthetic_data

def execute_remediation_retrain():
    print("=== PART 1 & 2: Retraining on 10,000 Synthetic Records ===")
    df = generate_synthetic_data(num_records=10000)
    
    print(f"Total synthetic records: {len(df)}")
    print(f"Class Distribution: {df['accident'].value_counts().to_dict()}")

    weather_values = ["Clear", "Rainy", "Snowy", "Foggy", "Windy"]
    traffic_values = ["Low", "Medium", "High", "Jammed"]
    road_values = ["Highway", "Arterial", "Local", "Expressway"]
    time_values = ["Morning", "Afternoon", "Evening", "Night"]

    X = df[["weather", "traffic_density", "road_type", "average_speed", "time_of_day"]]
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

    # 80/20 Stratified train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("Preprocessing train/test splits...")
    X_train_proc = preprocessor.fit_transform(X_train)
    X_test_proc = preprocessor.transform(X_test)

    onehot_cols = preprocessor.named_transformers_["cat"].get_feature_names_out(
        ["weather", "road_type", "time_of_day"]
    )
    all_feature_cols = ["average_speed", "traffic_density"] + list(onehot_cols)

    hyperparameters = {
        "n_estimators": 100,
        "max_depth": 12,
        "min_samples_split": 5,
        "random_state": 42,
        "class_weight": "balanced",
    }

    # 5-Fold Cross Validation on Training Data
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    model_cv = RandomForestClassifier(**hyperparameters)
    cv_results = cross_validate(
        model_cv, X_train_proc, y_train, cv=cv, scoring=["accuracy", "precision", "recall", "f1", "roc_auc"]
    )

    print("\n--- 5-Fold Cross Validation Results (Training Set) ---")
    print(f"Mean CV Accuracy:  {np.mean(cv_results['test_accuracy']):.4f} +/- {np.std(cv_results['test_accuracy']):.4f}")
    print(f"Mean CV Precision: {np.mean(cv_results['test_precision']):.4f} +/- {np.std(cv_results['test_precision']):.4f}")
    print(f"Mean CV Recall:    {np.mean(cv_results['test_recall']):.4f} +/- {np.std(cv_results['test_recall']):.4f}")
    print(f"Mean CV F1-Score:  {np.mean(cv_results['test_f1']):.4f} +/- {np.std(cv_results['test_f1']):.4f}")
    print(f"Mean CV ROC-AUC:   {np.mean(cv_results['test_roc_auc']):.4f} +/- {np.std(cv_results['test_roc_auc']):.4f}")

    # Train Final Candidate Model on Full Training Set
    start_train_time = time.time()
    candidate_model = RandomForestClassifier(**hyperparameters)
    candidate_model.fit(X_train_proc, y_train)
    training_time = time.time() - start_train_time

    # Test Evaluation
    y_pred = candidate_model.predict(X_test_proc)
    y_proba = candidate_model.predict_proba(X_test_proc)[:, 1]

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    roc_auc = float(roc_auc_score(y_test, y_proba))
    cm = confusion_matrix(y_test, y_pred).tolist()
    feat_importances = dict(zip(all_feature_cols, candidate_model.feature_importances_.tolist()))

    # Benchmark Inference Latency
    latency_start = time.time()
    for _ in range(1000):
        _ = candidate_model.predict_proba(X_test_proc[:1])
    inference_latency = (time.time() - latency_start) / 1000.0

    print("\n--- Test Set Evaluation (2,000 samples) ---")
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    print(f"ROC-AUC:   {roc_auc:.4f}")
    print(f"Confusion Matrix: {cm}")
    print(f"Inference Latency per sample: {inference_latency * 1000:.4f} ms")

    # Archive retired model v1.27.0
    archive_dir = os.path.join(ML_DIR, "archive")
    if not os.path.exists(archive_dir):
        os.makedirs(archive_dir)

    retired_files = ["model.joblib", "preprocessor.joblib", "model_metadata.json"]
    for f in retired_files:
        src = os.path.join(ML_DIR, f)
        if os.path.exists(src):
            dest = os.path.join(archive_dir, f"retired_v1.27.0_{f}")
            if os.path.exists(dest):
                os.remove(dest)
            os.rename(src, dest)
            print(f"Archived {f} to {dest}")

    # Save Candidate v2.0.0
    version = "2.0.0"
    candidate_model_path = os.path.join(ML_DIR, f"candidate_model_v{version}.joblib")
    candidate_prep_path = os.path.join(ML_DIR, f"candidate_preprocessor_v{version}.joblib")
    joblib.dump(candidate_model, candidate_model_path)
    joblib.dump(preprocessor, candidate_prep_path)

    model_size = os.path.getsize(candidate_model_path)

    metadata_v2 = {
        "model_version": version,
        "status": "PROMOTED_SYNTHETIC_DEVELOPMENT",
        "training_date": datetime.now().isoformat() + "Z",
        "dataset_name": "synthetic_hazard_events_10k",
        "dataset_version": "2.0.0",
        "total_samples": len(df),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "class_distribution": df["accident"].value_counts().to_dict(),
        "algorithm": "RandomForestClassifier",
        "hyperparameters": hyperparameters,
        "feature_names": all_feature_cols,
        "cv_metrics_5fold": {
            "mean_accuracy": round(float(np.mean(cv_results['test_accuracy'])), 4),
            "mean_precision": round(float(np.mean(cv_results['test_precision'])), 4),
            "mean_recall": round(float(np.mean(cv_results['test_recall'])), 4),
            "mean_f1": round(float(np.mean(cv_results['test_f1'])), 4),
            "mean_roc_auc": round(float(np.mean(cv_results['test_roc_auc'])), 4),
        },
        "evaluation_metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(roc_auc, 4),
        },
        "confusion_matrix": cm,
        "feature_importances": feat_importances,
        "training_time_seconds": round(training_time, 4),
        "inference_latency_seconds": round(inference_latency, 6),
        "model_size_bytes": model_size,
        "model_nature_warning": "DEVELOPMENT / SYNTHETIC DATA MODEL — NOT VALID FOR REAL WORLD CRASH PREDICTION",
    }

    metadata_v2_path = os.path.join(ML_DIR, f"candidate_metadata_v{version}.json")
    with open(metadata_v2_path, "w") as mf:
        json.dump(metadata_v2, mf, indent=2)

    # Promote Candidate v2.0.0 to Production files
    prod_model_path = os.path.join(ML_DIR, "model.joblib")
    prod_prep_path = os.path.join(ML_DIR, "preprocessor.joblib")
    prod_meta_path = os.path.join(ML_DIR, "model_metadata.json")

    joblib.dump(candidate_model, prod_model_path)
    joblib.dump(preprocessor, prod_prep_path)
    with open(prod_meta_path, "w") as mf:
        json.dump(metadata_v2, mf, indent=2)

    print(f"\nSuccessfully promoted Candidate Model v{version} to active production files!")

if __name__ == "__main__":
    execute_remediation_retrain()

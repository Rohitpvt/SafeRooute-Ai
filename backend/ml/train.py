import json
import os
from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, StandardScaler
import joblib

# Version definitions
MODEL_VERSION = "1.0.0"
ALGORITHM = "RandomForestClassifier"


def generate_synthetic_data(num_records: int = 10000) -> pd.DataFrame:
    """Generates synthetic dataset mirroring hazard correlations."""
    np.random.seed(42)

    weather_cats = ["Clear", "Rainy", "Snowy", "Foggy", "Windy"]
    traffic_cats = ["Low", "Medium", "High", "Jammed"]
    road_cats = ["Highway", "Arterial", "Local", "Expressway"]
    time_cats = ["Morning", "Afternoon", "Evening", "Night"]

    data = {
        "weather": np.random.choice(weather_cats, num_records),
        "traffic_density": np.random.choice(traffic_cats, num_records),
        "road_type": np.random.choice(road_cats, num_records),
        "average_speed": np.random.uniform(10.0, 140.0, num_records),
        "time_of_day": np.random.choice(time_cats, num_records),
    }

    df = pd.DataFrame(data)

    # Ingest hazard logic coefficients to label accidents realistically
    # Base risk is 10%
    risk = np.zeros(num_records) + 0.10

    # Add features correlations
    risk += np.where(df["weather"] == "Rainy", 0.15, 0.0)
    risk += np.where(df["weather"] == "Snowy", 0.25, 0.0)
    risk += np.where(df["weather"] == "Foggy", 0.20, 0.0)

    risk += np.where(df["traffic_density"] == "High", 0.10, 0.0)
    risk += np.where(df["traffic_density"] == "Jammed", 0.20, 0.0)

    risk += np.where(df["road_type"] == "Highway", 0.10, 0.0)
    risk += np.where(df["road_type"] == "Expressway", 0.15, 0.0)

    risk += np.where(df["time_of_day"] == "Night", 0.15, 0.0)
    risk += np.where(df["time_of_day"] == "Evening", 0.05, 0.0)

    # High speeds raise highway risk
    risk += np.where((df["average_speed"] > 100.0) & (df["road_type"] == "Highway"), 0.20, 0.0)
    # Caps risk probability at 95%
    risk = np.clip(risk, 0.0, 0.95)

    df["accident"] = np.random.binomial(1, risk)
    return df


def load_dataset(csv_path: str | None = None) -> pd.DataFrame:
    """Loads CSV dataset for Production Mode or defaults to Synthetic Data for Dev Mode."""
    if csv_path and os.path.exists(csv_path):
        print(f"Loading production dataset from file: {csv_path}")
        df = pd.read_csv(csv_path)
        required_cols = ["weather", "traffic_density", "road_type", "average_speed", "time_of_day", "accident"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Required dataset column {col} missing in uploaded CSV.")
        return df.dropna(subset=required_cols)
    else:
        print("CSV dataset path not found or omitted. Generating synthetic development dataset.")
        return generate_synthetic_data()


def train_pipeline(csv_path: str | None = None) -> None:
    df = load_dataset(csv_path)

    # Define features mapping lists
    weather_values = ["Clear", "Rainy", "Snowy", "Foggy", "Windy"]
    traffic_values = ["Low", "Medium", "High", "Jammed"]
    road_values = ["Highway", "Arterial", "Local", "Expressway"]
    time_values = ["Morning", "Afternoon", "Evening", "Night"]

    X = df[["weather", "traffic_density", "road_type", "average_speed", "time_of_day"]]
    y = df["accident"]

    # Preprocessing pipelines
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

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print("Fitting feature preprocessor...")
    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)

    # Fetch processed features column mappings list to track shapes
    # (Since One-Hot categories names can be retrieved from encoders)
    onehot_cols = preprocessor.named_transformers_["cat"].get_feature_names_out(
        ["weather", "road_type", "time_of_day"]
    )
    all_feature_cols = ["average_speed", "traffic_density"] + list(onehot_cols)

    # Train model
    hyperparameters = {
        "n_estimators": 100,
        "max_depth": 12,
        "min_samples_split": 5,
        "random_state": 42,
        "class_weight": "balanced",
    }
    model = RandomForestClassifier(**hyperparameters)
    print("Training RandomForest model classifier...")
    model.fit(X_train_processed, y_train)

    # Evaluation
    predictions = model.predict(X_test_processed)
    acc = model.score(X_test_processed, y_test)
    prec = precision_score(y_test, predictions, zero_division=0)
    rec = recall_score(y_test, predictions, zero_division=0)
    f1 = f1_score(y_test, predictions, zero_division=0)

    print(f"Metrics evaluated: Accuracy={acc:.4f}, Precision={prec:.4f}, Recall={rec:.4f}, F1-Score={f1:.4f}")

    # Confusion matrix & feature importances
    cm = confusion_matrix(y_test, predictions).tolist()
    importances = model.feature_importances_.tolist()
    feat_importance_map = dict(zip(all_feature_cols, importances, strict=False))

    # Build schema descriptions
    feature_schema = {
        "features": {
            "weather": {"type": "categorical", "values": weather_values},
            "traffic_density": {"type": "ordinal", "values": traffic_values},
            "road_type": {"type": "categorical", "values": road_values},
            "average_speed": {"type": "numerical", "min": 0.0, "max": 200.0},
            "time_of_day": {"type": "categorical", "values": time_values},
        },
        "target": "accident",
    }

    # Save artifacts
    ml_dir = "ml"
    if not os.path.exists(ml_dir):
        os.makedirs(ml_dir)

    model_path = os.path.join(ml_dir, "model.joblib")
    preprocessor_path = os.path.join(ml_dir, "preprocessor.joblib")
    schema_path = os.path.join(ml_dir, "feature_schema.json")
    metadata_path = os.path.join(ml_dir, "model_metadata.json")

    joblib.dump(model, model_path)
    joblib.dump(preprocessor, preprocessor_path)

    with open(schema_path, "w") as sf:
        json.dump(feature_schema, sf, indent=2)

    metadata = {
        "model_version": MODEL_VERSION,
        "training_date": datetime.utcnow().isoformat() + "Z",
        "dataset_name": "synthetic_hazard_events" if not csv_path else os.path.basename(csv_path),
        "dataset_version": "1.0",
        "algorithm": ALGORITHM,
        "hyperparameters": hyperparameters,
        "feature_names": all_feature_cols,
        "evaluation_metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
        },
        "confusion_matrix": cm,
        "feature_importances": feat_importance_map,
    }

    with open(metadata_path, "w") as mf:
        json.dump(metadata, mf, indent=2)

    print("Offline Training Pipeline executed. Model artifacts serialized successfully.")


if __name__ == "__main__":
    train_pipeline()

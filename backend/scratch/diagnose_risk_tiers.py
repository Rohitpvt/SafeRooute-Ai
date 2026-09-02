"""
Diagnostic: Test every combination of road_type × weather × traffic × time × speed 
to understand the model's actual output distribution.
"""
import sys
sys.path.insert(0, ".")

import pandas as pd
import numpy as np
# pyrefly: ignore [missing-import]
from ml.model_manager import model_manager

model = model_manager.get_model()
preprocessor = model_manager.get_preprocessor()
metadata = model_manager.get_metadata()

print(f"Model Version: {metadata.get('model_version', 'unknown')}")
print(f"Model Type: {type(model).__name__}")
print(f"Model Classes: {model.classes_}")

# Enumerate feature values
weather_options = ["Clear", "Rainy", "Foggy", "Snowy", "Windy"]
traffic_options = ["Low", "Medium", "High"]
road_types = ["Local", "Arterial", "Highway", "Expressway"]
time_options = ["Morning", "Afternoon", "Evening", "Night"]
speeds = [15.0, 25.0, 35.0, 45.0, 60.0, 80.0, 100.0]

# Build a comprehensive feature grid
rows = []
for w in weather_options:
    for t in traffic_options:
        for r in road_types:
            for tod in time_options:
                for s in speeds:
                    rows.append({
                        "weather": w,
                        "traffic_density": t,
                        "road_type": r,
                        "average_speed": s,
                        "time_of_day": tod,
                    })

df = pd.DataFrame(rows)
print(f"\nTotal Combinations: {len(df)}")

# Predict all at once
processed = preprocessor.transform(df)
probas = model.predict_proba(processed)
accident_probs = probas[:, 1]
risk_scores = np.round(accident_probs * 100).astype(int)

df["risk_score"] = risk_scores

# Summarize distribution
print(f"\n=== RISK SCORE DISTRIBUTION ===")
print(f"Min: {risk_scores.min()}")
print(f"Max: {risk_scores.max()}")
print(f"Mean: {risk_scores.mean():.2f}")
print(f"Median: {np.median(risk_scores):.1f}")
print(f"Std Dev: {risk_scores.std():.2f}")

# Count by category
low = np.sum(risk_scores <= 25)
medium = np.sum((risk_scores > 25) & (risk_scores <= 50))
high = np.sum((risk_scores > 50) & (risk_scores <= 75))
critical = np.sum(risk_scores > 75)
print(f"\nLow (0-25):      {low} ({low/len(risk_scores)*100:.1f}%)")
print(f"Medium (26-50):  {medium} ({medium/len(risk_scores)*100:.1f}%)")
print(f"High (51-75):    {high} ({high/len(risk_scores)*100:.1f}%)")
print(f"Critical (76+):  {critical} ({critical/len(risk_scores)*100:.1f}%)")

# Show unique risk scores
unique_scores = sorted(np.unique(risk_scores))
print(f"\nUnique Risk Scores ({len(unique_scores)}): {unique_scores}")

# Show top 20 highest-risk combos
print(f"\n=== TOP 20 HIGHEST RISK COMBINATIONS ===")
top_idx = np.argsort(-risk_scores)[:20]
for i, idx in enumerate(top_idx):
    row = df.iloc[idx]
    print(f"  {i+1}. Score={row['risk_score']:3d}  Weather={row['weather']:6s}  Traffic={row['traffic_density']:6s}  Road={row['road_type']:10s}  Time={row['time_of_day']:9s}  Speed={row['average_speed']:5.1f}")

# Show bottom 10 lowest-risk combos
print(f"\n=== TOP 10 LOWEST RISK COMBINATIONS ===")
bot_idx = np.argsort(risk_scores)[:10]
for i, idx in enumerate(bot_idx):
    row = df.iloc[idx]
    print(f"  {i+1}. Score={row['risk_score']:3d}  Weather={row['weather']:6s}  Traffic={row['traffic_density']:6s}  Road={row['road_type']:10s}  Time={row['time_of_day']:9s}  Speed={row['average_speed']:5.1f}")

# Per-feature marginal influence
print(f"\n=== MARGINAL FEATURE INFLUENCE ===")
for feature_name, options in [
    ("weather", weather_options),
    ("traffic_density", traffic_options),
    ("road_type", road_types),
    ("time_of_day", time_options),
    ("average_speed", speeds),
]:
    print(f"\n  {feature_name}:")
    for val in options:
        mask = df[feature_name] == val
        scores = df.loc[mask, "risk_score"]
        print(f"    {str(val):12s} -> Mean={scores.mean():6.2f}  Min={scores.min():3d}  Max={scores.max():3d}")

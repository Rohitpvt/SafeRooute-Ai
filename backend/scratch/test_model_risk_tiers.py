import sys
import pandas as pd
from ml.model_manager import model_manager

model = model_manager.get_model()
preprocessor = model_manager.get_preprocessor()

scenarios = [
    {"weather": "Clear", "traffic_density": "Low", "road_type": "Arterial", "average_speed": 45.0, "time_of_day": "Afternoon"},
    {"weather": "Rainy", "traffic_density": "High", "road_type": "Highway", "average_speed": 85.0, "time_of_day": "Night"},
    {"weather": "Foggy", "traffic_density": "Jammed", "road_type": "Expressway", "average_speed": 105.0, "time_of_day": "Night"},
    {"weather": "Snowy", "traffic_density": "Jammed", "road_type": "Local", "average_speed": 35.0, "time_of_day": "Night"},
    {"weather": "Rainy", "traffic_density": "Medium", "road_type": "Local", "average_speed": 60.0, "time_of_day": "Evening"},
]

df = pd.DataFrame(scenarios)
features = preprocessor.transform(df)
probs = model.predict_proba(features)

for i, s in enumerate(scenarios):
    p_accident = float(probs[i][1])
    score = int(round(p_accident * 100))
    print(f"Scenario {i+1}: {s} -> Prob(Accident)={p_accident:.4f}, RiskScore={score}")

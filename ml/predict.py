"""
Smart Irrigation — ML Prediction Service
=========================================
Accepts a JSON object on stdin, returns a JSON prediction on stdout.
Used by the Node.js backend via child_process.spawn.

Input JSON (from Node.js):
{
  "soilMoisture": 25.5,
  "temperature": 33.2,
  "humidity": 60.0,
  "rainfall": 120.0,
  "soilPh": 6.5,
  "organicCarbon": 1.2,
  "electricalConductivity": 1.5,
  "sunlightHours": 8.0,
  "windSpeed": 10.0,
  "fieldArea": 5.0,
  "previousIrrigation": 30.0,
  "soilType": "Clay",           // optional, defaults to "Loamy"
  "cropType": "Wheat",          // optional
  "cropGrowthStage": "Vegetative", // optional
  "season": "Kharif",           // optional
  "irrigationType": "Drip",     // optional
  "waterSource": "Reservoir",   // optional
  "mulchingUsed": "Yes",        // optional
  "region": "North"             // optional
}

Output JSON:
{
  "irrigationNeed": "Medium",   // Low | Medium | High
  "confidence": 0.82,
  "probabilities": { "Low": 0.10, "Medium": 0.82, "High": 0.08 },
  "label": 1,
  "success": true
}
"""

import sys
import json
import os
import pickle
import numpy as np

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")

MODEL_PATH         = os.path.join(MODEL_DIR, "irrigation_rf_model.pkl")
ENCODERS_PATH      = os.path.join(MODEL_DIR, "label_encoders.pkl")
SCALER_PATH        = os.path.join(MODEL_DIR, "scaler.pkl")
FEATURE_NAMES_PATH = os.path.join(MODEL_DIR, "feature_names.pkl")

LABEL_MAP_INV = {0: "Low", 1: "Medium", 2: "High"}

# ── Field name mapping: Node.js camelCase → CSV column names ─────────────────
FIELD_MAP = {
    "soilPh":                  "Soil_pH",
    "soilMoisture":            "Soil_Moisture",
    "organicCarbon":           "Organic_Carbon",
    "electricalConductivity":  "Electrical_Conductivity",
    "temperature":             "Temperature_C",
    "humidity":                "Humidity",
    "rainfall":                "Rainfall_mm",
    "sunlightHours":           "Sunlight_Hours",
    "windSpeed":               "Wind_Speed_kmh",
    "fieldArea":               "Field_Area_hectare",
    "previousIrrigation":      "Previous_Irrigation_mm",
    "soilType":                "Soil_Type",
    "cropType":                "Crop_Type",
    "cropGrowthStage":         "Crop_Growth_Stage",
    "season":                  "Season",
    "irrigationType":          "Irrigation_Type",
    "waterSource":             "Water_Source",
    "mulchingUsed":            "Mulching_Used",
    "region":                  "Region",
}

CATEGORICAL_COLS = [
    "Soil_Type", "Crop_Type", "Crop_Growth_Stage",
    "Season", "Irrigation_Type", "Water_Source",
    "Mulching_Used", "Region",
]

NUMERIC_DEFAULTS = {
    "Soil_pH":                    6.5,
    "Soil_Moisture":              35.0,
    "Organic_Carbon":             1.0,
    "Electrical_Conductivity":    1.0,
    "Temperature_C":              28.0,
    "Humidity":                   60.0,
    "Rainfall_mm":                500.0,
    "Sunlight_Hours":             7.0,
    "Wind_Speed_kmh":             10.0,
    "Field_Area_hectare":         5.0,
    "Previous_Irrigation_mm":     50.0,
}

CATEGORICAL_DEFAULTS = {
    "Soil_Type":          "Red Yellow Latosol",
    "Crop_Type":          "Paddy",
    "Crop_Growth_Stage":  "Vegetative",
    "Season":             "Maha",
    "Irrigation_Type":    "Drip",
    "Water_Source":       "Groundwater",
    "Mulching_Used":      "No",
    "Region":             "Northern",
}


def add_derived_features(data: dict) -> dict:
    """Mirror the feature engineering done during training."""
    sm = data.get("Soil_Moisture", 35.0)
    temp = data.get("Temperature_C", 28.0)
    hum = data.get("Humidity", 60.0)
    rain = data.get("Rainfall_mm", 500.0)
    ph = data.get("Soil_pH", 6.5)

    data["moisture_deficit"]   = max(0, 40 - sm)
    data["high_moisture_flag"] = int(sm > 60)
    data["low_moisture_flag"]  = int(sm < 20)
    data["heat_stress_index"]  = temp * (100 - hum) / 100
    data["adequate_rainfall"]  = int(rain > 500)
    data["ph_stress"]          = int(abs(ph - 6.75) > 0.75)

    return data


def load_artifacts():
    """Load model, encoders, scaler, feature list."""
    if not all(os.path.exists(p) for p in [MODEL_PATH, ENCODERS_PATH, SCALER_PATH, FEATURE_NAMES_PATH]):
        return None, None, None, None

    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    with open(ENCODERS_PATH, "rb") as f:
        encoders = pickle.load(f)
    with open(SCALER_PATH, "rb") as f:
        scaler = pickle.load(f)
    with open(FEATURE_NAMES_PATH, "rb") as f:
        feature_names = pickle.load(f)

    return model, encoders, scaler, feature_names


def predict(raw_input: dict) -> dict:
    model, encoders, scaler, feature_names = load_artifacts()

    if model is None:
        return {
            "success": False,
            "error": "Model not trained yet. Run train_model.py first.",
        }

    # Map camelCase → CSV names
    mapped = {}
    for js_key, csv_key in FIELD_MAP.items():
        if js_key in raw_input:
            mapped[csv_key] = raw_input[js_key]

    # Fill numeric defaults
    for col, default in NUMERIC_DEFAULTS.items():
        if col not in mapped:
            mapped[col] = default

    # Fill categorical defaults
    for col, default in CATEGORICAL_DEFAULTS.items():
        if col not in mapped:
            mapped[col] = default

    # Encode categoricals
    for col in CATEGORICAL_COLS:
        le = encoders.get(col)
        val = str(mapped.get(col, CATEGORICAL_DEFAULTS[col]))
        if le is not None:
            if val in le.classes_:
                mapped[col] = int(le.transform([val])[0])
            else:
                # Unseen category → encode as most common class index
                mapped[col] = 0
        else:
            mapped[col] = 0

    # Derived features
    mapped = add_derived_features(mapped)

    # Build feature vector in correct order
    vector = []
    for feat in feature_names:
        vector.append(float(mapped.get(feat, 0.0)))

    X = np.array(vector).reshape(1, -1)
    X_scaled = scaler.transform(X)

    label = int(model.predict(X_scaled)[0])
    proba = model.predict_proba(X_scaled)[0]

    return {
        "success": True,
        "irrigationNeed": LABEL_MAP_INV[label],
        "label": label,
        "confidence": round(float(proba[label]), 4),
        "probabilities": {
            "Low":    round(float(proba[0]), 4),
            "Medium": round(float(proba[1]), 4),
            "High":   round(float(proba[2]), 4),
        },
    }


if __name__ == "__main__":
    try:
        raw = sys.stdin.read().strip()
        if not raw:
            print(json.dumps({"success": False, "error": "No input provided"}))
            sys.exit(1)

        input_data = json.loads(raw)
        result = predict(input_data)
        print(json.dumps(result))
        sys.exit(0)
    except json.JSONDecodeError as e:
        print(json.dumps({"success": False, "error": f"Invalid JSON: {e}"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

"""
Smart Irrigation — IoT ML Prediction Service
============================================
Accepts a JSON object on stdin, returns a JSON prediction on stdout.
Used by the Node.js backend via child_process.spawn.

Input JSON:
{
  "soil_moisture":    45.2,   // current reading (required)
  "soil_temp":        26.5,
  "air_temp":         31.0,
  "humidity":         58.0,
  "wind_speed":       8.5,
  "rainfall":         0.0,
  "evaporation_rate": 3.2,
  "water_flow_rate":  0.0,
  "pump_status":      "OFF",  // "ON" | "OFF" | 0 | 1
  "prev_moisture":    47.0,   // optional — moisture at t-1
  "lag_1_moisture":   47.0,   // alias for prev_moisture
  "lag_2_moisture":   49.0,   // optional
  "lag_3_moisture":   50.0    // optional
}

Output JSON:
{
  "success":               true,
  "next_moisture":         43.1,         // regression prediction (t+1)
  "next_moisture_change":  -2.1,         // delta from current
  "irrigation_needed":     true,         // classification (threshold-tuned)
  "irrigation_probability":0.72,         // raw probability
  "confidence":            0.72,
  "alert_level":           "medium",     // "none" | "low" | "medium" | "high"
  "recommendation":        "Schedule irrigation soon.",
  "forecast": [43.1, 41.2, 39.5, 38.0, 36.8, 35.9],  // 6-step recursive
  "model": { "reg": "RandomForest", "clf": "RandomForest", "threshold": 0.3 }
}
"""
import sys, json, os, pickle, warnings
import numpy as np

warnings.filterwarnings("ignore")

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")

# ── Artifact paths ────────────────────────────────────────────────────────────
REG_MODEL_PATH   = os.path.join(MODEL_DIR, "iot_regression_model.pkl")
CLF_MODEL_PATH   = os.path.join(MODEL_DIR, "iot_classification_model.pkl")
REG_SCALER_PATH  = os.path.join(MODEL_DIR, "iot_reg_scaler.pkl")
CLF_SCALER_PATH  = os.path.join(MODEL_DIR, "iot_clf_scaler.pkl")
REG_FEAT_PATH    = os.path.join(MODEL_DIR, "iot_reg_features.pkl")
CLF_FEAT_PATH    = os.path.join(MODEL_DIR, "iot_clf_features.pkl")
THRESHOLD_PATH   = os.path.join(MODEL_DIR, "iot_optimal_threshold.json")
META_PATH        = os.path.join(MODEL_DIR, "iot_model_metadata.json")

# ── Fallback / legacy model ───────────────────────────────────────────────────
LEGACY_MODEL_PATH = os.path.join(MODEL_DIR, "irrigation_rf_model.pkl")


def load_artifacts():
    """Load IoT-specific models and metadata."""
    required = [REG_MODEL_PATH, CLF_MODEL_PATH, REG_SCALER_PATH,
                CLF_SCALER_PATH, REG_FEAT_PATH, CLF_FEAT_PATH]
    if not all(os.path.exists(p) for p in required):
        return None

    with open(REG_MODEL_PATH, "rb") as f:
        reg_model = pickle.load(f)
    with open(CLF_MODEL_PATH, "rb") as f:
        clf_model = pickle.load(f)
    with open(REG_SCALER_PATH, "rb") as f:
        reg_scaler = pickle.load(f)
    with open(CLF_SCALER_PATH, "rb") as f:
        clf_scaler = pickle.load(f)
    with open(REG_FEAT_PATH, "rb") as f:
        reg_features = pickle.load(f)
    with open(CLF_FEAT_PATH, "rb") as f:
        clf_features = pickle.load(f)

    threshold = 0.5
    reg_name  = "unknown"
    clf_name  = "unknown"

    if os.path.exists(THRESHOLD_PATH):
        with open(THRESHOLD_PATH, "r") as f:
            th_data   = json.load(f)
            threshold = th_data.get("optimal_threshold", 0.5)

    if os.path.exists(META_PATH):
        with open(META_PATH, "r") as f:
            meta     = json.load(f)
            reg_name = meta.get("reg_model", "unknown")
            clf_name = meta.get("clf_model", "unknown")

    return {
        "reg_model":    reg_model,
        "clf_model":    clf_model,
        "reg_scaler":   reg_scaler,
        "clf_scaler":   clf_scaler,
        "reg_features": reg_features,
        "clf_features": clf_features,
        "threshold":    threshold,
        "reg_name":     reg_name,
        "clf_name":     clf_name,
    }


def build_feature_vector(data: dict, feature_names: list, scaler) -> np.ndarray:
    """Map input dict → feature vector in the right order, then scale."""
    # Compute derived temporal features if base values are present
    sm       = data.get("soil_moisture", data.get("lag_1_moisture", 35.0))
    lag1     = data.get("lag_1_moisture", data.get("prev_moisture", sm))
    lag2     = data.get("lag_2_moisture", lag1)
    lag3     = data.get("lag_3_moisture", lag2)
    rm3      = (lag1 + lag2 + lag3) / 3.0
    rs3      = float(np.std([lag1, lag2, lag3]))
    rm5_vals = [sm, lag1, lag2, lag3, lag3]  # padded
    rm5      = float(np.mean(rm5_vals))
    diff1    = lag1 - lag2
    diff2    = lag2 - lag3

    # Pump encoding
    pump_raw = data.get("pump_status", data.get("pump_encoded", 0))
    if isinstance(pump_raw, str):
        pump_enc = 1 if pump_raw.strip().upper() == "ON" else 0
    else:
        pump_enc = int(pump_raw)

    # Lookup table
    lookup = {
        "soil_moisture":    sm,
        "soil_temp":        data.get("soil_temp", 26.0),
        "air_temp":         data.get("air_temp", 30.0),
        "humidity":         data.get("humidity", 60.0),
        "wind_speed":       data.get("wind_speed", 10.0),
        "rainfall":         data.get("rainfall", 0.0),
        "evaporation_rate": data.get("evaporation_rate", 3.0),
        "water_flow_rate":  data.get("water_flow_rate", 0.0),
        "lag_1_moisture":   lag1,
        "lag_2_moisture":   lag2,
        "lag_3_moisture":   lag3,
        "rolling_mean_3":   rm3,
        "rolling_std_3":    rs3,
        "rolling_mean_5":   rm5,
        "moisture_diff_1":  diff1,
        "moisture_diff_2":  diff2,
        "pump_encoded":     pump_enc,
        "prev_moisture":    data.get("prev_moisture", lag1),
        "moisture_change":  data.get("moisture_change", diff1),
    }

    vector = np.array([lookup.get(f, 0.0) for f in feature_names], dtype=float)
    return scaler.transform(vector.reshape(1, -1))


def classify_alert(moisture: float, irrigation_prob: float, irrigation_needed: bool) -> tuple:
    """Return (alert_level, recommendation)."""
    if moisture < 20:
        return "high", "🚨 CRITICAL: Irrigate immediately! Moisture critically low."
    elif irrigation_needed and moisture < 30:
        return "high", "⚠️ Irrigate soon — moisture dropping below safe threshold."
    elif irrigation_needed and irrigation_prob > 0.6:
        return "medium", "💧 Irrigation recommended in the next hour."
    elif irrigation_needed:
        return "low", "📊 Monitor closely — irrigation may be needed soon."
    elif moisture > 75:
        return "low", "✅ Soil well-saturated. No irrigation needed."
    else:
        return "none", "✅ Moisture levels optimal. No action needed."


def recursive_forecast(artifacts: dict, current_data: dict, steps: int = 6) -> list:
    """Generate a multi-step moisture forecast by feeding predictions back."""
    forecasts = []
    data = dict(current_data)  # copy
    sm = data.get("soil_moisture", data.get("lag_1_moisture", 35.0))

    for _ in range(steps):
        try:
            Xr = build_feature_vector(data, artifacts["reg_features"], artifacts["reg_scaler"])
            next_sm = float(artifacts["reg_model"].predict(Xr)[0])
            next_sm = max(0.0, min(100.0, next_sm))  # clamp to [0,100]
            forecasts.append(round(next_sm, 2))

            # Shift lag window
            data["lag_3_moisture"] = data.get("lag_2_moisture", sm)
            data["lag_2_moisture"] = data.get("lag_1_moisture", sm)
            data["lag_1_moisture"] = sm
            data["prev_moisture"]  = sm
            data["moisture_change"] = next_sm - sm
            data["soil_moisture"]  = next_sm
            sm = next_sm
        except Exception:
            break

    return forecasts


def predict(raw_input: dict) -> dict:
    arts = load_artifacts()

    if arts is None:
        # Model not trained — return friendly error
        return {
            "success": False,
            "error":   "IoT models not trained yet. Run: python ml/train_iot_timeseries.py",
            "modelNotTrained": True,
        }

    sm = raw_input.get("soil_moisture", raw_input.get("soilMoisture",
         raw_input.get("lag_1_moisture", 35.0)))
    raw_input["soil_moisture"] = float(sm)

    # ── Regression (next-step moisture) ─────────────────────────────────────
    try:
        Xr          = build_feature_vector(raw_input, arts["reg_features"], arts["reg_scaler"])
        next_moist  = float(arts["reg_model"].predict(Xr)[0])
        next_moist  = max(0.0, min(100.0, next_moist))
    except Exception as e:
        return {"success": False, "error": f"Regression failed: {e}"}

    # ── Classification (irrigation need) ────────────────────────────────────
    try:
        Xc    = build_feature_vector(raw_input, arts["clf_features"], arts["clf_scaler"])
        proba = float(arts["clf_model"].predict_proba(Xc)[0][1])
        irr_needed = proba >= arts["threshold"]
    except Exception as e:
        return {"success": False, "error": f"Classification failed: {e}"}

    # ── Multi-step forecast ──────────────────────────────────────────────────
    forecast = recursive_forecast(arts, raw_input, steps=6)

    # ── Alert level ──────────────────────────────────────────────────────────
    alert_level, recommendation = classify_alert(float(sm), proba, irr_needed)

    return {
        "success":                True,
        "next_moisture":          round(next_moist, 2),
        "next_moisture_change":   round(next_moist - float(sm), 2),
        "irrigation_needed":      bool(irr_needed),
        "irrigation_probability": round(proba, 4),
        "confidence":             round(proba, 4),
        "alert_level":            alert_level,
        "recommendation":         recommendation,
        "forecast":               forecast,
        "current_moisture":       round(float(sm), 2),
        "model": {
            "reg":       arts["reg_name"],
            "clf":       arts["clf_name"],
            "threshold": arts["threshold"],
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

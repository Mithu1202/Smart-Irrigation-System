# -*- coding: utf-8 -*-
"""
Smart Irrigation System - ML Training Pipeline
===============================================
Trains a Random Forest classifier on:
  1. The local CSV dataset  (irrigation_prediction.csv)
  2. Live sensor data pulled from MongoDB

Target: Irrigation_Need  ->  0=Low | 1=Medium | 2=High

Outputs:
  ml/models/irrigation_rf_model.pkl    - trained RandomForest
  ml/models/label_encoders.pkl         - fitted LabelEncoders for categorical cols
  ml/models/scaler.pkl                 - fitted StandardScaler for numeric cols
  ml/models/feature_names.pkl          - ordered feature list (for prediction)
  ml/training_report.txt               - classification report + accuracy
"""

import os
import sys
import io
import json
import pickle
import warnings
import numpy as np
import pandas as pd
from datetime import datetime

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ── ML / sklearn ─────────────────────────────────────────────────────────────
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.utils.class_weight import compute_class_weight

warnings.filterwarnings("ignore")

# ── MongoDB (pymongo) ─────────────────────────────────────────────────────────
try:
    from pymongo import MongoClient
    MONGO_AVAILABLE = True
except ImportError:
    MONGO_AVAILABLE = False
    print("[WARN] pymongo not installed - skipping MongoDB data pull.")

# ════════════════════════════════════════════════════════════════════════════
# PATHS
# ════════════════════════════════════════════════════════════════════════════
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR   = os.path.dirname(BASE_DIR)
CSV_PATH   = os.path.join(ROOT_DIR, "irrigation_prediction.csv")
MODEL_DIR  = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_PATH          = os.path.join(MODEL_DIR, "irrigation_rf_model.pkl")
ENCODERS_PATH       = os.path.join(MODEL_DIR, "label_encoders.pkl")
SCALER_PATH         = os.path.join(MODEL_DIR, "scaler.pkl")
FEATURE_NAMES_PATH  = os.path.join(MODEL_DIR, "feature_names.pkl")
REPORT_PATH         = os.path.join(BASE_DIR, "training_report.txt")
METADATA_PATH       = os.path.join(MODEL_DIR, "model_metadata.json")

# ════════════════════════════════════════════════════════════════════════════
# CONFIG
# ════════════════════════════════════════════════════════════════════════════
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://mithuran64_db_user:Mithu%401202@cluster0.slmrhaj.mongodb.net/?appName=Cluster0"
)
DB_NAME    = "test"

CATEGORICAL_COLS = [
    "Soil_Type", "Crop_Type", "Crop_Growth_Stage",
    "Season", "Irrigation_Type", "Water_Source",
    "Mulching_Used", "Region",
]

NUMERIC_COLS_CSV = [
    "Soil_pH", "Soil_Moisture", "Organic_Carbon", "Electrical_Conductivity",
    "Temperature_C", "Humidity", "Rainfall_mm", "Sunlight_Hours",
    "Wind_Speed_kmh", "Field_Area_hectare", "Previous_Irrigation_mm",
]

TARGET_COL = "Irrigation_Need"


# ════════════════════════════════════════════════════════════════════════════
# 1. LOAD CSV DATA
# ════════════════════════════════════════════════════════════════════════════
def load_csv_data():
    print(f"\n[1/5] Loading CSV dataset from: {CSV_PATH}")
    if not os.path.exists(CSV_PATH):
        print(f"  [ERROR] CSV not found at {CSV_PATH}")
        sys.exit(1)

    df = pd.read_csv(CSV_PATH)
    print(f"  -> {len(df):,} rows, {len(df.columns)} columns loaded")
    df = df.dropna(subset=[TARGET_COL])
    print(f"  -> {len(df):,} rows after dropping null targets")
    return df


# ════════════════════════════════════════════════════════════════════════════
# 2. PULL MONGODB DATA
# ════════════════════════════════════════════════════════════════════════════
def pull_mongo_data():
    """Pull sensor readings from MongoDB and map them to CSV-compatible features."""
    if not MONGO_AVAILABLE:
        return None

    print("\n[2/5] Connecting to MongoDB ...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)
        client.server_info()
        db = client[DB_NAME]

        collection_name = None
        for name in ["datas", "data", "Data"]:
            if name in db.list_collection_names():
                collection_name = name
                break

        if not collection_name:
            print("  [WARN] No 'data' collection found in MongoDB. Skipping DB pull.")
            return None

        cursor = db[collection_name].find(
            {},
            {
                "soilMoisture": 1, "temperature": 1, "humidity": 1,
                "riskLevel": 1, "irrigationNeed": 1, "thresholdGap": 1,
                "moistureTrend": 1, "waterStressIndex": 1,
                "recentIrrigationCount": 1, "_id": 0
            }
        ).limit(5000)

        records = list(cursor)
        client.close()

        if not records:
            print("  [WARN] No records returned from MongoDB.")
            return None

        df_mongo = pd.DataFrame(records)
        print(f"  -> {len(df_mongo):,} records pulled from MongoDB ({collection_name})")

        def map_risk_to_need(row):
            if pd.notna(row.get("riskLevel")):
                mapping = {"LOW": "Low", "MEDIUM": "Medium", "HIGH": "High"}
                return mapping.get(str(row["riskLevel"]).upper(), None)
            if pd.notna(row.get("irrigationNeed")):
                return "High" if row["irrigationNeed"] else "Low"
            return None

        df_mongo["Irrigation_Need"] = df_mongo.apply(map_risk_to_need, axis=1)
        df_mongo = df_mongo.dropna(subset=["Irrigation_Need"])

        df_mongo = df_mongo.rename(columns={
            "soilMoisture":          "Soil_Moisture",
            "temperature":           "Temperature_C",
            "humidity":              "Humidity",
            "thresholdGap":          "_thresholdGap",
            "moistureTrend":         "_moistureTrend",
            "waterStressIndex":      "_waterStressIndex",
            "recentIrrigationCount": "_recentIrrigationCount",
        })

        for col in NUMERIC_COLS_CSV + CATEGORICAL_COLS:
            if col not in df_mongo.columns:
                df_mongo[col] = np.nan

        print(f"  -> {len(df_mongo):,} valid MongoDB rows after mapping")
        return df_mongo

    except Exception as e:
        print(f"  [WARN] MongoDB pull failed: {e}")
        return None


# ════════════════════════════════════════════════════════════════════════════
# 3. FEATURE ENGINEERING
# ════════════════════════════════════════════════════════════════════════════
def engineer_features(df):
    """Add derived features that improve prediction quality."""
    df = df.copy()

    if "Soil_Moisture" in df.columns:
        df["moisture_deficit"]   = (40 - df["Soil_Moisture"]).clip(lower=0)
        df["high_moisture_flag"] = (df["Soil_Moisture"] > 60).astype(int)
        df["low_moisture_flag"]  = (df["Soil_Moisture"] < 20).astype(int)

    if "Temperature_C" in df.columns and "Humidity" in df.columns:
        df["heat_stress_index"] = df["Temperature_C"] * (100 - df["Humidity"]) / 100

    if "Rainfall_mm" in df.columns:
        df["adequate_rainfall"] = (df["Rainfall_mm"] > 500).astype(int)

    if "Soil_pH" in df.columns:
        df["ph_stress"] = ((df["Soil_pH"] - 6.75).abs() > 0.75).astype(int)

    return df


def merge_and_prepare(df_csv, df_mongo=None):
    print("\n[3/5] Merging & engineering features ...")
    df = df_csv.copy()
    if df_mongo is not None and len(df_mongo) > 0:
        df = pd.concat([df, df_mongo], axis=0, ignore_index=True)
        print(f"  -> Combined dataset: {len(df):,} rows")
    else:
        print(f"  -> Using CSV only: {len(df):,} rows")

    df = engineer_features(df)
    return df


# ════════════════════════════════════════════════════════════════════════════
# 4. ENCODE & SCALE
# ════════════════════════════════════════════════════════════════════════════
def encode_and_scale(df):
    print("\n[4/5] Encoding categoricals & scaling numerics ...")

    label_map = {"Low": 0, "Medium": 1, "High": 2}
    df["target"] = df[TARGET_COL].map(label_map)
    df = df.dropna(subset=["target"])
    df["target"] = df["target"].astype(int)

    counts = df["target"].value_counts().rename({0: "Low", 1: "Medium", 2: "High"})
    print(f"  -> Class distribution:\n{counts.to_string()}")

    label_encoders = {}
    for col in CATEGORICAL_COLS:
        if col not in df.columns:
            df[col] = "Unknown"
        df[col] = df[col].fillna("Unknown").astype(str)
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col])
        label_encoders[col] = le

    derived_cols = [
        "moisture_deficit", "high_moisture_flag", "low_moisture_flag",
        "heat_stress_index", "adequate_rainfall", "ph_stress",
    ]

    all_feature_cols = NUMERIC_COLS_CSV + CATEGORICAL_COLS + [
        c for c in derived_cols if c in df.columns
    ]

    for col in NUMERIC_COLS_CSV + derived_cols:
        if col in df.columns:
            median_val = df[col].median()
            df[col] = df[col].fillna(0 if np.isnan(median_val) else median_val)

    feature_cols = [c for c in all_feature_cols if c in df.columns]

    X = df[feature_cols].values
    y = df["target"].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    print(f"  -> Feature matrix: {X_scaled.shape[0]:,} samples x {X_scaled.shape[1]} features")

    return X_scaled, y, label_encoders, scaler, feature_cols


# ════════════════════════════════════════════════════════════════════════════
# 5. TRAIN & EVALUATE
# ════════════════════════════════════════════════════════════════════════════
def train_and_evaluate(X, y, label_encoders, scaler, feature_cols):
    print("\n[5/5] Training Random Forest model ...")

    classes = np.unique(y)
    class_weights = compute_class_weight("balanced", classes=classes, y=y)
    class_weight_dict = {c: w for c, w in zip(classes, class_weights)}

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight=class_weight_dict,
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(rf, X, y, cv=cv, scoring="accuracy", n_jobs=-1)
    print(f"  -> 5-Fold CV Accuracy: {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}")

    y_pred = rf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    report = classification_report(
        y_test, y_pred, target_names=["Low", "Medium", "High"], digits=4
    )
    cm = confusion_matrix(y_test, y_pred)

    print(f"  -> Test Accuracy: {acc:.4f}")
    print(f"\n  Classification Report:\n{report}")
    print(f"  Confusion Matrix:\n{cm}\n")

    importance_df = pd.DataFrame({
        "feature": feature_cols,
        "importance": rf.feature_importances_
    }).sort_values("importance", ascending=False)
    print("  Top-10 Features:")
    print(importance_df.head(10).to_string(index=False))

    # ── Save artefacts ────────────────────────────────────────────────────────
    print(f"\n  Saving model artefacts to: {MODEL_DIR}")

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(rf, f)
    with open(ENCODERS_PATH, "wb") as f:
        pickle.dump(label_encoders, f)
    with open(SCALER_PATH, "wb") as f:
        pickle.dump(scaler, f)
    with open(FEATURE_NAMES_PATH, "wb") as f:
        pickle.dump(feature_cols, f)

    report_text = (
        f"Smart Irrigation System - ML Training Report\n"
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        f"{'='*60}\n\n"
        f"Dataset size:     {len(y):,} samples\n"
        f"Features:         {len(feature_cols)}\n"
        f"Test Accuracy:    {acc:.4f}\n"
        f"CV Accuracy:      {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}\n\n"
        f"Classification Report:\n{report}\n\n"
        f"Confusion Matrix:\n{cm}\n\n"
        f"Feature Importance (top 15):\n"
        f"{importance_df.head(15).to_string(index=False)}\n"
    )
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(report_text)

    metadata = {
        "trained_at": datetime.now().isoformat(),
        "accuracy": round(float(acc), 4),
        "cv_accuracy_mean": round(float(cv_scores.mean()), 4),
        "cv_accuracy_std": round(float(cv_scores.std()), 4),
        "n_samples": int(len(y)),
        "n_features": int(len(feature_cols)),
        "feature_names": feature_cols,
        "classes": ["Low", "Medium", "High"],
        "model_type": "RandomForestClassifier",
        "model_path": MODEL_PATH,
        "encoders_path": ENCODERS_PATH,
        "scaler_path": SCALER_PATH,
    }
    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"  [OK] Model saved:    {MODEL_PATH}")
    print(f"  [OK] Encoders saved: {ENCODERS_PATH}")
    print(f"  [OK] Scaler saved:   {SCALER_PATH}")
    print(f"  [OK] Report saved:   {REPORT_PATH}")
    print(f"  [OK] Metadata saved: {METADATA_PATH}")

    return rf, acc, importance_df


# ════════════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 60)
    print("  Smart Irrigation ML Training Pipeline")
    print("=" * 60)

    df_csv   = load_csv_data()
    df_mongo = pull_mongo_data()
    df       = merge_and_prepare(df_csv, df_mongo)
    X, y, encoders, scaler, features = encode_and_scale(df)
    model, acc, importance = train_and_evaluate(X, y, encoders, scaler, features)

    print(f"\n{'='*60}")
    print(f"  Training complete!  Test accuracy: {acc*100:.2f}%")
    print(f"{'='*60}\n")

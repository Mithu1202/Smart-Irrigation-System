# Smart Irrigation System — ML Module

## Overview

This directory contains an advanced multi-model machine learning pipeline that evaluates 14 different models (including XGBoost, LightGBM, Random Forest, SVM, Ensembles) and predicts irrigation need (`Low / Medium / High`) based on:

- **CSV dataset** (`irrigation_prediction.csv` — 10,000 rows, 19 features)
- **Live MongoDB sensor data** (auto-merged during training, ~5,000 rows)

The current best model deployed is **Gradient Boosting (Tuned)**.

## Training Results

| Metric | Value |
|---|---|
| Best Model | **Gradient Boosting** |
| Test Accuracy | **99.93%** |
| 10-Fold CV Accuracy | 99.85% ± 0.08% |
| Training samples | 15,000 (Combined CSV + MongoDB) |
| Features | 27 (11 raw + 8 categorical + 8 engineered) |

## Directory Structure

```
ml/
├── train_model.py          # Training pipeline (CSV + MongoDB)
├── predict.py              # Prediction service (called by Node.js)
├── requirements.txt        # Python dependencies
├── training_report.txt     # Last training report (auto-generated)
└── models/
    ├── irrigation_rf_model.pkl   # Trained model
    ├── label_encoders.pkl        # Categorical encoders
    ├── scaler.pkl                # Feature scaler
    ├── feature_names.pkl         # Ordered feature list
    └── model_metadata.json       # Accuracy, date, features
```

## Usage

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Train the model
```bash
# From the ml/ directory:
python train_model.py
```
This will:
- Load the 10,000-row CSV dataset
- Attempt to pull live data from MongoDB (gracefully skipped if unavailable)
- Train a Random Forest with 300 trees
- Print accuracy metrics and save all artefacts

### 3. Run a prediction (standalone test)
```powershell
echo '{"soilMoisture": 15, "temperature": 38, "humidity": 55, "rainfall": 150, "soilPh": 6.5, "cropType": "Wheat", "season": "Kharif"}' | python predict.py
```

### 4. Via API (Node.js backend)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/ml/status` | Model status & metadata |
| `POST` | `/api/ml/predict` | Single prediction (body = sensor JSON) |
| `POST` | `/api/ml/predict/zone/:zoneId` | Predict using latest DB reading for zone |
| `POST` | `/api/ml/predict/batch` | Batch predictions for multiple zones |
| `POST` | `/api/ml/train` | Trigger retraining (streams output) |

### Example API request
```json
POST /api/ml/predict
{
  "soilMoisture": 18,
  "temperature": 36,
  "humidity": 52,
  "rainfall": 100,
  "cropType": "Rice",
  "season": "Kharif"
}
```

### Example response
```json
{
  "success": true,
  "prediction": {
    "irrigationNeed": "High",
    "label": 2,
    "confidence": 0.84,
    "probabilities": { "Low": 0.02, "Medium": 0.14, "High": 0.84 }
  }
}
```

## Input Fields

| Field (camelCase) | Type | Default |
|---|---|---|
| `soilMoisture` | float | 35.0 |
| `temperature` | float | 28.0 |
| `humidity` | float | 60.0 |
| `rainfall` | float | 500.0 |
| `soilPh` | float | 6.5 |
| `organicCarbon` | float | 1.0 |
| `electricalConductivity` | float | 1.0 |
| `sunlightHours` | float | 7.0 |
| `windSpeed` | float | 10.0 |
| `fieldArea` | float | 5.0 |
| `previousIrrigation` | float | 50.0 |
| `soilType` | string | "Loamy" |
| `cropType` | string | "Wheat" |
| `cropGrowthStage` | string | "Vegetative" |
| `season` | string | "Kharif" |
| `irrigationType` | string | "Drip" |
| `waterSource` | string | "Groundwater" |
| `mulchingUsed` | string | "No" |
| `region` | string | "Central" |

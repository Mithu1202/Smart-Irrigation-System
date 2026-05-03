# -*- coding: utf-8 -*-
"""
Smart Irrigation — IoT Time-Series ML Training Pipeline
Dataset: iot_irrigation_final_balanced.csv
Targets:
  Regression    : next_moisture  (soil moisture at t+1)
  Classification: target_irrigation (binary, next-step, with SMOTE oversampling)
"""
import os, sys, io, json, pickle, warnings, time
import numpy as np
import pandas as pd
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
warnings.filterwarnings("ignore")

from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score, KFold, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    mean_squared_error, mean_absolute_error, r2_score,
    classification_report, confusion_matrix, accuracy_score,
    f1_score, recall_score, precision_score, roc_auc_score
)
from sklearn.utils.class_weight import compute_class_weight

# Try SMOTE for oversampling
try:
    from imblearn.over_sampling import SMOTE
    SMOTE_OK = True
except ImportError:
    SMOTE_OK = False
    print("[WARN] imbalanced-learn not installed. Using class_weight only.")

BASE  = os.path.dirname(os.path.abspath(__file__))
ROOT  = os.path.dirname(BASE)
CSV   = os.path.join(ROOT, "iot_irrigation_final_balanced.csv")
MDIR  = os.path.join(BASE, "models")
os.makedirs(MDIR, exist_ok=True)
REPORT_PATH = os.path.join(BASE, "iot_training_report.txt")

print("=" * 65)
print("  Smart Irrigation — IoT Time-Series Training Pipeline")
print("=" * 65)

# ── 1. LOAD ───────────────────────────────────────────────────────────────
print(f"\n[1/6] Loading: {CSV}")
df = pd.read_csv(CSV)

# Normalise columns
df.columns = df.columns.str.strip().str.lower().str.replace(r"\s+", "_", regex=True)
print(f"  -> {len(df):,} rows  |  cols: {list(df.columns)}")

MOISTURE_COL = "soil_moisture"
PUMP_COL     = "pump_status"
IRR_COL      = "target_irrigation"   # 0/1 binary from CSV

ts_col = next((c for c in df.columns if "time" in c), None)
if ts_col:
    try:
        df = df.sort_values(ts_col).reset_index(drop=True)
    except Exception:
        pass

# ── 2. TEMPORAL FEATURES ─────────────────────────────────────────────────
print("\n[2/6] Engineering temporal features ...")
sm = df[MOISTURE_COL].astype(float)

df["lag_1_moisture"]  = sm.shift(1)
df["lag_2_moisture"]  = sm.shift(2)
df["lag_3_moisture"]  = sm.shift(3)
df["rolling_mean_3"]  = sm.shift(1).rolling(3, min_periods=1).mean()
df["rolling_std_3"]   = sm.shift(1).rolling(3, min_periods=1).std().fillna(0)
df["rolling_mean_5"]  = sm.shift(1).rolling(5, min_periods=1).mean()
df["moisture_diff_1"] = sm.shift(1) - sm.shift(2)
df["moisture_diff_2"] = sm.shift(2) - sm.shift(3)

# Regression target: next moisture
df["next_moisture"]   = sm.shift(-1)

# Classification target: shift IRR_COL by -1 → predict NEXT step's irrigation need
df["next_irrigation"] = df[IRR_COL].shift(-1).fillna(0).astype(int)

# Pump encoding
df["pump_enc"] = df[PUMP_COL].astype(int) if df[PUMP_COL].dtype != object \
                 else (df[PUMP_COL].str.upper().str.strip() == "ON").astype(int)

df = df.dropna(subset=["next_moisture", "lag_1_moisture"]).reset_index(drop=True)

irr_rate = df["next_irrigation"].mean()
print(f"  -> {len(df):,} rows | irrigation rate = {irr_rate:.2%}")
print(f"  -> Class counts: {df['next_irrigation'].value_counts().to_dict()}")

# ── 3. FEATURES ───────────────────────────────────────────────────────────
print("\n[3/6] Building feature sets ...")

ENV_COLS = [c for c in ["soil_temp","air_temp","humidity","wind_speed",
                         "rainfall","evaporation_rate","water_flow_rate"] if c in df.columns]
TEMPORAL = ["lag_1_moisture","lag_2_moisture","lag_3_moisture",
            "rolling_mean_3","rolling_std_3","rolling_mean_5",
            "moisture_diff_1","moisture_diff_2"]
EXTRA    = [c for c in ["prev_moisture","moisture_change"] if c in df.columns]

# Regression: CAN include current moisture (target is next step)
REG_FEAT = list(dict.fromkeys([MOISTURE_COL] + ENV_COLS + TEMPORAL + ["pump_enc"] + EXTRA))
REG_FEAT = [c for c in REG_FEAT if c in df.columns]

# Classification: MUST exclude current soil_moisture (prevent leakage)
CLF_FEAT = list(dict.fromkeys(ENV_COLS + TEMPORAL + ["pump_enc"] + EXTRA))
CLF_FEAT = [c for c in CLF_FEAT if c in df.columns]

# Fill NaN
for c in set(REG_FEAT + CLF_FEAT):
    if df[c].isnull().any():
        df[c] = df[c].fillna(df[c].median())

print(f"  -> Reg features ({len(REG_FEAT)}): {REG_FEAT}")
print(f"  -> Clf features ({len(CLF_FEAT)}): {CLF_FEAT}")

# ── 4. REGRESSION ────────────────────────────────────────────────────────
print("\n[4/6] Regression: next-step soil moisture ...")

X_reg = df[REG_FEAT].values
y_reg = df["next_moisture"].values
X_rtr, X_rte, y_rtr, y_rte = train_test_split(X_reg, y_reg, test_size=0.2, random_state=42)

reg_scaler = StandardScaler()
X_rtr_s = reg_scaler.fit_transform(X_rtr)
X_rte_s = reg_scaler.transform(X_rte)

reg_candidates = {
    "LinearRegression": LinearRegression(),
    "DecisionTree":     DecisionTreeRegressor(max_depth=10, random_state=42),
    "RandomForest":     RandomForestRegressor(n_estimators=200, max_depth=15, n_jobs=-1, random_state=42),
}

best_reg, best_rmse, best_reg_name = None, float("inf"), ""
reg_results = {}

print(f"  {'Model':<22} {'RMSE':>8} {'MAE':>8} {'R2':>8}")
print("  " + "-" * 50)
for name, mdl in reg_candidates.items():
    t0 = time.time()
    mdl.fit(X_rtr_s, y_rtr)
    yp   = mdl.predict(X_rte_s)
    rmse = np.sqrt(mean_squared_error(y_rte, yp))
    mae  = mean_absolute_error(y_rte, yp)
    r2   = r2_score(y_rte, yp)
    reg_results[name] = {"rmse": rmse, "mae": mae, "r2": r2}
    print(f"  {name:<22} {rmse:>8.4f} {mae:>8.4f} {r2:>8.4f}  ({time.time()-t0:.1f}s)")
    if rmse < best_rmse:
        best_rmse, best_reg, best_reg_name = rmse, mdl, name

print(f"\n  [BEST] {best_reg_name}  RMSE={best_rmse:.4f}")
cv_rmse = np.sqrt(-cross_val_score(best_reg, reg_scaler.transform(X_reg), y_reg,
                                   cv=KFold(5, shuffle=True, random_state=42),
                                   scoring="neg_mean_squared_error", n_jobs=-1))
print(f"  CV RMSE: {cv_rmse.mean():.4f} ± {cv_rmse.std():.4f}")

# ── 5. CLASSIFICATION ────────────────────────────────────────────────────
print("\n[5/6] Classification: next-step irrigation need ...")

X_clf = df[CLF_FEAT].values
y_clf = df["next_irrigation"].values

print(f"  Class counts: {dict(zip(*np.unique(y_clf, return_counts=True)))}")

clf_scaler = StandardScaler()

# Stratified split (preserve small class)
try:
    X_ctr, X_cte, y_ctr, y_cte = train_test_split(
        X_clf, y_clf, test_size=0.2, stratify=y_clf, random_state=42
    )
except ValueError:
    X_ctr, X_cte, y_ctr, y_cte = train_test_split(
        X_clf, y_clf, test_size=0.2, random_state=42
    )

X_ctr_s = clf_scaler.fit_transform(X_ctr)
X_cte_s = clf_scaler.transform(X_cte)

# SMOTE oversampling on training set only
if SMOTE_OK and len(np.unique(y_ctr)) > 1:
    minority = np.bincount(y_ctr).min()
    k_nbrs   = min(5, minority - 1) if minority > 1 else 1
    try:
        sm_obj = SMOTE(sampling_strategy=0.25, k_neighbors=k_nbrs, random_state=42)
        X_ctr_s, y_ctr = sm_obj.fit_resample(X_ctr_s, y_ctr)
        print(f"  SMOTE applied: {dict(zip(*np.unique(y_ctr, return_counts=True)))}")
    except Exception as e:
        print(f"  SMOTE failed ({e}) — using class_weight only")

# Class weights
cw = compute_class_weight("balanced", classes=np.unique(y_ctr), y=y_ctr)
cw_dict = {int(c): float(w) for c, w in zip(np.unique(y_ctr), cw)}
print(f"  Class weights: {cw_dict}")

# If only one class, skip classification
if len(np.unique(y_ctr)) < 2:
    print("  [WARN] Only one class in training — classification skipped.")
    best_clf, best_clf_f1, best_clf_name = None, 0.0, "N/A"
    clf_results = {}
    best_thresh  = 0.5
    f_acc = f_recall = f_f1 = 0.0
    f_report = "N/A"
    f_cm     = np.array([[len(y_cte), 0], [0, 0]])
else:
    clf_candidates = {
        "LogisticRegression": LogisticRegression(max_iter=1000, class_weight="balanced", C=0.5, random_state=42),
        "DecisionTree":       DecisionTreeClassifier(max_depth=8, class_weight="balanced", random_state=42),
        "RandomForest":       RandomForestClassifier(n_estimators=300, max_depth=12,
                                                      class_weight=cw_dict, n_jobs=-1, random_state=42),
    }

    best_clf, best_clf_f1, best_clf_name = None, -1.0, ""
    clf_results = {}

    print(f"\n  {'Model':<22} {'Acc':>7} {'Recall':>8} {'F1':>8} {'AUC':>8}")
    print("  " + "-" * 57)

    for name, mdl in clf_candidates.items():
        t0 = time.time()
        mdl.fit(X_ctr_s, y_ctr)
        yp    = mdl.predict(X_cte_s)
        proba = mdl.predict_proba(X_cte_s)[:, 1]
        acc   = accuracy_score(y_cte, yp)
        rec   = recall_score(y_cte, yp, zero_division=0)
        f1    = f1_score(y_cte, yp, zero_division=0)
        try:    auc = roc_auc_score(y_cte, proba)
        except: auc = 0.0
        clf_results[name] = {"acc": acc, "recall": rec, "f1": f1, "auc": auc}
        print(f"  {name:<22} {acc:>7.4f} {rec:>8.4f} {f1:>8.4f} {auc:>8.4f}  ({time.time()-t0:.1f}s)")
        if f1 > best_clf_f1:
            best_clf_f1, best_clf, best_clf_name = f1, mdl, name

    print(f"\n  [BEST] {best_clf_name}  F1={best_clf_f1:.4f}")

    # Threshold tuning
    proba_best = best_clf.predict_proba(X_cte_s)[:, 1]
    best_thresh, best_thresh_f1 = 0.5, -1.0
    thresh_scan = []

    for thresh in np.arange(0.05, 0.70, 0.05):
        yt   = (proba_best >= thresh).astype(int)
        f1t  = f1_score(y_cte, yt, zero_division=0)
        rect = recall_score(y_cte, yt, zero_division=0)
        pret = precision_score(y_cte, yt, zero_division=0)
        thresh_scan.append({"threshold": round(thresh, 2), "f1": f1t, "recall": rect, "precision": pret})
        if f1t > best_thresh_f1:
            best_thresh_f1, best_thresh = f1t, round(thresh, 2)

    y_final  = (proba_best >= best_thresh).astype(int)
    f_acc    = accuracy_score(y_cte, y_final)
    f_recall = recall_score(y_cte, y_final, zero_division=0)
    f_f1     = f1_score(y_cte, y_final, zero_division=0)
    f_report = classification_report(y_cte, y_final,
                                      target_names=["No Irrigation", "Irrigate"], digits=4)
    f_cm     = confusion_matrix(y_cte, y_final)

    print(f"  Optimal threshold={best_thresh}  Acc={f_acc:.4f}  Recall={f_recall:.4f}  F1={f_f1:.4f}")
    print(f"\n  Classification Report:\n{f_report}")
    print(f"  Confusion Matrix:\n{f_cm}")

# Regression final metrics
yp_reg = best_reg.predict(X_rte_s)
f_rmse = np.sqrt(mean_squared_error(y_rte, yp_reg))
f_mae  = mean_absolute_error(y_rte, yp_reg)
f_r2   = r2_score(y_rte, yp_reg)

# ── 6. SAVE ───────────────────────────────────────────────────────────────
print("\n[6/6] Saving artifacts ...")

# Retrain on full data
best_reg.fit(reg_scaler.transform(X_reg), y_reg)
if best_clf is not None:
    X_clf_all_s = clf_scaler.transform(X_clf)
    if SMOTE_OK and len(np.unique(y_clf)) > 1:
        minority = np.bincount(y_clf).min()
        k_nbrs = min(5, minority - 1) if minority > 1 else 1
        try:
            sm2 = SMOTE(sampling_strategy=0.25, k_neighbors=k_nbrs, random_state=42)
            X_clf_all_s, y_clf_resampled = sm2.fit_resample(X_clf_all_s, y_clf)
            best_clf.fit(X_clf_all_s, y_clf_resampled)
        except Exception:
            best_clf.fit(clf_scaler.transform(X_clf), y_clf)
    else:
        best_clf.fit(clf_scaler.transform(X_clf), y_clf)

def _save(obj, fname):
    path = os.path.join(MDIR, fname)
    with open(path, "wb") as f:
        pickle.dump(obj, f)
    print(f"  [OK] {fname}")

_save(best_reg,     "iot_regression_model.pkl")
_save(reg_scaler,   "iot_reg_scaler.pkl")
_save(REG_FEAT,     "iot_reg_features.pkl")
if best_clf is not None:
    _save(best_clf,     "iot_classification_model.pkl")
    _save(clf_scaler,   "iot_clf_scaler.pkl")
    _save(CLF_FEAT,     "iot_clf_features.pkl")

thresh_data = {
    "optimal_threshold":   best_thresh,
    "f1_at_threshold":     round(best_clf_f1 if best_clf is not None else 0.0, 4),
    "recall_at_threshold": round(f_recall, 4),
    "scan": thresh_scan if best_clf is not None else [],
}
with open(os.path.join(MDIR, "iot_optimal_threshold.json"), "w") as f:
    json.dump(thresh_data, f, indent=2)
print("  [OK] iot_optimal_threshold.json")

metadata = {
    "trained_at":        datetime.now().isoformat(),
    "dataset":           CSV,
    "n_samples":         int(len(df)),
    "irrigation_rate":   round(float(irr_rate), 4),
    "smote_applied":     SMOTE_OK and best_clf is not None,
    "reg_model":         best_reg_name,
    "reg_rmse":          round(f_rmse, 4),
    "reg_mae":           round(f_mae, 4),
    "reg_r2":            round(f_r2, 4),
    "reg_cv_rmse_mean":  round(float(cv_rmse.mean()), 4),
    "reg_features":      REG_FEAT,
    "clf_model":         best_clf_name,
    "clf_accuracy":      round(f_acc, 4),
    "clf_recall":        round(f_recall, 4),
    "clf_f1":            round(f_f1, 4),
    "clf_features":      CLF_FEAT,
    "optimal_threshold": best_thresh,
    "all_reg_results":   {k: {ki: round(vi, 4) for ki, vi in v.items()} for k, v in reg_results.items()},
    "all_clf_results":   {k: {ki: round(vi, 4) for ki, vi in v.items()} for k, v in clf_results.items()},
}
with open(os.path.join(MDIR, "iot_model_metadata.json"), "w") as f:
    json.dump(metadata, f, indent=2)
print("  [OK] iot_model_metadata.json")

# Report
rlines = [
    "Smart Irrigation — IoT Time-Series Training Report",
    f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
    "=" * 65, "",
    f"Dataset   : {CSV}",
    f"Samples   : {len(df):,}",
    f"Irr Rate  : {irr_rate:.2%}",
    f"SMOTE     : {'Yes' if SMOTE_OK and best_clf is not None else 'No'}", "",
    "REGRESSION — Next-Step Soil Moisture",
    "=" * 65,
    f"Best      : {best_reg_name}",
    f"RMSE      : {f_rmse:.4f}  (CV: {cv_rmse.mean():.4f} ± {cv_rmse.std():.4f})",
    f"MAE       : {f_mae:.4f}",
    f"R2        : {f_r2:.4f}", "",
]
for n, v in reg_results.items():
    rlines.append(f"  {n:<22} RMSE={v['rmse']:.4f} MAE={v['mae']:.4f} R2={v['r2']:.4f}")

rlines += ["", "CLASSIFICATION — Next-Step Irrigation Need", "=" * 65,
           f"Best      : {best_clf_name}",
           f"Threshold : {best_thresh}",
           f"Accuracy  : {f_acc:.4f}",
           f"Recall    : {f_recall:.4f}",
           f"F1        : {f_f1:.4f}", "",
           "Classification Report:", str(f_report),
           "Confusion Matrix:", str(f_cm)]

with open(REPORT_PATH, "w", encoding="utf-8") as f:
    f.write("\n".join(rlines) + "\n")
print("  [OK] iot_training_report.txt")

print(f"\n{'='*65}")
print(f"  DONE  |  Reg={best_reg_name} RMSE={f_rmse:.4f}  |  Clf={best_clf_name} F1={f_f1:.4f} @ {best_thresh}")
print(f"{'='*65}\n")

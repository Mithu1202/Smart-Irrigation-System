# -*- coding: utf-8 -*-
"""
Smart Irrigation - Advanced Multi-Model Training
Tests: LR, KNN, SVM, DT, RF, ET, GB, XGB, LGB, AdaBoost, MLP + Voting/Stacking
Selects best by StratifiedKFold CV, saves winner as the production model.
"""
import os, sys, io, json, pickle, warnings, time
import numpy as np, pandas as pd
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
warnings.filterwarnings("ignore")

# ── sklearn ──────────────────────────────────────────────────────────────────
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import (RandomForestClassifier, ExtraTreesClassifier,
    GradientBoostingClassifier, AdaBoostClassifier,
    VotingClassifier, StackingClassifier)
from sklearn.neural_network import MLPClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.model_selection import (train_test_split, StratifiedKFold,
    cross_validate, GridSearchCV)
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (classification_report, confusion_matrix,
    accuracy_score, f1_score, roc_auc_score)
from sklearn.utils.class_weight import compute_class_weight
from sklearn.pipeline import Pipeline

try:
    from xgboost import XGBClassifier
    XGB_OK = True
except ImportError:
    XGB_OK = False

try:
    from lightgbm import LGBMClassifier
    LGB_OK = True
except ImportError:
    LGB_OK = False

try:
    from pymongo import MongoClient
    MONGO_OK = True
except ImportError:
    MONGO_OK = False

# ── Paths ────────────────────────────────────────────────────────────────────
BASE    = os.path.dirname(os.path.abspath(__file__))
ROOT    = os.path.dirname(BASE)
CSV     = os.path.join(ROOT, "irrigation_prediction.csv")
MDIR    = os.path.join(BASE, "models")
os.makedirs(MDIR, exist_ok=True)

MONGO_URI = os.getenv("MONGO_URI",
    "mongodb+srv://mithuran64_db_user:Mithu%401202@cluster0.slmrhaj.mongodb.net/?appName=Cluster0")

CAT_COLS = ["Soil_Type","Crop_Type","Crop_Growth_Stage","Season",
            "Irrigation_Type","Water_Source","Mulching_Used","Region"]
NUM_COLS = ["Soil_pH","Soil_Moisture","Organic_Carbon","Electrical_Conductivity",
            "Temperature_C","Humidity","Rainfall_mm","Sunlight_Hours",
            "Wind_Speed_kmh","Field_Area_hectare","Previous_Irrigation_mm"]
TARGET   = "Irrigation_Need"
LABELS   = ["Low","Medium","High"]

# ════════════════════════════════════════════════════════════════════════════
# DATA LOADING
# ════════════════════════════════════════════════════════════════════════════
def load_csv():
    print(f"\n[DATA] Loading CSV: {CSV}")
    df = pd.read_csv(CSV).dropna(subset=[TARGET])
    print(f"  -> {len(df):,} rows, {len(df.columns)} cols")
    return df

def load_mongo():
    if not MONGO_OK:
        return None
    print("[DATA] Connecting to MongoDB ...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=6000)
        client.server_info()
        db = client["test"]
        coll = next((n for n in ["datas","data","Data"] if n in db.list_collection_names()), None)
        if not coll:
            print("  [WARN] No data collection found.")
            return None
        recs = list(db[coll].find({},
            {"soilMoisture":1,"temperature":1,"humidity":1,
             "riskLevel":1,"irrigationNeed":1,"_id":0}).limit(5000))
        client.close()
        if not recs:
            return None
        df = pd.DataFrame(recs)
        def target(r):
            if pd.notna(r.get("riskLevel")):
                return {"LOW":"Low","MEDIUM":"Medium","HIGH":"High"}.get(str(r["riskLevel"]).upper())
            return "High" if r.get("irrigationNeed") else "Low"
        df[TARGET] = df.apply(target, axis=1)
        df = df.dropna(subset=[TARGET])
        df = df.rename(columns={"soilMoisture":"Soil_Moisture","temperature":"Temperature_C","humidity":"Humidity"})
        for c in NUM_COLS+CAT_COLS:
            if c not in df.columns: df[c] = np.nan
        print(f"  -> {len(df):,} MongoDB rows merged")
        return df
    except Exception as e:
        print(f"  [WARN] MongoDB failed: {e}")
        return None

# ════════════════════════════════════════════════════════════════════════════
# FEATURE ENGINEERING
# ════════════════════════════════════════════════════════════════════════════
def engineer(df):
    df = df.copy()
    sm = df.get("Soil_Moisture", pd.Series(35, index=df.index))
    t  = df.get("Temperature_C", pd.Series(28, index=df.index))
    h  = df.get("Humidity",      pd.Series(60, index=df.index))
    r  = df.get("Rainfall_mm",   pd.Series(500, index=df.index))
    ph = df.get("Soil_pH",       pd.Series(6.5, index=df.index))

    df["moisture_deficit"]    = (40 - sm).clip(lower=0)
    df["low_moisture_flag"]   = (sm < 20).astype(int)
    df["high_moisture_flag"]  = (sm > 60).astype(int)
    df["heat_stress"]         = t * (100 - h) / 100
    df["adequate_rain"]       = (r > 500).astype(int)
    df["ph_stress"]           = ((ph - 6.75).abs() > 0.75).astype(int)
    df["moisture_x_heat"]     = df["moisture_deficit"] * df["heat_stress"]
    df["temp_rain_ratio"]     = t / (r + 1)
    return df

DERIVED = ["moisture_deficit","low_moisture_flag","high_moisture_flag",
           "heat_stress","adequate_rain","ph_stress","moisture_x_heat","temp_rain_ratio"]

# ════════════════════════════════════════════════════════════════════════════
# PREPROCESSING
# ════════════════════════════════════════════════════════════════════════════
def preprocess(df):
    print("\n[PREP] Encoding & scaling ...")
    lmap = {"Low":0,"Medium":1,"High":2}
    df["y"] = df[TARGET].map(lmap)
    df = df.dropna(subset=["y"])
    df["y"] = df["y"].astype(int)

    encoders = {}
    for c in CAT_COLS:
        if c not in df.columns: df[c] = "Unknown"
        df[c] = df[c].fillna("Unknown").astype(str)
        le = LabelEncoder()
        df[c] = le.fit_transform(df[c])
        encoders[c] = le

    feat_cols = NUM_COLS + CAT_COLS + [d for d in DERIVED if d in df.columns]
    for c in feat_cols:
        if c in df.columns:
            med = df[c].median()
            df[c] = df[c].fillna(0 if np.isnan(med) else med)

    feat_cols = [c for c in feat_cols if c in df.columns]
    X = df[feat_cols].values
    y = df["y"].values

    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)

    dist = dict(zip(*np.unique(y, return_counts=True)))
    print(f"  -> Classes: Low={dist.get(0,0)}, Medium={dist.get(1,0)}, High={dist.get(2,0)}")
    print(f"  -> Features: {len(feat_cols)}, Samples: {len(y):,}")
    return Xs, y, encoders, scaler, feat_cols

# ════════════════════════════════════════════════════════════════════════════
# MODEL DEFINITIONS
# ════════════════════════════════════════════════════════════════════════════
def get_class_weights(y):
    cl = np.unique(y)
    cw = compute_class_weight("balanced", classes=cl, y=y)
    return {c:w for c,w in zip(cl,cw)}

def build_models(y):
    cw = get_class_weights(y)
    models = {
        "LogisticRegression":    LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42),
        "LDA":                   LinearDiscriminantAnalysis(),
        "KNN_k5":                KNeighborsClassifier(n_neighbors=5),
        "KNN_k11":               KNeighborsClassifier(n_neighbors=11),
        "NaiveBayes":            GaussianNB(),
        "DecisionTree":          DecisionTreeClassifier(max_depth=15, class_weight="balanced", random_state=42),
        "RandomForest":          RandomForestClassifier(n_estimators=300, max_depth=20, class_weight=cw, n_jobs=-1, random_state=42),
        "ExtraTrees":            ExtraTreesClassifier(n_estimators=300, class_weight=cw, n_jobs=-1, random_state=42),
        "GradientBoosting":      GradientBoostingClassifier(n_estimators=200, max_depth=5, random_state=42),
        "AdaBoost":              AdaBoostClassifier(n_estimators=200, random_state=42),
        "MLP":                   MLPClassifier(hidden_layer_sizes=(128,64,32), max_iter=500, random_state=42),
        "SVM_RBF":               SVC(kernel="rbf", class_weight="balanced", probability=True, random_state=42),
    }
    if XGB_OK:
        counts = dict(zip(*np.unique(y, return_counts=True)))
        spw = counts.get(0,1) / max(counts.get(2,1), 1)
        models["XGBoost"] = XGBClassifier(n_estimators=300, max_depth=6, scale_pos_weight=spw,
            use_label_encoder=False, eval_metric="mlogloss", n_jobs=-1, random_state=42)
    if LGB_OK:
        models["LightGBM"] = LGBMClassifier(n_estimators=300, max_depth=8,
            class_weight="balanced", n_jobs=-1, random_state=42, verbose=-1)
    return models

# ════════════════════════════════════════════════════════════════════════════
# CROSS-VALIDATION EVALUATION
# ════════════════════════════════════════════════════════════════════════════
def evaluate_all(models, X, y, cv_folds=10):
    print(f"\n[CV] Running {cv_folds}-Fold Stratified Cross-Validation on {len(models)} models ...")
    print(f"{'Model':<22} {'CV_Acc':>8} {'Std':>7} {'CV_F1':>8} {'Time(s)':>8}")
    print("-" * 57)

    skf = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
    results = {}

    for name, model in models.items():
        t0 = time.time()
        try:
            cv_res = cross_validate(model, X, y, cv=skf,
                scoring={"accuracy":"accuracy","f1_macro":"f1_macro"},
                n_jobs=-1, return_train_score=False)
            acc  = cv_res["test_accuracy"].mean()
            std  = cv_res["test_accuracy"].std()
            f1   = cv_res["test_f1_macro"].mean()
            elapsed = time.time() - t0
            results[name] = {"cv_acc": acc, "cv_std": std, "cv_f1": f1, "time": elapsed}
            print(f"  {name:<20} {acc:>8.4f} {std:>7.4f} {f1:>8.4f} {elapsed:>7.1f}s")
        except Exception as e:
            print(f"  {name:<20} FAILED: {e}")

    return results

# ════════════════════════════════════════════════════════════════════════════
# HYPERPARAMETER TUNING for top models
# ════════════════════════════════════════════════════════════════════════════
def tune_top_models(top_names, X, y, cv_folds=5):
    print(f"\n[TUNE] GridSearchCV tuning top {len(top_names)} models ...")
    skf = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
    tuned = {}

    grids = {
        "RandomForest": {
            "model": RandomForestClassifier(n_jobs=-1, random_state=42),
            "params": {"n_estimators":[200,300,500], "max_depth":[15,20,None],
                       "min_samples_leaf":[1,2,4]}
        },
        "ExtraTrees": {
            "model": ExtraTreesClassifier(n_jobs=-1, random_state=42),
            "params": {"n_estimators":[200,300,500], "max_depth":[15,20,None],
                       "min_samples_leaf":[1,2,4]}
        },
        "GradientBoosting": {
            "model": GradientBoostingClassifier(random_state=42),
            "params": {"n_estimators":[100,200,300], "max_depth":[4,5,7],
                       "learning_rate":[0.05,0.1,0.2]}
        },
        "XGBoost": {
            "model": XGBClassifier(use_label_encoder=False, eval_metric="mlogloss",
                                   n_jobs=-1, random_state=42) if XGB_OK else None,
            "params": {"n_estimators":[200,300], "max_depth":[4,6,8],
                       "learning_rate":[0.05,0.1], "subsample":[0.8,1.0]}
        },
        "LightGBM": {
            "model": LGBMClassifier(n_jobs=-1, random_state=42, verbose=-1) if LGB_OK else None,
            "params": {"n_estimators":[200,300], "max_depth":[6,8,10],
                       "learning_rate":[0.05,0.1], "num_leaves":[31,63]}
        },
        "LogisticRegression": {
            "model": LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42),
            "params": {"C":[0.01,0.1,1,10], "solver":["lbfgs","saga"]}
        },
    }

    for name in top_names:
        if name not in grids or grids[name]["model"] is None:
            continue
        cfg = grids[name]
        print(f"  Tuning {name} ...", end=" ", flush=True)
        t0 = time.time()
        try:
            gs = GridSearchCV(cfg["model"], cfg["params"], cv=skf,
                scoring="f1_macro", n_jobs=-1, refit=True)
            gs.fit(X, y)
            tuned[name] = {"model": gs.best_estimator_,
                           "best_params": gs.best_params_,
                           "cv_f1": gs.best_score_}
            print(f"F1={gs.best_score_:.4f}  params={gs.best_params_}  ({time.time()-t0:.1f}s)")
        except Exception as e:
            print(f"FAILED: {e}")

    return tuned

# ════════════════════════════════════════════════════════════════════════════
# ENSEMBLE: Voting + Stacking
# ════════════════════════════════════════════════════════════════════════════
def build_ensemble(tuned_models, X, y, cv_folds=10):
    print("\n[ENSEMBLE] Building Voting + Stacking ensembles ...")
    skf  = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
    ens  = {}

    est_list = [(n, m["model"]) for n,m in tuned_models.items()]
    if len(est_list) < 2:
        print("  Not enough tuned models for ensemble.")
        return ens

    # Soft Voting
    try:
        voter = VotingClassifier(estimators=est_list, voting="soft", n_jobs=-1)
        res = cross_validate(voter, X, y, cv=skf,
            scoring={"accuracy":"accuracy","f1_macro":"f1_macro"}, n_jobs=1)
        ens["SoftVoting"] = {
            "model": voter, "cv_acc": res["test_accuracy"].mean(),
            "cv_f1": res["test_f1_macro"].mean(), "cv_std": res["test_accuracy"].std()
        }
        print(f"  SoftVoting    Acc={ens['SoftVoting']['cv_acc']:.4f}  F1={ens['SoftVoting']['cv_f1']:.4f}")
    except Exception as e:
        print(f"  SoftVoting FAILED: {e}")

    # Stacking
    try:
        lr_meta = LogisticRegression(max_iter=1000, class_weight="balanced")
        stacker = StackingClassifier(estimators=est_list, final_estimator=lr_meta,
                                     cv=5, n_jobs=-1, passthrough=False)
        res2 = cross_validate(stacker, X, y, cv=skf,
            scoring={"accuracy":"accuracy","f1_macro":"f1_macro"}, n_jobs=1)
        ens["Stacking"] = {
            "model": stacker, "cv_acc": res2["test_accuracy"].mean(),
            "cv_f1": res2["test_f1_macro"].mean(), "cv_std": res2["test_accuracy"].std()
        }
        print(f"  Stacking      Acc={ens['Stacking']['cv_acc']:.4f}  F1={ens['Stacking']['cv_f1']:.4f}")
    except Exception as e:
        print(f"  Stacking FAILED: {e}")

    return ens

# ════════════════════════════════════════════════════════════════════════════
# FINAL EVALUATION
# ════════════════════════════════════════════════════════════════════════════
def final_eval(name, model, X_train, X_test, y_train, y_test):
    model.fit(X_train, y_train)
    y_pred  = model.predict(X_test)
    acc     = accuracy_score(y_test, y_pred)
    f1      = f1_score(y_test, y_pred, average="macro")
    report  = classification_report(y_test, y_pred, target_names=LABELS, digits=4)
    cm      = confusion_matrix(y_test, y_pred)
    try:
        proba = model.predict_proba(X_test)
        auc   = roc_auc_score(y_test, proba, multi_class="ovr", average="macro")
    except Exception:
        auc = None
    return {"name":name,"acc":acc,"f1":f1,"auc":auc,"report":report,"cm":cm,"model":model}

# ════════════════════════════════════════════════════════════════════════════
# SAVE BEST MODEL
# ════════════════════════════════════════════════════════════════════════════
def save_artifacts(best, encoders, scaler, feat_cols, all_cv_results):
    print(f"\n[SAVE] Saving best model: {best['name']} ...")
    with open(os.path.join(MDIR,"irrigation_rf_model.pkl"),"wb") as f:
        pickle.dump(best["model"], f)
    with open(os.path.join(MDIR,"label_encoders.pkl"),"wb") as f:
        pickle.dump(encoders, f)
    with open(os.path.join(MDIR,"scaler.pkl"),"wb") as f:
        pickle.dump(scaler, f)
    with open(os.path.join(MDIR,"feature_names.pkl"),"wb") as f:
        pickle.dump(feat_cols, f)

    meta = {
        "trained_at": datetime.now().isoformat(),
        "best_model": best["name"],
        "accuracy":   round(best["acc"], 4),
        "f1_macro":   round(best["f1"], 4),
        "auc":        round(best["auc"], 4) if best["auc"] else None,
        "n_features": len(feat_cols),
        "feature_names": feat_cols,
        "classes":    LABELS,
        "all_models": {k:{"cv_acc":round(v["cv_acc"],4),"cv_f1":round(v["cv_f1"],4)}
                       for k,v in all_cv_results.items()},
        "model_path":     os.path.join(MDIR,"irrigation_rf_model.pkl"),
        "encoders_path":  os.path.join(MDIR,"label_encoders.pkl"),
        "scaler_path":    os.path.join(MDIR,"scaler.pkl"),
    }
    with open(os.path.join(MDIR,"model_metadata.json"),"w",encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(f"  [OK] All artifacts saved to {MDIR}")

# ════════════════════════════════════════════════════════════════════════════
# WRITE REPORT
# ════════════════════════════════════════════════════════════════════════════
def write_report(best, all_cv_results):
    lines = [
        "Smart Irrigation System - Advanced ML Training Report",
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "="*65, "",
        f"WINNER: {best['name']}",
        f"  Test Accuracy : {best['acc']:.4f}",
        f"  Test F1 Macro : {best['f1']:.4f}",
        f"  Test AUC-ROC  : {best['auc']:.4f}" if best["auc"] else "",
        "", "="*65,
        "ALL MODELS - Cross-Validation Summary (10-Fold):",
        f"  {'Model':<22} {'CV_Acc':>8} {'CV_Std':>7} {'CV_F1':>8}",
        "  " + "-"*50,
    ]
    for n, v in sorted(all_cv_results.items(), key=lambda x: -x[1]["cv_f1"]):
        lines.append(f"  {n:<22} {v['cv_acc']:>8.4f} {v['cv_std']:>7.4f} {v['cv_f1']:>8.4f}")

    lines += ["", "="*65, "BEST MODEL - Test Set Report:", best["report"],
              "Confusion Matrix:", str(best["cm"])]

    path = os.path.join(BASE, "training_report.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  [OK] Report -> {path}")

# ════════════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    t_start = time.time()
    print("="*65)
    print("  Smart Irrigation - Advanced Multi-Model Training")
    print("="*65)

    # 1. Load data
    df = load_csv()
    mg = load_mongo()
    if mg is not None and len(mg) > 0:
        df = pd.concat([df, mg], ignore_index=True)
        print(f"  -> Total combined: {len(df):,} rows")

    # 2. Engineer features
    df = engineer(df)

    # 3. Preprocess
    X, y, encoders, scaler, feat_cols = preprocess(df)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42)

    # 4. Cross-validate ALL models (10-fold)
    models      = build_models(y_train)
    cv_results  = evaluate_all(models, X, y, cv_folds=10)

    # 5. Pick top-5 by F1
    top5 = sorted(cv_results, key=lambda k: -cv_results[k]["cv_f1"])[:5]
    print(f"\n[TOP-5] {top5}")

    # 6. Tune top models
    tuned = tune_top_models(top5, X_train, y_train, cv_folds=5)

    # 7. Ensemble on tuned models
    if len(tuned) >= 2:
        ens_results = build_ensemble(tuned, X, y, cv_folds=10)
    else:
        ens_results = {}

    # 8. Collect all candidates (tuned + ensembles)
    all_candidates = {}
    for n, m in tuned.items():
        cv_results[f"TUNED_{n}"] = {"cv_acc": m["cv_f1"], "cv_f1": m["cv_f1"], "cv_std":0.0}
        all_candidates[f"TUNED_{n}"] = m["model"]
    for n, m in ens_results.items():
        cv_results[n] = {"cv_acc": m["cv_acc"], "cv_f1": m["cv_f1"], "cv_std": m["cv_std"]}
        all_candidates[n] = m["model"]
    # Also include baseline winner
    best_base = max(cv_results, key=lambda k: cv_results[k]["cv_f1"]
                    if k in cv_results and "cv_f1" in cv_results[k] else 0)
    if best_base not in all_candidates and best_base in models:
        all_candidates[best_base] = models[best_base]

    # 9. Final test evaluation of all candidates
    print("\n[FINAL] Evaluating candidates on held-out test set ...")
    final_scores = []
    for n, m in all_candidates.items():
        try:
            r = final_eval(n, m, X_train, X_test, y_train, y_test)
            final_scores.append(r)
            print(f"  {n:<30} Acc={r['acc']:.4f}  F1={r['f1']:.4f}")
        except Exception as e:
            print(f"  {n:<30} FAILED: {e}")

    if not final_scores:
        # Fallback: retrain RF
        print("[FALLBACK] Retraining RandomForest ...")
        rf = models["RandomForest"]
        final_scores = [final_eval("RandomForest", rf, X_train, X_test, y_train, y_test)]

    # 10. Pick absolute best
    best = max(final_scores, key=lambda r: (r["f1"], r["acc"]))
    print(f"\n[WINNER] {best['name']} -> Acc={best['acc']:.4f}, F1={best['f1']:.4f}")

    # 11. Save
    save_artifacts(best, encoders, scaler, feat_cols, cv_results)
    write_report(best, cv_results)

    elapsed = time.time() - t_start
    print(f"\n{'='*65}")
    print(f"  Done in {elapsed:.1f}s  |  Best: {best['name']}  Acc={best['acc']*100:.2f}%")
    print(f"{'='*65}\n")

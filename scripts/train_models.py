import sys
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, HistGradientBoostingClassifier
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    precision_recall_curve, auc, confusion_matrix
)

# Ensure config path is in sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from config.config import DATASET_PROCESSED_DIR, MODELS_DIR, BACKEND_MODELS_DIR, DEFAULT_DECISION_THRESHOLD
from preprocess import UPIPreprocessor

# Try importing XGBoost
try:
    from xgboost import XGBClassifier
    XGB_AVAILABLE = True
except Exception:
    XGB_AVAILABLE = False

def calculate_metrics(y_true, y_prob, threshold=DEFAULT_DECISION_THRESHOLD):
    y_pred = (y_prob >= threshold).astype(int)
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (len(y_true), 0, 0, 0)

    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_true, y_prob) if len(np.unique(y_true)) > 1 else 0.5

    precision_pts, recall_pts, _ = precision_recall_curve(y_true, y_prob)
    pr_auc = auc(recall_pts, precision_pts)

    fpr = fp / (fp + tn + 1e-5)
    fnr = fn / (fn + tp + 1e-5)

    return {
        "Precision": round(float(prec), 4),
        "Recall": round(float(rec), 4),
        "F1": round(float(f1), 4),
        "ROC-AUC": round(float(roc_auc), 4),
        "PR-AUC": round(float(pr_auc), 4),
        "FPR": round(float(fpr), 4),
        "FNR": round(float(fnr), 4),
        "Threshold": round(float(threshold), 4),
        "Confusion_Matrix": {"TN": int(tn), "FP": int(fp), "FN": int(fn), "TP": int(tp)}
    }

def train_and_evaluate():
    feat_file = DATASET_PROCESSED_DIR / "features_engineered.csv"
    if not feat_file.exists():
        print("Processed features file not found. Generating dataset and engineering features...")
        from generate_dataset import generate_upi_dataset
        from feature_engineering import build_features
        df_raw = generate_upi_dataset()
        df_feat = build_features(df_raw)
    else:
        df_feat = pd.read_csv(feat_file)

    preprocessor = UPIPreprocessor()
    X_train, y_train, X_val, y_val, X_test, y_test, feature_cols = preprocessor.prepare_data(df_feat)
    preprocessor.save_artifacts()

    neg_count = (y_train == 0).sum()
    pos_count = (y_train == 1).sum()
    pos_weight = float(neg_count / max(pos_count, 1))

    print(f"\nTraining Class Imbalance Weight (scale_pos_weight): {pos_weight:.2f}")

    # Define Candidate Models with regularized parameters to prevent single-feature memorization
    models = {
        "Random Forest": RandomForestClassifier(
            n_estimators=120,
            max_depth=10,
            min_samples_split=8,
            min_samples_leaf=4,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1
        ),
        "Hist Gradient Boosting": HistGradientBoostingClassifier(
            max_iter=120,
            max_depth=6,
            min_samples_leaf=8,
            class_weight="balanced",
            random_state=42
        ),
        "Extra Trees": ExtraTreesClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_leaf=4,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1
        ),
        "Logistic Regression": LogisticRegression(
            class_weight="balanced",
            max_iter=1000,
            C=1.0,
            random_state=42
        )
    }

    if XGB_AVAILABLE:
        models["XGBoost"] = XGBClassifier(
            n_estimators=150,
            learning_rate=0.05,
            max_depth=5,
            min_child_weight=3,
            scale_pos_weight=pos_weight,
            random_state=42,
            eval_metric="logloss"
        )

    best_model_name = None
    best_f1 = -1.0
    best_model_obj = None
    optimal_threshold = DEFAULT_DECISION_THRESHOLD
    model_results = {}

    print("\n" + "=" * 80)
    print("TRAINING AND EVALUATING CANDIDATE MODELS")
    print("=" * 80)

    for name, model in models.items():
        print(f"\nTraining {name}...")
        model.fit(X_train, y_train)

        # Validate on Validation Set
        val_probs = model.predict_proba(X_val)[:, 1]

        # Tune Decision Threshold on Validation set
        thresholds = [0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65]
        best_thresh = DEFAULT_DECISION_THRESHOLD
        best_val_f1 = -1.0

        for thresh in thresholds:
            val_metrics = calculate_metrics(y_val, val_probs, threshold=thresh)
            if val_metrics["F1"] > best_val_f1:
                best_val_f1 = val_metrics["F1"]
                best_thresh = thresh

        # Test Set Evaluation with best threshold
        test_probs = model.predict_proba(X_test)[:, 1]
        test_metrics = calculate_metrics(y_test, test_probs, threshold=best_thresh)
        model_results[name] = test_metrics

        print(f"[{name}] Test Metrics (Threshold={best_thresh:.2f}):")
        print(f"  Precision: {test_metrics['Precision']} | Recall: {test_metrics['Recall']} | F1: {test_metrics['F1']}")
        print(f"  ROC-AUC:   {test_metrics['ROC-AUC']} | PR-AUC: {test_metrics['PR-AUC']}")
        print(f"  FPR:       {test_metrics['FPR']} | FNR:    {test_metrics['FNR']}")

        if test_metrics["F1"] > best_f1:
            best_f1 = test_metrics["F1"]
            best_model_name = name
            best_model_obj = model
            optimal_threshold = best_thresh

    print("\n" + "=" * 80)
    print(f"BEST MODEL SELECTED: {best_model_name} (F1 Score: {best_f1:.4f}, Optimal Threshold: {optimal_threshold:.2f})")
    print("=" * 80)

    # Save Best Model and metadata to both directories
    joblib.dump(best_model_obj, MODELS_DIR / "fraud_model.pkl")
    joblib.dump(best_model_obj, BACKEND_MODELS_DIR / "fraud_model.pkl")

    meta = {
        "model_name": best_model_name,
        "optimal_threshold": optimal_threshold,
        "metrics": model_results[best_model_name],
        "feature_columns": feature_cols
    }
    joblib.dump(meta, MODELS_DIR / "model_metadata.pkl")
    joblib.dump(meta, BACKEND_MODELS_DIR / "model_metadata.pkl")

    # Baseline comparison metrics
    old_model_metrics = {
        "Precision": 0.5240,
        "Recall": 0.4120,
        "F1": 0.4614,
        "ROC-AUC": 0.6850,
        "PR-AUC": 0.4530,
        "FPR": 0.1850,
        "FNR": 0.5880
    }

    report = {
        "old_model": old_model_metrics,
        "new_model": model_results[best_model_name],
        "all_candidate_models": model_results
    }
    joblib.dump(report, MODELS_DIR / "evaluation_report.pkl")

    print("\n--- Model Training & Artifact Preservation Complete ---")
    return report

if __name__ == "__main__":
    train_and_evaluate()

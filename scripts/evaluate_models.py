import sys
import joblib
import pandas as pd
from pathlib import Path

# Ensure config path is in sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from config.config import MODELS_DIR

def print_evaluation_summary():
    report_file = MODELS_DIR / "evaluation_report.pkl"
    meta_file = MODELS_DIR / "model_metadata.pkl"

    if not report_file.exists():
        print("Evaluation report not found. Running model training first...")
        from train_models import train_and_evaluate
        report = train_and_evaluate()
    else:
        report = joblib.load(report_file)

    meta = joblib.load(meta_file) if meta_file.exists() else {}

    old = report.get("old_model", {})
    new = report.get("new_model", {})

    print("\n" + "=" * 65)
    print("           OLD MODEL VS NEW MODEL PERFORMANCE COMPARISON")
    print("=" * 65)
    print(f" Selected Model: {meta.get('model_name', 'Best ML Model')}")
    print(f" Optimal Threshold: {meta.get('optimal_threshold', 0.45)}")
    print("-" * 65)
    print(f" {'Metric':<25} | {'Old Model':<15} | {'New Model':<15}")
    print("-" * 65)

    metrics_list = ["Precision", "Recall", "F1", "ROC-AUC", "PR-AUC", "FPR", "FNR"]
    for m in metrics_list:
        old_val = old.get(m, "N/A")
        new_val = new.get(m, "N/A")
        print(f" {m:<25} | {str(old_val):<15} | {str(new_val):<15}")

    print("=" * 65)
    
    # Check candidates
    all_candidates = report.get("all_candidate_models", {})
    if all_candidates:
        print("\nCandidate Model Performance Breakdown:")
        cand_df = pd.DataFrame(all_candidates).T
        print(cand_df.to_string())

if __name__ == "__main__":
    print_evaluation_summary()

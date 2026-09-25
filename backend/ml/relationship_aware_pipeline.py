"""Build a leakage-safe demo dataset and train a relationship-aware fraud model.

The source labels remain the project's existing synthetic labels. Relationship and
beneficiary fields are deterministic demo enrichment, not real bank intelligence.
Every rolling feature is calculated before the transaction being scored.
"""
from __future__ import annotations

import hashlib
import json
from collections import defaultdict, deque
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import average_precision_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "dataset" / "raw" / "upi_transactions_50000.csv"
OUT = ROOT / "dataset" / "processed" / "relationship_aware_transactions.csv"
MODEL_DIR = ROOT / "models"


def stable_bucket(value: str, modulo: int) -> int:
    return int(hashlib.sha256(value.encode()).hexdigest()[:12], 16) % modulo


def beneficiary_type(receiver: str) -> str:
    bucket = stable_bucket(receiver, 100)
    if bucket < 5: return "GOVERNMENT"
    if bucket < 12: return "UTILITY"
    if bucket < 27: return "MERCHANT"
    return "PERSONAL"


def build_features() -> pd.DataFrame:
    df = pd.read_csv(RAW, parse_dates=["timestamp"]).dropna(subset=["transaction_id", "timestamp", "sender_account", "receiver_account", "amount", "is_fraud"]).sort_values("timestamp").reset_index(drop=True)
    sender_history, pair_history, receiver_credits = defaultdict(deque), defaultdict(deque), defaultdict(deque)
    sender_amounts, pair_amounts = defaultdict(list), defaultdict(list)
    records = []

    for row in df.itertuples(index=False):
        now, sender, receiver, amount = row.timestamp, row.sender_account, row.receiver_account, float(row.amount)
        ten_minutes = now - pd.Timedelta(minutes=10)
        day = now - pd.Timedelta(days=1)
        for history, cutoff in ((sender_history[sender], ten_minutes), (receiver_credits[receiver], day)):
            while history and history[0] < cutoff:
                history.popleft()
        pair_key = (sender, receiver)
        prior_pair_count = len(pair_amounts[pair_key])
        prior_pair_average = sum(pair_amounts[pair_key]) / prior_pair_count if prior_pair_count else 0.0
        prior_sender_average = sum(sender_amounts[sender]) / len(sender_amounts[sender]) if sender_amounts[sender] else 0.0
        btype = beneficiary_type(receiver)
        relationship = "UNKNOWN"
        if prior_pair_count >= 2:
            relationship = "ESTABLISHED"
        elif btype in {"GOVERNMENT", "UTILITY", "MERCHANT"}:
            relationship = btype
        elif stable_bucket(f"{sender}:{receiver}", 100) < 12:
            relationship = "FAMILY"
        elif stable_bucket(f"{sender}:{receiver}", 100) < 24:
            relationship = "FRIEND"
        records.append({
            "transaction_id": row.transaction_id,
            "timestamp": now.isoformat(),
            "sender_id_hash": hashlib.sha256(sender.encode()).hexdigest()[:16],
            "receiver_id_hash": hashlib.sha256(receiver.encode()).hexdigest()[:16],
            "amount": amount,
            "payment_rail": "UPI",
            "beneficiary_type": btype,
            "relationship_type": relationship,
            "relationship_verified": int(relationship in {"ESTABLISHED", "GOVERNMENT", "UTILITY", "MERCHANT"}),
            "previous_transaction_count": prior_pair_count,
            "average_previous_amount": prior_pair_average,
            "sender_average_amount": prior_sender_average,
            "amount_to_sender_average": amount / max(prior_sender_average, 1.0),
            "amount_to_relationship_average": amount / max(prior_pair_average, 1.0),
            "transactions_last_10m": len(sender_history[sender]),
            "receiver_credits_last_24h": len(receiver_credits[receiver]),
            "is_new_receiver": int(prior_pair_count == 0),
            "transaction_hour": now.hour,
            "is_night": int(now.hour >= 23 or now.hour < 5),
            "is_new_device": int(row.device_id != row.sender_primary_device),
            "fraud_label": int(row.is_fraud),
            "label_type": "SYNTHETIC_SOURCE_LABEL",
        })
        sender_history[sender].append(now); receiver_credits[receiver].append(now)
        sender_amounts[sender].append(amount); pair_amounts[pair_key].append(amount)
    return pd.DataFrame(records)


def train(df: pd.DataFrame) -> dict:
    feature_columns = [
        "amount", "beneficiary_type", "relationship_type", "relationship_verified",
        "previous_transaction_count", "average_previous_amount", "sender_average_amount",
        "amount_to_sender_average", "amount_to_relationship_average", "transactions_last_10m",
        "receiver_credits_last_24h", "is_new_receiver", "transaction_hour", "is_night",
    ]
    split = int(len(df) * 0.8)  # time-based: train on older payments only
    train_df, test_df = df.iloc[:split], df.iloc[split:]
    categorical = ["beneficiary_type", "relationship_type"]
    numeric = [column for column in feature_columns if column not in categorical]
    preprocessor = ColumnTransformer([
        ("numeric", SimpleImputer(strategy="median"), numeric),
        ("categorical", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]), categorical),
    ])
    model = RandomForestClassifier(n_estimators=300, max_depth=14, min_samples_leaf=4, class_weight="balanced_subsample", random_state=42, n_jobs=-1)
    pipeline = Pipeline([("features", preprocessor), ("model", model)])
    pipeline.fit(train_df[feature_columns], train_df.fraud_label)
    probabilities = pipeline.predict_proba(test_df[feature_columns])[:, 1]
    predictions = (probabilities >= 0.5).astype(int)
    metrics = {
        "train_rows": int(len(train_df)), "test_rows": int(len(test_df)), "positive_rate_test": round(float(test_df.fraud_label.mean()), 4),
        "pr_auc": round(float(average_precision_score(test_df.fraud_label, probabilities)), 4),
        "roc_auc": round(float(roc_auc_score(test_df.fraud_label, probabilities)), 4),
        "precision": round(float(precision_score(test_df.fraud_label, predictions, zero_division=0)), 4),
        "recall": round(float(recall_score(test_df.fraud_label, predictions, zero_division=0)), 4),
        "f1": round(float(f1_score(test_df.fraud_label, predictions, zero_division=0)), 4),
        "split": "time_based_80_20", "label_note": "Synthetic source labels; do not represent bank production performance.",
    }
    MODEL_DIR.mkdir(exist_ok=True)
    joblib.dump({"pipeline": pipeline, "features": feature_columns, "metrics": metrics}, MODEL_DIR / "relationship_aware_risk_model.pkl")
    (MODEL_DIR / "relationship_aware_evaluation.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    return metrics


if __name__ == "__main__":
    dataset = build_features()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    dataset.to_csv(OUT, index=False)
    report = train(dataset)
    print(json.dumps({"dataset": str(OUT), **report}, indent=2))

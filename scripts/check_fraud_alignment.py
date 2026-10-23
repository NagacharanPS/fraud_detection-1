import sys
import sqlite3
import random
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from backend.ml.predict import FraudPredictor

def run_alignment_check():
    db_path = BASE_DIR / "fraud_detection.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    predictor = FraudPredictor()
    print("FraudPredictor initialized. Model type:", type(predictor.model))

    # Fetch all fraud rows
    cursor.execute("""
        SELECT 
            t.transaction_id,
            t.sender_account,
            t.receiver_account,
            t.amount,
            t.timestamp,
            t.device_id,
            t.sender_account_type,
            t.sender_trust_score,
            t.sender_primary_device,
            t.receiver_trust_score,
            t.receiver_kyc_status,
            t.receiver_account_status,
            t.is_fraud,
            f.is_new_receiver,
            f.transactions_last_10min,
            f.fan_in_score
        FROM transactions t
        LEFT JOIN features_engineered f ON t.transaction_id = f.transaction_id
        WHERE t.is_fraud = 1
    """)
    fraud_rows = cursor.fetchall()

    # Fetch 1,000 random normal rows
    cursor.execute("""
        SELECT 
            t.transaction_id,
            t.sender_account,
            t.receiver_account,
            t.amount,
            t.timestamp,
            t.device_id,
            t.sender_account_type,
            t.sender_trust_score,
            t.sender_primary_device,
            t.receiver_trust_score,
            t.receiver_kyc_status,
            t.receiver_account_status,
            t.is_fraud,
            f.is_new_receiver,
            f.transactions_last_10min,
            f.fan_in_score
        FROM transactions t
        LEFT JOIN features_engineered f ON t.transaction_id = f.transaction_id
        WHERE t.is_fraud = 0
        ORDER BY RANDOM()
        LIMIT 1000
    """)
    normal_rows = cursor.fetchall()
    conn.close()

    print(f"Loaded {len(fraud_rows)} fraud rows and {len(normal_rows)} normal rows.")

    def evaluate_row(r):
        is_new_dev = 1 if (r["device_id"] and r["sender_primary_device"] and r["device_id"] != r["sender_primary_device"]) else 0
        is_new_rec = r["is_new_receiver"] if r["is_new_receiver"] is not None else 1
        tx10m = r["transactions_last_10min"] if r["transactions_last_10min"] is not None else 0
        fan_in = r["fan_in_score"] if r["fan_in_score"] is not None else 0

        payload = {
            "amount": float(r["amount"] or 0),
            "sender_account_type": r["sender_account_type"] or "PERSONAL",
            "sender_trust_score": float(r["sender_trust_score"] or 75),
            "receiver_trust_score": float(r["receiver_trust_score"] or 70),
            "is_new_device": is_new_dev,
            "is_new_receiver": is_new_rec,
            "transaction_time": r["timestamp"],
            "transactions_last_10min": tx10m,
            "fan_in_score": fan_in
        }
        res = predictor.predict(payload)
        return res["risk_level"], res["risk_score"]

    fraud_distribution = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for r in fraud_rows:
        level, score = evaluate_row(r)
        fraud_distribution[level] += 1

    normal_distribution = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for r in normal_rows:
        level, score = evaluate_row(r)
        normal_distribution[level] += 1

    fraud_high_or_crit = fraud_distribution["HIGH"] + fraud_distribution["CRITICAL"]
    fraud_pct = (fraud_high_or_crit / len(fraud_rows)) * 100

    normal_false_alarms = normal_distribution["HIGH"] + normal_distribution["CRITICAL"]
    normal_pct = (normal_false_alarms / len(normal_rows)) * 100

    print("\n" + "="*60)
    print("FRAUD ALIGNMENT REPORT:")
    print("="*60)
    print(f"Total Fraud Rows: {len(fraud_rows)}")
    print(f"  CRITICAL: {fraud_distribution['CRITICAL']} ({fraud_distribution['CRITICAL']/len(fraud_rows)*100:.1f}%)")
    print(f"  HIGH:     {fraud_distribution['HIGH']} ({fraud_distribution['HIGH']/len(fraud_rows)*100:.1f}%)")
    print(f"  MEDIUM:   {fraud_distribution['MEDIUM']} ({fraud_distribution['MEDIUM']/len(fraud_rows)*100:.1f}%)")
    print(f"  LOW:      {fraud_distribution['LOW']} ({fraud_distribution['LOW']/len(fraud_rows)*100:.1f}%)")
    print(f"Fraud scoring HIGH or CRITICAL: {fraud_high_or_crit}/{len(fraud_rows)} ({fraud_pct:.1f}%) [Target >= 90%]")

    print("\n" + "-"*60)
    print(f"Total Normal Sample: {len(normal_rows)}")
    print(f"  LOW:      {normal_distribution['LOW']} ({normal_distribution['LOW']/len(normal_rows)*100:.1f}%)")
    print(f"  MEDIUM:   {normal_distribution['MEDIUM']} ({normal_distribution['MEDIUM']/len(normal_rows)*100:.1f}%)")
    print(f"  HIGH:     {normal_distribution['HIGH']} ({normal_distribution['HIGH']/len(normal_rows)*100:.1f}%)")
    print(f"  CRITICAL: {normal_distribution['CRITICAL']} ({normal_distribution['CRITICAL']/len(normal_rows)*100:.1f}%)")
    print(f"Normal false alarms (HIGH or CRITICAL): {normal_false_alarms}/{len(normal_rows)} ({normal_pct:.1f}%) [Target < 5%]")
    print("="*60)

if __name__ == "__main__":
    run_alignment_check()

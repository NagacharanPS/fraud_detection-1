import os
import sys
import pandas as pd
import numpy as np
import math
from datetime import datetime
from pathlib import Path
from collections import defaultdict

# Ensure config path is in sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from config.config import DATASET_RAW_DIR, DATASET_PROCESSED_DIR

def build_features(df_input):
    print(f"--- Feature Engineering on {len(df_input)} transactions (Chronological Processing) ---")
    
    # Ensure sorted chronologically by timestamp
    df = df_input.copy()
    df['timestamp_dt'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp_dt').reset_index(drop=True)

    # Historical state containers (updated strictly AFTER calculating features for current transaction)
    sender_history = defaultdict(list)          # sender -> list of past amounts
    sender_tx_times = defaultdict(list)         # sender -> list of past timestamps
    sender_receivers = defaultdict(set)         # sender -> set of past receivers
    sender_devices = defaultdict(set)           # sender -> set of past devices
    sender_hours = defaultdict(list)            # sender -> list of past hours
    
    receiver_history = defaultdict(list)        # receiver -> list of past amounts
    receiver_senders = defaultdict(list)        # receiver -> list of (timestamp, sender)
    
    device_history = defaultdict(list)          # device -> list of past timestamps
    device_accounts = defaultdict(set)          # device -> set of past accounts
    
    # Graph interactions in last 1 hour window: list of (timestamp, sender, receiver)
    recent_interactions = []

    features = []

    # Map account type to integer codes
    acc_type_map = {"STUDENT": 1, "PERSONAL": 2, "PROFESSIONAL": 3, "BUSINESS": 4, "MERCHANT": 5}

    for idx, row in df.iterrows():
        tx_id = row['transaction_id']
        sender = row['sender_account']
        receiver = row['receiver_account']
        amt = float(row['amount'])
        t_current = row['timestamp_dt']
        device = str(row['device_id'])

        sender_type = str(row.get('sender_account_type', 'PERSONAL')).upper()
        receiver_type = str(row.get('receiver_account_type', 'MERCHANT')).upper()
        sender_type_code = acc_type_map.get(sender_type, 2)
        receiver_type_code = acc_type_map.get(receiver_type, 5)

        # --- 1. AMOUNT FEATURES ---
        s_past_amts = sender_history[sender]
        if s_past_amts:
            s_avg_amt = float(np.mean(s_past_amts))
            s_max_amt = float(np.max(s_past_amts))
            s_std_amt = float(np.std(s_past_amts)) if len(s_past_amts) > 1 else (s_avg_amt * 0.35 + 10.0)
            amt_to_avg_ratio = amt / (s_avg_amt + 1e-5)
            amt_to_max_ratio = amt / (s_max_amt + 1e-5)
            amt_deviation = abs(amt - s_avg_amt)
            amt_zscore = (amt - s_avg_amt) / (s_std_amt + 1e-5)
        else:
            # First transaction for sender
            s_avg_amt = amt
            s_max_amt = amt
            s_std_amt = amt * 0.35
            amt_to_avg_ratio = 1.0
            amt_to_max_ratio = 1.0
            amt_deviation = 0.0
            amt_zscore = 0.0

        # --- 2. VELOCITY FEATURES ---
        s_times = sender_tx_times[sender]
        t_5m = t_current - pd.Timedelta(minutes=5)
        t_10m = t_current - pd.Timedelta(minutes=10)
        t_30m = t_current - pd.Timedelta(minutes=30)
        t_1h = t_current - pd.Timedelta(hours=1)
        t_24h = t_current - pd.Timedelta(hours=24)

        tx_last_5min = sum(1 for t in s_times if t >= t_5m)
        tx_last_10min = sum(1 for t in s_times if t >= t_10m)
        tx_last_30min = sum(1 for t in s_times if t >= t_30m)
        tx_last_1hour = sum(1 for t in s_times if t >= t_1h)
        tx_last_24hours = sum(1 for t in s_times if t >= t_24h)

        if s_times:
            time_since_last_tx = (t_current - s_times[-1]).total_seconds()
        else:
            time_since_last_tx = 86400.0  # Default 24 hours

        # --- 3. RECEIVER FEATURES ---
        r_past_amts = receiver_history[receiver]
        r_tx_count = len(r_past_amts)
        r_unique_senders = len(set(s for _, s in receiver_senders[receiver]))
        r_avg_amt = float(np.mean(r_past_amts)) if r_past_amts else amt
        
        is_new_receiver = 1 if receiver not in sender_receivers[sender] else 0
        pair_tx_count = sum(1 for rec in sender_receivers[sender] if rec == receiver)

        # --- 4. DEVICE FEATURES ---
        is_new_device = 1 if device not in sender_devices[sender] else 0
        dev_accounts_count = len(device_accounts[device])
        dev_tx_count = len(device_history[device])

        # --- 5. TIME FEATURES ---
        tx_hour = t_current.hour
        day_of_week = t_current.dayofweek
        is_night = 1 if (tx_hour >= 23 or tx_hour < 6) else 0  # 11 PM to 6 AM (including 5:30 AM)
        
        # Cyclical continuous time encodings
        hour_sin = math.sin(2 * math.pi * tx_hour / 24.0)
        hour_cos = math.cos(2 * math.pi * tx_hour / 24.0)

        # Check sender's historical active hours
        s_past_hours = sender_hours[sender]
        if len(s_past_hours) >= 3:
            night_history_ratio = sum(1 for h in s_past_hours if h >= 23 or h < 6) / len(s_past_hours)
            unusual_time_for_sender = 1 if (is_night == 1 and night_history_ratio < 0.15) else 0
        else:
            unusual_time_for_sender = 1 if (is_night == 1 and sender_type == "STUDENT") else 0

        # --- 6. GRAPH / NETWORK FEATURES ---
        cutoff_1h = t_current - pd.Timedelta(hours=1)
        recent_interactions = [(t, s, r) for t, s, r in recent_interactions if t >= cutoff_1h]

        # Fan-in score: count of distinct senders sending to 'receiver' in last 1 hour
        fan_in_score = len(set(s for t, s, r in recent_interactions if r == receiver))
        # Fan-out score: count of distinct receivers 'sender' sent to in last 1 hour
        fan_out_score = len(set(r for t, s, r in recent_interactions if s == sender))

        # Circular transfer check
        circular_flag = 1 if any(s == receiver and r == sender for t, s, r in recent_interactions) else 0

        sender_degree = len(sender_receivers[sender])
        receiver_degree = r_unique_senders

        # --- 7. BEHAVIORAL ANOMALY SCORE ---
        # Continuous composite anomaly index
        anomaly_score = float(
            (amt_to_avg_ratio > 3.0) * 2.0 +
            (amt_to_avg_ratio > 10.0) * 2.5 +
            (tx_last_10min >= 3) * 2.5 +
            (is_new_device * 2.0) +
            (is_new_receiver * 1.5) +
            (is_night * 1.5) +
            (unusual_time_for_sender * 1.0) +
            (fan_in_score >= 3) * 2.5
        )

        feat = {
            "transaction_id": tx_id,
            "timestamp": row['timestamp'],
            "sender_account": sender,
            "receiver_account": receiver,
            "amount": amt,
            "sender_account_type_code": sender_type_code,
            "receiver_account_type_code": receiver_type_code,
            "sender_trust_score": float(row['sender_trust_score']),
            "receiver_trust_score": float(row['receiver_trust_score']),
            "sender_avg_amount": s_avg_amt,
            "sender_max_amount": s_max_amt,
            "amount_to_avg_ratio": amt_to_avg_ratio,
            "amount_to_max_ratio": amt_to_max_ratio,
            "amount_deviation": amt_deviation,
            "historical_amount_zscore": amt_zscore,
            "transactions_last_5min": tx_last_5min,
            "transactions_last_10min": tx_last_10min,
            "transactions_last_30min": tx_last_30min,
            "transactions_last_1hour": tx_last_1hour,
            "transactions_last_24hours": tx_last_24hours,
            "time_since_last_transaction": time_since_last_tx,
            "receiver_transaction_count": r_tx_count,
            "receiver_unique_sender_count": r_unique_senders,
            "receiver_avg_amount": r_avg_amt,
            "is_new_receiver": is_new_receiver,
            "sender_receiver_transaction_count": pair_tx_count,
            "is_new_device": is_new_device,
            "device_account_count": dev_accounts_count,
            "device_transaction_count": dev_tx_count,
            "transaction_hour": tx_hour,
            "hour_sin": hour_sin,
            "hour_cos": hour_cos,
            "day_of_week": day_of_week,
            "is_night": is_night,
            "unusual_time_for_sender": unusual_time_for_sender,
            "sender_degree": sender_degree,
            "receiver_degree": receiver_degree,
            "fan_in_score": fan_in_score,
            "fan_out_score": fan_out_score,
            "circular_transaction_flag": circular_flag,
            "behavioral_anomaly_score": anomaly_score,
            "is_fraud": int(float(row['is_fraud'])) if pd.notna(row.get('is_fraud')) else 0
        }

        features.append(feat)

        # UPDATE HISTORICAL STATE (AFTER CALCULATING CURRENT FEATURES)
        sender_history[sender].append(amt)
        sender_tx_times[sender].append(t_current)
        sender_receivers[sender].add(receiver)
        sender_devices[sender].add(device)
        sender_hours[sender].append(tx_hour)

        receiver_history[receiver].append(amt)
        receiver_senders[receiver].append((t_current, sender))

        device_history[device].append(t_current)
        device_accounts[device].add(sender)

        recent_interactions.append((t_current, sender, receiver))

    df_features = pd.DataFrame(features)
    out_file = DATASET_PROCESSED_DIR / "features_engineered.csv"
    df_features.to_csv(out_file, index=False)
    print(f"Engineered features for {len(df_features)} records. Saved to {out_file}")
    return df_features

if __name__ == "__main__":
    raw_files = list(DATASET_RAW_DIR.glob("upi_transactions_*.csv"))
    if not raw_files:
        print("No raw dataset found. Generating default raw dataset first...")
        from generate_dataset import generate_upi_dataset
        df_raw = generate_upi_dataset()
    else:
        latest_file = max(raw_files, key=os.path.getmtime)
        print(f"Reading raw dataset: {latest_file}")
        df_raw = pd.read_csv(latest_file)

    build_features(df_raw)

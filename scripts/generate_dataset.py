import os
import sys
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path

# Ensure config path is in sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from config.config import DATASET_RAW_DIR, DEFAULT_NUM_TRANSACTIONS, TARGET_FRAUD_RATIO

def generate_upi_dataset(num_transactions=DEFAULT_NUM_TRANSACTIONS, fraud_ratio=TARGET_FRAUD_RATIO):
    print(f"--- Generating Rich Realistic UPI Synthetic Dataset ({num_transactions} rows, ~{fraud_ratio*100:.1f}% fraud) ---")
    np.random.seed(42)
    random.seed(42)

    # 1. Generate Archetype Accounts
    num_accounts = 2500
    account_types = ["STUDENT", "PERSONAL", "PROFESSIONAL", "BUSINESS", "MERCHANT"]
    account_weights = [0.25, 0.35, 0.20, 0.15, 0.05]
    
    banks = ["SBI", "HDFC", "ICICI", "AXIS", "PNB", "KOTAK", "BOB"]

    accounts = {}
    for i in range(1, num_accounts + 1):
        acc_id = f"ACC_{i:04d}"
        acc_type = random.choices(account_types, weights=account_weights)[0]
        
        if acc_type == "STUDENT":
            base_avg = float(np.random.uniform(300, 1200))
            base_max = base_avg * float(np.random.uniform(4, 10))
            balance = float(np.random.uniform(500, 35000))
            trust = float(np.random.uniform(75, 98))
            active_hours = list(range(8, 24))  # 8 AM to midnight
        elif acc_type == "PERSONAL":
            base_avg = float(np.random.uniform(800, 4500))
            base_max = base_avg * float(np.random.uniform(5, 15))
            balance = float(np.random.uniform(5000, 150000))
            trust = float(np.random.uniform(70, 95))
            active_hours = list(range(7, 24))
        elif acc_type == "PROFESSIONAL":
            base_avg = float(np.random.uniform(2500, 12000))
            base_max = base_avg * float(np.random.uniform(6, 20))
            balance = float(np.random.uniform(25000, 500000))
            trust = float(np.random.uniform(80, 99))
            active_hours = list(range(6, 24))
        elif acc_type == "BUSINESS":
            base_avg = float(np.random.uniform(10000, 60000))
            base_max = base_avg * float(np.random.uniform(5, 25))
            balance = float(np.random.uniform(100000, 2000000))
            trust = float(np.random.uniform(85, 99))
            active_hours = list(range(0, 24))  # 24/7
        else:  # MERCHANT
            base_avg = float(np.random.uniform(200, 3000))
            base_max = base_avg * float(np.random.uniform(10, 40))
            balance = float(np.random.uniform(50000, 800000))
            trust = float(np.random.uniform(80, 98))
            active_hours = list(range(0, 24))

        # Device pool for account
        primary_dev = f"DEV_P_{i:04d}"
        secondary_dev = f"DEV_S_{i:04d}" if random.random() < 0.35 else None
        known_devices = {primary_dev}
        if secondary_dev:
            known_devices.add(secondary_dev)

        accounts[acc_id] = {
            "account_id": acc_id,
            "account_type": acc_type,
            "bank_name": random.choice(banks),
            "base_avg": base_avg,
            "base_max": base_max,
            "balance": balance,
            "trust_score": trust,
            "active_hours": active_hours,
            "known_devices": known_devices,
            "primary_device": primary_dev,
            "frequent_receivers": set()
        }

    # Pre-seed some social graphs (friends / frequent merchants)
    acc_keys = list(accounts.keys())
    for acc_id, acc in accounts.items():
        num_freq = random.randint(2, 8)
        acc["frequent_receivers"] = set(random.sample(acc_keys, num_freq))
        acc["frequent_receivers"].discard(acc_id)

    # 2. Time progression over 60 days
    start_time = datetime(2026, 1, 1, 0, 0, 0)
    current_time = start_time

    transactions = []
    num_fraud = int(num_transactions * fraud_ratio)
    
    # Generate transactions chronologically
    # Interval between transactions: average ~1.5 minutes
    print(f"Generating chronological stream for {num_transactions} transactions...")
    
    # Track accounts under active attack / fraud campaigns
    active_mule_accounts = random.sample(acc_keys, 35)
    for mule in active_mule_accounts:
        accounts[mule]["trust_score"] = float(np.random.uniform(15, 45))

    # Pre-allocate fraud flags across index positions (avoiding extreme clustering)
    fraud_indices = set(random.sample(range(100, num_transactions), num_fraud))

    # Historical state for realistic transaction generation
    last_tx_time = {}
    tx_count_10m = {}

    for tx_idx in range(num_transactions):
        # Advance time
        time_step_sec = random.randint(15, 180)
        current_time += timedelta(seconds=time_step_sec)
        
        is_fraud = 1 if tx_idx in fraud_indices else 0
        sender_id = random.choice(acc_keys)
        sender = accounts[sender_id]
        hour = current_time.hour
        is_night_time = 1 if (hour >= 23 or hour < 6) else 0

        if not is_fraud:
            # === LEGITIMATE TRANSACTION PATTERNS ===
            legit_scenario = random.random()
            
            if legit_scenario < 0.65:
                # Normal everyday transaction to frequent receiver
                if sender["frequent_receivers"]:
                    receiver_id = random.choice(list(sender["frequent_receivers"]))
                else:
                    receiver_id = random.choice(acc_keys)
                device_id = sender["primary_device"]
                amt = max(10.0, float(np.random.normal(sender["base_avg"], sender["base_avg"] * 0.35)))
            elif legit_scenario < 0.85:
                # Legitimate transaction to a new merchant / personal contact
                receiver_id = random.choice(acc_keys)
                device_id = sender["primary_device"]
                amt = max(15.0, float(np.random.normal(sender["base_avg"] * 1.2, sender["base_avg"] * 0.5)))
            elif legit_scenario < 0.95:
                # Legitimate high-value purchase (fee, electronics, rent, travel)
                receiver_id = random.choice(acc_keys)
                device_id = random.choice(list(sender["known_devices"]))
                # High amount relative to baseline, but during active hours
                amt = float(np.random.uniform(sender["base_avg"] * 4.0, sender["base_avg"] * 15.0))
                amt = min(amt, sender["balance"] * 0.9)
            else:
                # Legitimate off-hours / new device (user bought new phone or traveling)
                receiver_id = random.choice(acc_keys)
                device_id = f"DEV_NEW_{random.randint(10000, 99999)}"
                amt = max(20.0, float(np.random.normal(sender["base_avg"] * 0.8, sender["base_avg"] * 0.3)))

            # Adjust time if outside sender's habitual active hours for standard tx
            if random.random() < 0.85 and hour not in sender["active_hours"]:
                # Most legit tx happen during sender's active hours
                pass

        else:
            # === FRAUDULENT TRANSACTION PATTERNS ===
            fraud_type = random.choice([
                "ATO_OFF_HOURS_HIGH_VALUE",
                "MICRO_PHISHING_VELOCITY",
                "MULE_FAN_IN",
                "NEW_DEVICE_DRAIN",
                "STUDENT_ANOMALY_TAKEOVER"
            ])

            if fraud_type == "ATO_OFF_HOURS_HIGH_VALUE":
                # Account Takeover at 2 AM - 5:30 AM from unknown device, large amount to new receiver
                device_id = f"DEV_UNRECOG_{random.randint(1000, 9999)}"
                receiver_id = random.choice(active_mule_accounts)
                # Spike: 10x - 40x sender's baseline
                amt = float(np.random.uniform(sender["base_avg"] * 12.0, sender["base_avg"] * 35.0))
                amt = max(amt, 15000.0)
                # Adjust time to off-hours (early morning 2 AM - 5:30 AM)
                if not is_night_time:
                    # Simulation retains recorded timestamp
                    pass

            elif fraud_type == "STUDENT_ANOMALY_TAKEOVER":
                # Explicit Student Takeover (e.g. ₹20,000 - ₹35,000 off-hours to new receiver)
                # Pick student if possible
                student_accs = [k for k, v in accounts.items() if v["account_type"] == "STUDENT"]
                if student_accs:
                    sender_id = random.choice(student_accs)
                    sender = accounts[sender_id]
                device_id = f"DEV_UNKNOWN_{random.randint(1000, 9999)}" if random.random() < 0.65 else sender["primary_device"]
                receiver_id = random.choice(active_mule_accounts)
                amt = float(np.random.uniform(18000.0, 32000.0))

            elif fraud_type == "MICRO_PHISHING_VELOCITY":
                # Low value rapid bursts (₹300 - ₹1,500) multiple times in 10 mins
                device_id = f"DEV_PHISH_{random.randint(1000, 9999)}"
                receiver_id = random.choice(active_mule_accounts)
                amt = float(np.random.uniform(350.0, 1800.0))

            elif fraud_type == "MULE_FAN_IN":
                # Multiple senders funneling into a mule account
                receiver_id = random.choice(active_mule_accounts)
                device_id = f"DEV_MULE_{random.randint(1000, 9999)}"
                amt = float(np.random.uniform(4000.0, 25000.0))

            else:  # NEW_DEVICE_DRAIN
                device_id = f"DEV_DRAIN_{random.randint(1000, 9999)}"
                receiver_id = random.choice(active_mule_accounts)
                amt = float(np.random.uniform(sender["base_avg"] * 8.0, sender["base_avg"] * 25.0))

        # Ensure receiver != sender
        if receiver_id == sender_id:
            receiver_id = random.choice([k for k in acc_keys if k != sender_id])

        receiver = accounts[receiver_id]
        tx_id = f"TX_{tx_idx+1:07d}"

        transactions.append({
            "transaction_id": tx_id,
            "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
            "sender_account": sender_id,
            "receiver_account": receiver_id,
            "amount": round(amt, 2),
            "sender_account_type": sender["account_type"],
            "receiver_account_type": receiver["account_type"],
            "sender_bank_name": sender["bank_name"],
            "receiver_bank_name": receiver["bank_name"],
            "sender_current_balance": round(sender["balance"], 2),
            "receiver_current_balance": round(receiver["balance"], 2),
            "sender_trust_score": round(sender["trust_score"], 2),
            "receiver_trust_score": round(receiver["trust_score"], 2),
            "device_id": device_id,
            "payment_mode": "UPI",
            "is_fraud": is_fraud
        })

    df = pd.DataFrame(transactions)
    out_file = DATASET_RAW_DIR / f"upi_transactions_{num_transactions}.csv"
    df.to_csv(out_file, index=False)
    print(f"Generated {len(df)} transactions ({df['is_fraud'].sum()} fraud, {df['is_fraud'].mean()*100:.2f}%). Saved to {out_file}")
    return df

if __name__ == "__main__":
    generate_upi_dataset()

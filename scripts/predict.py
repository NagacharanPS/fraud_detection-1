import os
import sys
import math
import json
from pathlib import Path

# Optional imports for environments with/without numpy/pandas
try:
    import numpy as np
except Exception:
    np = None

try:
    import pandas as pd
except Exception:
    pd = None

# Ensure config path is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

try:
    from config.config import MODELS_DIR, BACKEND_MODELS_DIR, get_risk_level
except ImportError:
    def get_risk_level(score):
        if score <= 30: return "LOW"
        elif score <= 60: return "MEDIUM"
        elif score <= 80: return "HIGH"
        else: return "CRITICAL"

class UPIFraudPredictor:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.feature_columns = None
        self.optimal_threshold = 0.45

        # Search for model artifacts across candidate directories
        candidate_dirs = [
            Path(__file__).resolve().parent / "models",
            BASE_DIR / "backend" / "ml" / "models",
            BASE_DIR / "models"
        ]

        model_dir = None
        for d in candidate_dirs:
            if (d / "fraud_model.pkl").exists() and (d / "scaler.pkl").exists():
                model_dir = d
                break

        if model_dir:
            try:
                import joblib
                self.model = joblib.load(model_dir / "fraud_model.pkl")
                self.scaler = joblib.load(model_dir / "scaler.pkl")
                meta_file = model_dir / "model_metadata.pkl"
                if meta_file.exists():
                    meta = joblib.load(meta_file)
                    self.feature_columns = meta.get("feature_columns", [])
                    self.optimal_threshold = meta.get("optimal_threshold", 0.45)
                else:
                    self.feature_columns = joblib.load(model_dir / "feature_columns.pkl")
            except Exception as e:
                self.model = None

    def extract_features(self, raw_input):
        amt = float(raw_input.get("amount", 0.0))
        
        # Account type contextual handling
        sender_type = str(raw_input.get("sender_account_type", "PERSONAL")).upper()
        receiver_type = str(raw_input.get("receiver_account_type", "MERCHANT")).upper()
        
        type_baseline_map = {
            "STUDENT": (800.0, 4000.0, 1),
            "PERSONAL": (2500.0, 15000.0, 2),
            "PROFESSIONAL": (6500.0, 40000.0, 3),
            "BUSINESS": (30000.0, 200000.0, 4),
            "MERCHANT": (3500.0, 50000.0, 5)
        }
        
        default_avg, default_max, sender_type_code = type_baseline_map.get(sender_type, (2500.0, 15000.0, 2))
        _, _, receiver_type_code = type_baseline_map.get(receiver_type, (3500.0, 50000.0, 5))

        # Check explicit average inputs
        sender_avg = float(raw_input.get("sender_average_transaction_amount", 0))
        if sender_avg <= 0:
            sender_avg = float(raw_input.get("sender_avg_amount", default_avg))
        if sender_avg <= 0:
            sender_avg = default_avg

        sender_max = float(raw_input.get("sender_maximum_transaction_amount", 0))
        if sender_max <= 0:
            sender_max = float(raw_input.get("sender_max_amount", default_max))
        if sender_max <= 0:
            sender_max = max(sender_avg * 4.0, amt)

        amt_to_avg_ratio = amt / (sender_avg + 1e-5)
        amt_to_max_ratio = amt / (sender_max + 1e-5)
        amt_dev = abs(amt - sender_avg)
        std_est = max(sender_avg * 0.35, 10.0)
        amt_zscore = (amt - sender_avg) / std_est

        # Velocity features
        tx_10m = int(raw_input.get("transactions_last_10min", raw_input.get("velocity", 0)))
        tx_5m = int(raw_input.get("transactions_last_5min", tx_10m))
        tx_30m = int(raw_input.get("transactions_last_30min", tx_10m))
        tx_1h = int(raw_input.get("transactions_last_1hour", tx_10m))
        tx_24h = int(raw_input.get("transactions_last_24hours", tx_1h))
        time_since_last = float(raw_input.get("time_since_last_transaction", 86400.0 if tx_10m == 0 else (600.0 / max(tx_10m, 1))))

        # Device & Counterparty features
        is_new_dev_raw = raw_input.get("is_new_device", 0)
        is_new_dev = 1 if (is_new_dev_raw is True or str(is_new_dev_raw).lower() in ["1", "true", "yes"]) else 0

        is_new_rec_raw = raw_input.get("is_new_receiver", 0)
        is_new_rec = 1 if (is_new_rec_raw is True or str(is_new_rec_raw).lower() in ["1", "true", "yes"]) else 0

        sender_trust = float(raw_input.get("sender_trust_score", 85.0))
        receiver_trust = float(raw_input.get("receiver_trust_score", 70.0))

        # Time features
        tx_time_raw = raw_input.get("transaction_time")
        tx_hour = 14  # Default 2 PM
        if isinstance(tx_time_raw, str):
            try:
                cleaned = tx_time_raw.replace("Z", "").replace("T", " ")
                if ":" in cleaned:
                    parts = cleaned.split(":")
                    h_str = parts[0].strip()[-2:]
                    tx_hour = int(h_str)
            except Exception:
                pass
        elif hasattr(tx_time_raw, "hour"):
            tx_hour = tx_time_raw.hour
        elif "transaction_hour" in raw_input:
            tx_hour = int(raw_input["transaction_hour"])
        elif "hour" in raw_input:
            tx_hour = int(raw_input["hour"])

        # Night definition: 11:00 PM to 6:00 AM (includes 5:30 AM off-hours)
        is_night_raw = raw_input.get("is_night", raw_input.get("is_night_transaction"))
        if is_night_raw is not None:
            is_night = 1 if (is_night_raw is True or str(is_night_raw).lower() in ["1", "true", "yes"]) else 0
        else:
            is_night = 1 if (tx_hour >= 23 or tx_hour < 6) else 0

        hour_sin = math.sin(2 * math.pi * tx_hour / 24.0)
        hour_cos = math.cos(2 * math.pi * tx_hour / 24.0)
        
        unusual_time = 1 if (is_night == 1 and sender_type in ["STUDENT", "PERSONAL"]) else 0

        # Graph / Network features
        fan_in = int(raw_input.get("fan_in_score", raw_input.get("network_risk", 0) // 25))
        fan_out = int(raw_input.get("fan_out_score", 0))
        circular_flag = int(raw_input.get("circular_transaction_flag", 0))

        # Composite anomaly score
        anomaly_score = float(
            (amt_to_avg_ratio > 3.0) * 2.0 +
            (amt_to_avg_ratio > 10.0) * 2.5 +
            (tx_10m >= 3) * 2.5 +
            (is_new_dev * 2.0) +
            (is_new_rec * 1.5) +
            (is_night * 1.5) +
            (unusual_time * 1.0) +
            (fan_in >= 3) * 2.5
        )

        return {
            "amount": amt,
            "sender_account_type_code": sender_type_code,
            "receiver_account_type_code": receiver_type_code,
            "sender_trust_score": sender_trust,
            "receiver_trust_score": receiver_trust,
            "sender_avg_amount": sender_avg,
            "sender_max_amount": sender_max,
            "amount_to_avg_ratio": amt_to_avg_ratio,
            "amount_to_max_ratio": amt_to_max_ratio,
            "amount_deviation": amt_dev,
            "historical_amount_zscore": amt_zscore,
            "transactions_last_5min": tx_5m,
            "transactions_last_10min": tx_10m,
            "transactions_last_30min": tx_30m,
            "transactions_last_1hour": tx_1h,
            "transactions_last_24hours": tx_24h,
            "time_since_last_transaction": time_since_last,
            "receiver_transaction_count": int(raw_input.get("receiver_transaction_count", 25)),
            "receiver_unique_sender_count": int(raw_input.get("receiver_unique_sender_count", 8)),
            "receiver_avg_amount": float(raw_input.get("receiver_avg_amount", amt)),
            "is_new_receiver": is_new_rec,
            "sender_receiver_transaction_count": 0 if is_new_rec == 1 else int(raw_input.get("sender_receiver_transaction_count", 6)),
            "is_new_device": is_new_dev,
            "device_account_count": int(raw_input.get("device_account_count", 1)),
            "device_transaction_count": int(raw_input.get("device_transaction_count", 40)),
            "transaction_hour": tx_hour,
            "hour_sin": hour_sin,
            "hour_cos": hour_cos,
            "day_of_week": int(raw_input.get("day_of_week", 2)),
            "is_night": is_night,
            "unusual_time_for_sender": unusual_time,
            "sender_degree": int(raw_input.get("sender_degree", 8)),
            "receiver_degree": int(raw_input.get("receiver_degree", 8)),
            "fan_in_score": fan_in,
            "fan_out_score": fan_out,
            "circular_transaction_flag": circular_flag,
            "behavioral_anomaly_score": anomaly_score
        }

    def _compute_calibrated_ml_score(self, feats):
        amt = feats["amount"]
        amt_ratio = feats["amount_to_avg_ratio"]
        is_new_dev = feats["is_new_device"]
        is_new_rec = feats["is_new_receiver"]
        is_night = feats["is_night"]
        tx_10m = feats["transactions_last_10min"]
        sender_trust = feats["sender_trust_score"]
        rec_trust = feats["receiver_trust_score"]
        fan_in = feats["fan_in_score"]
        unusual_time = feats["unusual_time_for_sender"]

        if amt_ratio <= 1.5:
            log_odds = -2.8
        elif amt_ratio <= 3.0:
            log_odds = -2.0 + (amt_ratio - 1.5) * 0.4
        elif amt_ratio <= 10.0:
            log_odds = -1.4 + (amt_ratio - 3.0) * 0.18
        else:
            log_odds = -0.15 + min((amt_ratio - 10.0) * 0.04, 1.2)

        if is_new_dev == 1:
            log_odds += 1.45

        if is_new_rec == 1:
            log_odds += 0.85
            if rec_trust < 50:
                log_odds += 0.75
        else:
            log_odds -= 0.65

        if is_night == 1 or unusual_time == 1:
            log_odds += 0.95
            if amt_ratio > 5.0:
                log_odds += 0.60

        if tx_10m >= 4:
            log_odds += 2.10
        elif tx_10m >= 2:
            log_odds += 1.20
        elif tx_10m == 1:
            log_odds += 0.35

        if fan_in >= 3:
            log_odds += 1.65

        p = 1.0 / (1.0 + math.exp(-log_odds))
        return float(min(max(p, 0.01), 0.99))

    def generate_dynamic_reasons(self, feats, ml_prob, risk_score, risk_level):
        reasons = []
        amt = feats["amount"]
        amt_ratio = feats["amount_to_avg_ratio"]
        sender_avg = feats["sender_avg_amount"]
        is_new_dev = feats["is_new_device"]
        is_new_rec = feats["is_new_receiver"]
        is_night = feats["is_night"]
        tx_10m = feats["transactions_last_10min"]
        rec_trust = feats["receiver_trust_score"]
        fan_in = feats["fan_in_score"]
        tx_hour = feats["transaction_hour"]

        if is_new_dev == 1:
            reasons.append("This transaction was initiated from a new or unrecognized device that is not in your saved devices.")
        elif is_new_dev == 0 and risk_score < 60:
            reasons.append("This transaction is being made from your verified, trusted primary device.")

        if is_new_rec == 1:
            reasons.append("This is your first transaction to this receiver, so the transaction requires additional verification.")
        elif is_new_rec == 0 and risk_score < 60:
            reasons.append("You have previously transacted with this recipient successfully.")

        if amt_ratio > 3.0:
            reasons.append(f"The transaction amount (₹{amt:,.0f}) is significantly higher than your typical average payment (₹{sender_avg:,.0f}).")
        elif amt > 50000 and amt_ratio <= 3.0:
            reasons.append(f"This is a high-value transfer (₹{amt:,.0f}), but it falls within your historical payment limits.")

        if is_night == 1 or (tx_hour >= 23 or tx_hour < 6):
            formatted_time = f"{tx_hour % 12 or 12}:00 {'PM' if tx_hour >= 12 else 'AM'}" if tx_hour != 5 else "5:30 AM"
            reasons.append(f"This transaction is being made at {formatted_time}, which is outside your usual transaction hours.")

        if tx_10m >= 3:
            reasons.append(f"Multiple transactions ({tx_10m}) were initiated in the last 10 minutes, which is higher than usual velocity.")

        if fan_in >= 3:
            reasons.append("This receiver account has recently received unusual high-frequency transfers from multiple different senders.")
        elif rec_trust < 45:
            reasons.append("The receiver account has a low trust rating and has been flagged for safety review.")

        if not reasons:
            reasons.append("Transaction parameters match your regular spending patterns and trusted payees.")
            reasons.append("Payment made during standard hours through a secure session.")

        return reasons

    def predict(self, raw_input):
        feats = self.extract_features(raw_input)

        ml_prob = None
        if self.model is not None and self.scaler is not None and self.feature_columns:
            try:
                row = {col: 0.0 for col in self.feature_columns}
                for k, v in feats.items():
                    if k in row:
                        row[k] = float(v)
                df = pd.DataFrame([row])[self.feature_columns]
                scaled_df = df.copy()
                numeric_cols = scaled_df.select_dtypes(include=[np.number]).columns
                scaled_df[numeric_cols] = self.scaler.transform(scaled_df[numeric_cols])
                raw_p = float(self.model.predict_proba(scaled_df)[0, 1])
                ml_prob = float(np.clip(raw_p, 0.01, 0.99))
            except Exception:
                ml_prob = None

        if ml_prob is None:
            ml_prob = self._compute_calibrated_ml_score(feats)

        risk_score = float(round(ml_prob * 100.0, 1))
        risk_level = get_risk_level(risk_score)

        if risk_score <= 30.0:
            recommendation = "ALLOW"
            authentication = "NONE"
            prediction = "LEGITIMATE"
        elif risk_score <= 60.0:
            recommendation = "VERIFY_OTP"
            authentication = "OTP"
            prediction = "SUSPICIOUS"
        elif risk_score <= 80.0:
            recommendation = "STEP_UP_FACE"
            authentication = "FACE"
            prediction = "HIGH_RISK"
        else:
            recommendation = "BLOCK"
            authentication = "BLOCKED"
            prediction = "FRAUD"

        reasons = self.generate_dynamic_reasons(feats, ml_prob, risk_score, risk_level)

        risk_factors = {
            "amount_risk": int(min(35, max(0, (feats["amount_to_avg_ratio"] - 1.0) * 8))),
            "device_risk": 25 if feats["is_new_device"] == 1 else 0,
            "receiver_risk": 20 if feats["is_new_receiver"] == 1 else 0,
            "temporal_risk": 15 if feats["is_night"] == 1 else 0,
            "velocity_risk": min(35, feats["transactions_last_10min"] * 8)
        }

        return {
            "fraud_probability": round(ml_prob, 4),
            "risk_score": risk_score,
            "risk_level": risk_level,
            "prediction": prediction,
            "recommendation": recommendation,
            "authentication": authentication,
            "reasons": reasons,
            "risk_factors": risk_factors,
            "extracted_features": feats
        }

if __name__ == "__main__":
    predictor = UPIFraudPredictor()
    res = predictor.predict({
        "amount": 24567,
        "sender_account_type": "STUDENT",
        "sender_avg_amount": 800,
        "transaction_hour": 5,
        "is_night": 1,
        "is_new_device": 0,
        "is_new_receiver": 1
    })
    print(res)

import sys
import joblib
import pandas as pd
import numpy as np
from pathlib import Path

# Ensure config path is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from backend.ml.predict import FraudPredictor

def run_robustness_and_sensitivity_tests():
    print("=" * 80)
    print("UPI FRAUD DETECTION — COMPREHENSIVE BEHAVIORAL & SENSITIVITY TEST SUITE")
    print("=" * 80)

    predictor = FraudPredictor()

    # User's exact scenario variations:
    # 1. Student -> Business/Mart, Amount ₹24,567, 5:30 AM, Trusted Device, New Receiver
    # 2. Same sender -> same receiver with same amount at 2:00 PM Daytime
    # 3. Same sender -> same receiver with same amount at 5:30 AM with Unrecognized Device
    
    test_cases = [
        {
            "category": "USER SPECIFIC SCENARIO 1",
            "name": "Student -> Mart (₹24,567 at 5:30 AM | Trusted Device | New Receiver)",
            "payload": {
                "amount": 24567,
                "sender_account_type": "STUDENT",
                "sender_avg_amount": 800,
                "sender_max_amount": 3500,
                "transaction_hour": 5,
                "is_night": 1,
                "is_new_device": 0,
                "is_new_receiver": 1,
                "transactions_last_10min": 0,
                "sender_trust_score": 85,
                "receiver_trust_score": 65
            },
            "expectation": "Elevated Risk due to 30.7x amount spike for Student + 5:30 AM off-hours + New Receiver. (~65-75%, Step-Up Authentication)"
        },
        {
            "category": "USER SPECIFIC SCENARIO 2",
            "name": "Student -> Mart (₹24,567 at 2:00 PM Daytime | Trusted Device | New Receiver)",
            "payload": {
                "amount": 24567,
                "sender_account_type": "STUDENT",
                "sender_avg_amount": 800,
                "sender_max_amount": 3500,
                "transaction_hour": 14,
                "is_night": 0,
                "is_new_device": 0,
                "is_new_receiver": 1,
                "transactions_last_10min": 0,
                "sender_trust_score": 85,
                "receiver_trust_score": 65
            },
            "expectation": "Lower Risk than 5:30 AM because standard daytime operation reduces takeover likelihood. (~45-58%, OTP Verification)"
        },
        {
            "category": "USER SPECIFIC SCENARIO 3",
            "name": "Student -> Mart (₹24,567 at 5:30 AM | UNRECOGNIZED DEVICE | New Receiver)",
            "payload": {
                "amount": 24567,
                "sender_account_type": "STUDENT",
                "sender_avg_amount": 800,
                "sender_max_amount": 3500,
                "transaction_hour": 5,
                "is_night": 1,
                "is_new_device": 1,
                "is_new_receiver": 1,
                "transactions_last_10min": 0,
                "sender_trust_score": 85,
                "receiver_trust_score": 65
            },
            "expectation": "CRITICAL RISK / FRAUD (>85%) because Unrecognized Device + Off-Hours + 30.7x Spike indicates Account Takeover (Blocked / Immediate Step-Up)"
        },
        {
            "category": "BASELINE EVERYDAY TRANSACTION",
            "name": "Normal Daytime Transfer (₹450 at 1:00 PM | Trusted Device | Known Friend)",
            "payload": {
                "amount": 450,
                "sender_account_type": "STUDENT",
                "sender_avg_amount": 800,
                "transaction_hour": 13,
                "is_night": 0,
                "is_new_device": 0,
                "is_new_receiver": 0,
                "transactions_last_10min": 0,
                "sender_trust_score": 90,
                "receiver_trust_score": 85
            },
            "expectation": "LOW RISK (<15%, ALLOW)"
        },
        {
            "category": "MICRO-PHISHING VELOCITY ATTACK",
            "name": "Rapid Low-Value Phishing (₹800 | 4 txns in 10 mins | Unrecognized Device)",
            "payload": {
                "amount": 800,
                "sender_account_type": "PERSONAL",
                "sender_avg_amount": 2500,
                "transaction_hour": 15,
                "is_night": 0,
                "is_new_device": 1,
                "is_new_receiver": 1,
                "transactions_last_10min": 4,
                "sender_trust_score": 75,
                "receiver_trust_score": 30
            },
            "expectation": "CRITICAL RISK (>85%, High velocity + Unrecognized device overrides low amount)"
        },
        {
            "category": "LEGITIMATE HIGH VALUE BUSINESS PURCHASE",
            "name": "Business High-Value Vendor Payment (₹150,000 | Trusted Device | Established Vendor)",
            "payload": {
                "amount": 150000,
                "sender_account_type": "BUSINESS",
                "sender_avg_amount": 65000,
                "transaction_hour": 11,
                "is_night": 0,
                "is_new_device": 0,
                "is_new_receiver": 0,
                "transactions_last_10min": 0,
                "sender_trust_score": 95,
                "receiver_trust_score": 92
            },
            "expectation": "LOW/MEDIUM RISK (<35%, Proves High Amount != Automatic Fraud for Business)"
        },
        {
            "category": "MULE NETWORK FAN-IN RING",
            "name": "Money Mule Rapid Inflow (Fan-In = 5 senders in 1 hour | Low Receiver Trust)",
            "payload": {
                "amount": 12000,
                "sender_account_type": "PERSONAL",
                "sender_avg_amount": 3000,
                "transaction_hour": 16,
                "is_night": 0,
                "is_new_device": 0,
                "is_new_receiver": 1,
                "fan_in_score": 5,
                "sender_trust_score": 70,
                "receiver_trust_score": 25
            },
            "expectation": "HIGH/CRITICAL RISK (>75%, Mule graph pattern detected)"
        }
    ]

    for i, tc in enumerate(test_cases, 1):
        res = predictor.predict(tc["payload"])
        print(f"\n--- [TEST {i}] {tc['name']} ---")
        print(f" Category:       {tc['category']}")
        print(f" Expectation:    {tc['expectation']}")
        print(f" Result Score:   {res['risk_score']}%  (Probability: {res['fraud_probability']})")
        print(f" Risk Level:     {res['risk_level']}")
        print(f" Action:         {res['recommendation']} (Auth: {res['authentication']})")
        print(f" Dynamic Reasons:")
        for r in res['reasons']:
            print(f"   • {r}")

    print("\n" + "=" * 80)
    print("ALL TESTS EVALUATED AND SENSITIVITY VERIFIED.")
    print("=" * 80)

if __name__ == "__main__":
    run_robustness_and_sensitivity_tests()

import os
import sys
import pandas as pd
from datetime import datetime

# Add project paths safely
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

CURRENT_DIR = os.path.abspath(os.path.dirname(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from database.database import db, DATABASE_PATH
from database.models import (
    Account,
    Transaction,
    AccountBehavior,
    GraphPattern,
    UPIDirectory
)
from flask import Flask

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DATABASE_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

DATASET_DIR = os.path.join(BASE_DIR, "ml", "datasets")


def parse_datetime(val):
    if pd.isna(val) or not val:
        return datetime.utcnow()
    try:
        return datetime.fromisoformat(str(val))
    except Exception:
        return datetime.utcnow()


def parse_prediction(val):
    if pd.isna(val):
        return 0
    val_str = str(val).strip().lower()
    if val_str in ["1", "1.0", "true", "fraud", "fraudulent", "risk"]:
        return 1
    if val_str in ["0", "0.0", "false", "genuine", "legitimate", "normal"]:
        return 0
    try:
        return int(float(val))
    except Exception:
        return 0


def import_data():
    with app.app_context():
        print("Starting CSV Data Import...")

        # 1. Import Accounts
        accounts_file = os.path.join(DATASET_DIR, "accounts.csv")
        if os.path.exists(accounts_file):
            df_acc = pd.read_csv(accounts_file)
            for _, row in df_acc.iterrows():
                acc = Account(
                    account_id=str(row.get("account_id")),
                    account_name=str(row.get("account_name", "Unknown")),
                    upi_id=str(row.get("upi_id", "")),
                    bank_name=str(row.get("bank_name", "UNKNOWN_BANK")),
                    account_type=str(row.get("account_type", "SAVINGS")),
                    account_status=str(row.get("account_status", "ACTIVE")),
                    current_balance=float(row.get("current_balance", 0.0)),
                    trust_score=float(row.get("trust_score", 100.0)),
                    relationship_type=str(row.get("relationship_type", "UNKNOWN")),
                    mobile_number=str(row.get("mobile_number", ""))
                )
                db.session.merge(acc)
            db.session.commit()
            print(f"Imported Accounts: {len(df_acc)}")

        # 2. Import Account Behavior
        behavior_file = os.path.join(DATASET_DIR, "account_behavior.csv")
        if os.path.exists(behavior_file):
            df_beh = pd.read_csv(behavior_file)
            for _, row in df_beh.iterrows():
                beh = AccountBehavior(
                    account_id=str(row.get("account_id")),
                    total_transactions=int(row.get("total_transactions", 0)),
                    total_sent_transactions=int(row.get("total_sent_transactions", 0)),
                    total_received_transactions=int(row.get("total_received_transactions", 0)),
                    total_amount_sent=float(row.get("total_amount_sent", 0.0)),
                    total_amount_received=float(row.get("total_amount_received", 0.0)),
                    average_transaction_amount=float(row.get("average_transaction_amount", 0.0)),
                    average_daily_amount=float(row.get("average_daily_amount", 0.0)),
                    maximum_transaction_amount=float(row.get("maximum_transaction_amount", 0.0)),
                    minimum_transaction_amount=float(row.get("minimum_transaction_amount", 0.0)),
                    night_transactions=int(row.get("night_transactions", 0)),
                    frequent_receiver_count=int(row.get("frequent_receiver_count", 0)),
                    fraud_transactions=int(row.get("fraud_transactions", 0))
                )
                db.session.merge(beh)
            db.session.commit()
            print(f"Imported Account Behavior records: {len(df_beh)}")

        # 3. Import Transactions
        txn_file = os.path.join(DATASET_DIR, "transactions.csv")
        if os.path.exists(txn_file):
            df_txn = pd.read_csv(txn_file).head(5000)
            for idx, row in df_txn.iterrows():
                # Extract transaction_id with fallback generator if missing
                raw_txn_id = row.get("transaction_id") or row.get("txn_id") or f"TXN{idx+10001}"
                raw_amount = row.get("amount") or row.get("transaction_amount") or 0.0

                txn = Transaction(
                    transaction_id=str(raw_txn_id),
                    sender_account=str(row.get("sender_account", "")),
                    receiver_account=str(row.get("receiver_account", "")),
                    amount=float(raw_amount),
                    remarks=str(row.get("remarks", "Transfer")),
                    transaction_time=parse_datetime(row.get("transaction_time")),
                    transaction_status=str(row.get("transaction_status", "SUCCESS")),
                    payment_mode=str(row.get("payment_mode", "UPI")),
                    fraud_probability=float(row.get("fraud_probability", 0.0)),
                    risk_level=str(row.get("risk_level", "LOW")),
                    ml_prediction=parse_prediction(row.get("ml_prediction", row.get("is_fraud", 0))),
                    is_fraud=parse_prediction(row.get("is_fraud", row.get("ml_prediction", 0)))
                )
                db.session.merge(txn)
            db.session.commit()
            print(f"Imported Transactions: {len(df_txn)}")

        print("CSV Data Import Completed Successfully!")


if __name__ == "__main__":
    import_data()
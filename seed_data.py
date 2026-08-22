import os
import sys
import pandas as pd
import logging

# Ensure project root is in sys.path
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app import create_app
from database.database import db
from database.models import (
    Account, UPIDirectory, Transaction, 
    AccountBehavior, ReceiverReputation, 
    GraphPattern, RiskScore, Alert
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_csv_to_db(csv_filename: str, model_class):
    """Reads a CSV dataset file and seeds it into SQLite."""
    possible_paths = [
        os.path.join(BASE_DIR, csv_filename),
        os.path.join(BASE_DIR, "dataset", csv_filename),
        os.path.join(BASE_DIR, "data", csv_filename),
        os.path.join(BASE_DIR, "backend", csv_filename),
    ]

    file_path = None
    for p in possible_paths:
        if os.path.exists(p):
            file_path = p
            break

    if not file_path:
        logger.warning(f"CSV file '{csv_filename}' not found. Skipping {model_class.__tablename__}.")
        return

    logger.info(f"Loading '{csv_filename}' into table '{model_class.__tablename__}'...")
    df = pd.read_csv(file_path)

    records = []
    for _, row in df.iterrows():
        row_dict = {k: (None if pd.isna(v) else v) for k, v in row.to_dict().items()}
        records.append(model_class(**row_dict))

    try:
        db.session.query(model_class).delete()
        db.session.bulk_save_objects(records)
        db.session.commit()
        logger.info(f"Successfully inserted {len(records)} records into '{model_class.__tablename__}'.")
    except Exception as e:
        logger.error(f"Error seeding {model_class.__tablename__}: {str(e)}")
        db.session.rollback()



    """Seeds test accounts A0001 and A0235 if missing."""
    sender = db.session.query(Account).filter_by(account_id="A0001").first()
    if not sender:
        db.session.add(Account(
            account_id="A0001",
            account_name="Rahul Sharma",
            upi_id="rahul@upi",
            account_type="INDIVIDUAL",
            bank_name="HDFC Bank",
            mobile_number="9876543210",
            current_balance=100000.0,
            trust_score=85,
            account_status="ACTIVE",
            created_at="2023-01-15 10:00:00"
        ))

    receiver = db.session.query(Account).filter_by(account_id="A0235").first()
    if not receiver:
        db.session.add(Account(
            account_id="A0235",
            account_name="Priya Verma",
            upi_id="priya@upi",
            account_type="INDIVIDUAL",
            bank_name="ICICI Bank",
            mobile_number="9123456789",
            current_balance=25000.0,
            trust_score=90,
            account_status="ACTIVE",
            created_at="2023-03-20 12:30:00"
        ))

    db.session.commit()
    logger.info("Test accounts A0001 and A0235 are ready in the database.")

def seed_default_test_accounts():
    """Seeds test accounts A0001 and A0235 with high balances for extended testing."""
    sender = db.session.query(Account).filter_by(account_id="A0001").first()
    if not sender:
        db.session.add(Account(
            account_id="A0001",
            account_name="Rahul Sharma",
            upi_id="rahul@upi",
            account_type="INDIVIDUAL",
            bank_name="HDFC Bank",
            mobile_number="9876543210",
            current_balance=1000000.0,  # Updated to ₹10,00,000
            trust_score=85,
            account_status="ACTIVE",
            created_at="2023-01-15 10:00:00"
        ))
    else:
        sender.current_balance = 1000000.0  # Reset balance to ₹10,00,000

    receiver = db.session.query(Account).filter_by(account_id="A0235").first()
    if not receiver:
        db.session.add(Account(
            account_id="A0235",
            account_name="Priya Verma",
            upi_id="priya@upi",
            account_type="INDIVIDUAL",
            bank_name="ICICI Bank",
            mobile_number="9123456789",
            current_balance=250000.0,
            trust_score=90,
            account_status="ACTIVE",
            created_at="2023-03-20 12:30:00"
        ))

    db.session.commit()
    logger.info("Test account balances reset/updated successfully.")

    
def run_seeder():
    app = create_app()
    with app.app_context():
        db.create_all()
        load_csv_to_db("accounts.csv", Account)
        load_csv_to_db("upi_directory.csv", UPIDirectory)
        load_csv_to_db("transactions.csv", Transaction)
        load_csv_to_db("account_behavior.csv", AccountBehavior)
        load_csv_to_db("receiver_reputation.csv", ReceiverReputation)
        load_csv_to_db("graph_patterns.csv", GraphPattern)
        
        seed_default_test_accounts()


if __name__ == "__main__":
    run_seeder()
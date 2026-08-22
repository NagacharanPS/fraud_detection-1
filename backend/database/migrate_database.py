"""
migrate_database.py

Adds new columns to existing tables without deleting data.
Run: python database/migrate_database.py
"""

import os
import sys
import sqlite3

# Add the backend directory to Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)  # Go up one level from database folder

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Now import from database package
from database.database import DATABASE_PATH


def add_column(cursor, table, column, col_type, default="NULL"):
    """Add a column to a table if it doesn't exist"""
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type} DEFAULT {default}")
        print(f"✔ Added column '{column}' to table '{table}'")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print(f"⚠ Column '{column}' already exists in table '{table}'")
        else:
            print(f"✗ Error adding column to {table}: {e}")


def migrate_database():
    """Add new context columns to existing tables"""

    print("=" * 60)
    print("MIGRATING DATABASE - Adding Context Columns")
    print("=" * 60)
    print(f"Database Path: {DATABASE_PATH}")
    print()

    # Check if database exists
    if not os.path.exists(DATABASE_PATH):
        print("❌ Database file not found!")
        print("Please run create_database.py first, or check the path.")
        return

    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # Accounts table - new columns
    print("\n🔄 Updating 'accounts' table...")
    add_column(cursor, "accounts", "relationship_type", "VARCHAR(50)", "'UNKNOWN'")
    add_column(cursor, "accounts", "occupation", "VARCHAR(100)", "NULL")
    add_column(cursor, "accounts", "annual_income", "FLOAT", "NULL")
    add_column(cursor, "accounts", "age_group", "VARCHAR(20)", "NULL")
    add_column(cursor, "accounts", "account_purpose", "VARCHAR(50)", "'PERSONAL'")
    add_column(cursor, "accounts", "verified_status", "VARCHAR(20)", "'UNVERIFIED'")
    add_column(cursor, "accounts", "kyc_status", "VARCHAR(20)", "'PENDING'")
    add_column(cursor, "accounts", "device_trust_score", "INTEGER", "50")
    add_column(cursor, "accounts", "last_login_device", "VARCHAR(100)", "NULL")
    add_column(cursor, "accounts", "is_trusted_device", "BOOLEAN", "0")

    # Transactions table - new columns
    print("\n🔄 Updating 'transactions' table...")
    add_column(cursor, "transactions", "transaction_purpose", "VARCHAR(50)", "'OTHER'")
    add_column(cursor, "transactions", "is_relationship_transaction", "BOOLEAN", "0")
    add_column(cursor, "transactions", "relationship_to_sender", "VARCHAR(50)", "'UNKNOWN'")
    add_column(cursor, "transactions", "sender_receiver_relationship", "VARCHAR(50)", "'UNKNOWN'")
    add_column(cursor, "transactions", "transaction_category", "VARCHAR(50)", "'OTHER'")
    add_column(cursor, "transactions", "is_high_risk_purpose", "BOOLEAN", "0")

    # Account Behavior - new columns
    print("\n🔄 Updating 'account_behavior' table...")
    add_column(cursor, "account_behavior", "family_transaction_count", "INTEGER", "0")
    add_column(cursor, "account_behavior", "work_transaction_count", "INTEGER", "0")
    add_column(cursor, "account_behavior", "business_transaction_count", "INTEGER", "0")
    add_column(cursor, "account_behavior", "friends_transaction_count", "INTEGER", "0")
    add_column(cursor, "account_behavior", "unknown_transaction_count", "INTEGER", "0")
    add_column(cursor, "account_behavior", "highest_family_transaction_amount", "FLOAT", "0")
    add_column(cursor, "account_behavior", "highest_work_transaction_amount", "FLOAT", "0")
    add_column(cursor, "account_behavior", "average_family_transaction", "FLOAT", "0")
    add_column(cursor, "account_behavior", "average_work_transaction", "FLOAT", "0")
    add_column(cursor, "account_behavior", "usual_sender_relationship", "VARCHAR(50)", "'UNKNOWN'")

    # Receiver Reputation - new columns
    print("\n🔄 Updating 'receiver_reputation' table...")
    add_column(cursor, "receiver_reputation", "receiver_category", "VARCHAR(50)", "'UNKNOWN'")
    add_column(cursor, "receiver_reputation", "average_received_amount", "FLOAT", "0")
    add_column(cursor, "receiver_reputation", "median_received_amount", "FLOAT", "0")
    add_column(cursor, "receiver_reputation", "typical_high_value_threshold", "FLOAT", "0")
    add_column(cursor, "receiver_reputation", "receives_from_known_senders", "BOOLEAN", "1")
    add_column(cursor, "receiver_reputation", "known_sender_ratio", "FLOAT", "0")
    add_column(cursor, "receiver_reputation", "fraud_chargeback_ratio", "FLOAT", "0")
    add_column(cursor, "receiver_reputation", "dispute_rate", "FLOAT", "0")

    # Create new tables
    print("\n🔄 Creating new tables...")

    # Sender Receiver Relationships
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sender_receiver_relationships (
            relationship_id VARCHAR(50) PRIMARY KEY,
            sender_account VARCHAR(20),
            receiver_account VARCHAR(20),
            relationship_type VARCHAR(50) DEFAULT 'UNKNOWN',
            specific_relationship VARCHAR(50) DEFAULT 'UNKNOWN',
            total_transactions INTEGER DEFAULT 0,
            total_amount FLOAT DEFAULT 0,
            first_transaction_date VARCHAR(30),
            last_transaction_date VARCHAR(30),
            average_transaction_amount FLOAT DEFAULT 0,
            trust_level VARCHAR(20) DEFAULT 'UNKNOWN',
            verified BOOLEAN DEFAULT 0,
            relationship_strength INTEGER DEFAULT 0
        )
    """)
    print("✔ Created table 'sender_receiver_relationships'")

    # Transaction Purposes
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transaction_purposes (
            purpose_id VARCHAR(50) PRIMARY KEY,
            purpose_name VARCHAR(100),
            category VARCHAR(50),
            typical_amount_range_min FLOAT DEFAULT 0,
            typical_amount_range_max FLOAT DEFAULT 999999,
            risk_multiplier FLOAT DEFAULT 1.00,
            is_high_risk BOOLEAN DEFAULT 0,
            requires_documentation BOOLEAN DEFAULT 0
        )
    """)
    print("✔ Created table 'transaction_purposes'")

    # Insert default transaction purposes
    print("\n🔄 Inserting default transaction purposes...")
    cursor.execute("""
        INSERT OR IGNORE INTO transaction_purposes 
        (purpose_id, purpose_name, category, typical_amount_range_min, typical_amount_range_max, risk_multiplier, is_high_risk, requires_documentation)
        VALUES 
        ('PUR001', 'EDUCATION', 'NEED_BASED', 1000, 200000, 0.80, 0, 1),
        ('PUR002', 'RENT', 'NEED_BASED', 5000, 100000, 0.85, 0, 1),
        ('PUR003', 'GIFT', 'LUXURY', 100, 50000, 1.20, 0, 0),
        ('PUR004', 'BILL_PAYMENT', 'NEED_BASED', 100, 50000, 0.90, 0, 0),
        ('PUR005', 'SALARY', 'NEED_BASED', 10000, 500000, 0.70, 0, 1),
        ('PUR006', 'BUSINESS', 'INVESTMENT', 1000, 5000000, 1.10, 0, 1),
        ('PUR007', 'MEDICAL', 'EMERGENCY', 1000, 500000, 0.75, 0, 1),
        ('PUR008', 'SHOPPING', 'LUXURY', 100, 100000, 1.15, 0, 0),
        ('PUR009', 'CRYPTOCURRENCY', 'INVESTMENT', 1000, 1000000, 1.80, 1, 1),
        ('PUR010', 'GAMBLING', 'LUXURY', 100, 50000, 2.00, 1, 1),
        ('PUR011', 'ONLINE_GAMING', 'LUXURY', 100, 100000, 1.50, 1, 0),
        ('PUR012', 'OTHER', 'OTHER', 0, 999999, 1.00, 0, 0)
    """)
    print("✔ Inserted default transaction purposes")

    conn.commit()
    conn.close()

    print("\n" + "=" * 60)
    print("MIGRATION COMPLETED SUCCESSFULLY")
    print("=" * 60)
    print("\n✅ New tables and columns added.")
    print("✅ Default transaction purposes inserted.")
    print("\nNext steps:")
    print("1. Update your accounts.csv with new columns")
    print("2. Run: python database/import_csv.py")


if __name__ == "__main__":
    migrate_database()
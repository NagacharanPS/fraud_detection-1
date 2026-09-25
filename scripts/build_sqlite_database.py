"""
Builds SQLite Database from all project CSV datasets for DB Browser for SQLite.
Creates indexed SQLite database files in:
- dataset/fraud_detection.db
- fraud_detection.db (root directory for quick access in DB Browser)
"""

import os
import csv
import sqlite3
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DATASET_MAP = {
    # Key: Table Name, Value: Relative CSV Path
    "raw_transactions_50k": BASE_DIR / "dataset" / "raw" / "upi_transactions_50000.csv",
    "features_engineered": BASE_DIR / "dataset" / "processed" / "features_engineered.csv",
    "relationship_aware_transactions": BASE_DIR / "dataset" / "processed" / "relationship_aware_transactions.csv",
    "accounts": BASE_DIR / "backend" / "data" / "accounts.csv",
    "account_behavior": BASE_DIR / "backend" / "data" / "account_behavior.csv",
    "alerts": BASE_DIR / "backend" / "data" / "alerts.csv",
    "upi_directory": BASE_DIR / "backend" / "data" / "upi_directory.csv",
    "receiver_reputation": BASE_DIR / "backend" / "data" / "receiver_reputation.csv",
    "graph_patterns": BASE_DIR / "backend" / "data" / "graph_patterns.csv",
    "beneficiary_profiles": BASE_DIR / "backend" / "data" / "beneficiary_profiles.csv",
    "payment_relationships": BASE_DIR / "backend" / "data" / "payment_relationships.csv",
    "sender_receiver_relationships": BASE_DIR / "backend" / "data" / "sender_receiver_relationships.csv",
    "transaction_purposes": BASE_DIR / "backend" / "data" / "transaction_purposes.csv",
    "accounts_context_update": BASE_DIR / "backend" / "data" / "accounts_context_update.csv",
}

def infer_type(val_str: str) -> str:
    """Infer SQLite column data type from string sample."""
    val_str = val_str.strip()
    if val_str == "":
        return "TEXT"
    # Check int
    if val_str.isdigit() or (val_str.startswith("-") and val_str[1:].isdigit()):
        return "INTEGER"
    # Check float
    try:
        float(val_str)
        return "REAL"
    except ValueError:
        pass
    # Check boolean representation
    if val_str.upper() in ("TRUE", "FALSE"):
        return "INTEGER"
    return "TEXT"

def convert_value(val_str: str, col_type: str):
    """Convert raw string to appropriate Python type for sqlite insertion."""
    val_str = val_str.strip()
    if val_str == "":
        return None
    if col_type == "INTEGER":
        if val_str.upper() == "TRUE":
            return 1
        elif val_str.upper() == "FALSE":
            return 0
        try:
            return int(val_str)
        except ValueError:
            try:
                return int(float(val_str))
            except ValueError:
                return val_str
    elif col_type == "REAL":
        try:
            return float(val_str)
        except ValueError:
            return val_str
    return val_str

def sanitize_col_name(name: str) -> str:
    """Sanitize CSV header to valid SQL column name."""
    clean = name.strip().replace(" ", "_").replace("-", "_").replace(".", "_")
    return clean

def import_csv_to_sqlite(db_conn: sqlite3.Connection, table_name: str, csv_path: Path):
    if not csv_path.exists():
        print(f"⚠️  Skipping {table_name}: File not found at {csv_path}")
        return

    cursor = db_conn.cursor()
    cursor.execute(f"DROP TABLE IF EXISTS [{table_name}]")

    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        try:
            headers = next(reader)
        except StopIteration:
            print(f"⚠️  Skipping {table_name}: Empty CSV file.")
            return

        headers = [sanitize_col_name(h) for h in headers]
        
        # Sample first 200 rows to infer column types
        sample_rows = []
        for _ in range(200):
            try:
                row = next(reader)
                if row:
                    sample_rows.append(row)
            except StopIteration:
                break

        # Re-open or reset reader to beginning
        f.seek(0)
        next(reader) # skip headers

        col_types = []
        for col_idx in range(len(headers)):
            col_samples = [r[col_idx] for r in sample_rows if col_idx < len(r) and r[col_idx].strip() != ""]
            if not col_samples:
                col_types.append("TEXT")
            else:
                types_in_sample = [infer_type(s) for s in col_samples]
                if "TEXT" in types_in_sample:
                    col_types.append("TEXT")
                elif "REAL" in types_in_sample:
                    col_types.append("REAL")
                else:
                    col_types.append("INTEGER")

        # Create Table SQL
        cols_def = ", ".join([f"[{col}] {ctype}" for col, ctype in zip(headers, col_types)])
        create_sql = f"CREATE TABLE [{table_name}] ({cols_def});"
        cursor.execute(create_sql)

        # Batch Insert
        placeholders = ", ".join(["?"] * len(headers))
        insert_sql = f"INSERT INTO [{table_name}] VALUES ({placeholders})"

        batch = []
        total_rows = 0
        for row in reader:
            if not row or len(row) == 0:
                continue
            # Pad row if incomplete
            if len(row) < len(headers):
                row = row + [""] * (len(headers) - len(row))
            elif len(row) > len(headers):
                row = row[:len(headers)]

            typed_row = [convert_value(row[i], col_types[i]) for i in range(len(headers))]
            batch.append(typed_row)
            total_rows += 1

            if len(batch) >= 5000:
                cursor.executemany(insert_sql, batch)
                batch = []

        if batch:
            cursor.executemany(insert_sql, batch)

        db_conn.commit()

        # Add helpful indices
        for idx_col in ["transaction_id", "sender_account", "receiver_account", "account_id", "upi_id", "is_fraud", "risk_level"]:
            if idx_col in headers:
                try:
                    cursor.execute(f"CREATE INDEX IF NOT EXISTS [idx_{table_name}_{idx_col}] ON [{table_name}] ([{idx_col}])")
                except Exception:
                    pass

        db_conn.commit()
        print(f"[OK] Imported table '{table_name}' ({total_rows:,} rows) with schema ({len(headers)} columns)")

def main():
    target_db_path = BASE_DIR / "dataset" / "fraud_detection.db"
    root_db_path = BASE_DIR / "fraud_detection.db"

    # Connect to existing or new database
    print("\n=======================================================")
    print("Generating/Updating SQLite Database for DB Browser for SQLite")
    print(f"Target Database: {target_db_path}")
    print("=======================================================\n")

    conn = sqlite3.connect(str(target_db_path))
    
    # Configure SQLite for fast batch import
    conn.execute("PRAGMA synchronous = OFF;")
    conn.execute("PRAGMA journal_mode = MEMORY;")

    for table_name, csv_path in DATASET_MAP.items():
        import_csv_to_sqlite(conn, table_name, csv_path)

    # Ensure dedicated `transactions` table exists alongside `raw_transactions_50k`
    print("[+] Creating dedicated 'transactions' table...")
    conn.execute("DROP TABLE IF EXISTS transactions;")
    conn.execute("CREATE TABLE transactions AS SELECT * FROM raw_transactions_50k;")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_transactions_id ON transactions (transaction_id);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions (sender_account);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions (receiver_account);")

    # Ensure dedicated `users` credentials & biometrics table exists
    print("[+] Creating dedicated 'users' credentials table...")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            email_or_upi_id TEXT NOT NULL UNIQUE,
            email TEXT,
            phone_number TEXT,
            password_hash TEXT NOT NULL,
            salt TEXT,
            account_id TEXT,
            face_data TEXT,
            face_embedding TEXT,
            template_hash TEXT,
            algorithm_version TEXT DEFAULT 'opencv-yunet-sface-2021dec',
            enrolled_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Create user_credentials view
    conn.execute("""
        CREATE VIEW IF NOT EXISTS user_credentials AS 
        SELECT user_id, full_name, email_or_upi_id, password_hash, face_data, created_at 
        FROM users;
    """)

    # Seed initial demo personas
    demo_users = [
        ("USR_A0001", "Rahul Sharma", "rahul@payguard.com", "rahul@payguard.com", "9876543210", "pbkdf2_sha512_seeded_hash_rahul", "salt1", "A0001", "[SIMULATED_128D_BIOMETRIC_VECTOR_A0001]"),
        ("USR_A0014", "Sneha Verma", "sneha@payguard.com", "sneha@payguard.com", "9876543214", "pbkdf2_sha512_seeded_hash_sneha", "salt2", "A0014", "[SIMULATED_128D_BIOMETRIC_VECTOR_A0014]"),
        ("USR_A0002", "Charan Nair", "charan@payguard.com", "charan@payguard.com", "9876543211", "pbkdf2_sha512_seeded_hash_charan", "salt3", "A0002", "[SIMULATED_128D_BIOMETRIC_VECTOR_A0002]"),
        ("USR_A0004", "Amit Verma", "amit@payguard.com", "amit@payguard.com", "9876543213", "pbkdf2_sha512_seeded_hash_amit", "salt4", "A0004", "[SIMULATED_128D_BIOMETRIC_VECTOR_A0004]"),
        ("USR_A0003", "Priya Patel", "priya@payguard.com", "priya@payguard.com", "9876543212", "pbkdf2_sha512_seeded_hash_priya", "salt5", "A0003", "[SIMULATED_128D_BIOMETRIC_VECTOR_A0003]"),
    ]

    for u in demo_users:
        conn.execute("""
            INSERT OR IGNORE INTO users (
                user_id, full_name, email_or_upi_id, email, phone_number,
                password_hash, salt, account_id, face_data, enrolled_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """, u)

    conn.commit()
    conn.close()

    # Create root and backend copies
    shutil.copyfile(str(target_db_path), str(root_db_path))
    backend_db_path = BASE_DIR / "backend" / "database" / "fraud_detection.db"
    if backend_db_path.parent.exists():
        shutil.copyfile(str(target_db_path), str(backend_db_path))

    print("\nSuccessfully created SQLite databases:")
    print(f"  1. {target_db_path} ({target_db_path.stat().st_size / (1024*1024):.2f} MB)")
    print(f"  2. {root_db_path} ({root_db_path.stat().st_size / (1024*1024):.2f} MB)")
    print("\nYou can now open either file directly in DB Browser for SQLite!")

if __name__ == "__main__":
    main()

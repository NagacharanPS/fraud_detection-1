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

    # Remove existing db files if any
    if target_db_path.exists():
        target_db_path.unlink()

    print("\n=======================================================")
    print("Generating SQLite Database for DB Browser for SQLite")
    print(f"Target Database: {target_db_path}")
    print("=======================================================\n")

    conn = sqlite3.connect(str(target_db_path))
    
    # Configure SQLite for fast batch import
    conn.execute("PRAGMA synchronous = OFF;")
    conn.execute("PRAGMA journal_mode = MEMORY;")

    for table_name, csv_path in DATASET_MAP.items():
        import_csv_to_sqlite(conn, table_name, csv_path)

    conn.close()

    # Create root copy for convenient direct drag-and-drop into DB Browser
    shutil.copyfile(str(target_db_path), str(root_db_path))

    print("\nSuccessfully created SQLite databases:")
    print(f"  1. {target_db_path} ({target_db_path.stat().st_size / (1024*1024):.2f} MB)")
    print(f"  2. {root_db_path} ({root_db_path.stat().st_size / (1024*1024):.2f} MB)")
    print("\nYou can now open either file directly in DB Browser for SQLite!")

if __name__ == "__main__":
    main()

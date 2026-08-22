import os
import sys
import sqlite3

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(CURRENT_DIR, "fraud_detection.db")

def add_table():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS risk_analysis_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id VARCHAR(50) UNIQUE NOT NULL,
            sender_account VARCHAR(20),
            receiver_account VARCHAR(20),
            amount FLOAT,
            features TEXT,
            risk_score FLOAT,
            risk_level VARCHAR(20),
            fraud_probability FLOAT,
            recommendation VARCHAR(50),
            authentication VARCHAR(50),
            reasons TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            transaction_time DATETIME
        )
    """)
    
    conn.commit()
    conn.close()
    print("✅ risk_analysis_log table created successfully")

if __name__ == "__main__":
    add_table()
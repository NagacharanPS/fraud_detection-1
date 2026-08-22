import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_FOLDER = os.path.join(BASE_DIR, "data")

TRANSACTIONS_FILE = os.path.join(DATA_FOLDER, "transactions.csv")
ACCOUNTS_FILE = os.path.join(DATA_FOLDER, "accounts.csv")
BEHAVIOR_FILE = os.path.join(DATA_FOLDER, "account_behavior.csv")
PATTERN_FILE = os.path.join(DATA_FOLDER, "graph_patterns.csv")
RISK_FILE = os.path.join(DATA_FOLDER, "risk_scores.csv")
ALERT_FILE = os.path.join(DATA_FOLDER, "alerts.csv")
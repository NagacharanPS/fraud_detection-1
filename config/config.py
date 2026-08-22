import os
from pathlib import Path

# Project Base Directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Directory Paths
DATASET_RAW_DIR = BASE_DIR / "dataset" / "raw"
DATASET_PROCESSED_DIR = BASE_DIR / "dataset" / "processed"
MODELS_DIR = BASE_DIR / "models"
BACKEND_MODELS_DIR = BASE_DIR / "backend" / "ml" / "models"

# Ensure directories exist
DATASET_RAW_DIR.mkdir(parents=True, exist_ok=True)
DATASET_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
BACKEND_MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Dataset Generation Config
DEFAULT_NUM_TRANSACTIONS = 50000
TARGET_FRAUD_RATIO = 0.05  # 5% fraud

# Model Training Config
TEMPORAL_SPLIT_RATIOS = (0.70, 0.15, 0.15)  # Train (70%), Val (15%), Test (15%)
DEFAULT_DECISION_THRESHOLD = 0.45

# Risk Score Thresholds
RISK_LEVEL_THRESHOLDS = {
    "LOW": (0, 30),
    "MEDIUM": (31, 60),
    "HIGH": (61, 80),
    "CRITICAL": (81, 100),
}

def get_risk_level(risk_score: float) -> str:
    """Returns risk level label based on risk score (0-100)."""
    if risk_score <= 30:
        return "LOW"
    elif risk_score <= 60:
        return "MEDIUM"
    elif risk_score <= 80:
        return "HIGH"
    else:
        return "CRITICAL"

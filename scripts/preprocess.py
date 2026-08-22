import sys
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import LabelEncoder, StandardScaler

# Ensure config path is in sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from config.config import DATASET_PROCESSED_DIR, MODELS_DIR, BACKEND_MODELS_DIR, TEMPORAL_SPLIT_RATIOS

# List of metadata columns to exclude from training matrix
METADATA_COLUMNS = [
    "transaction_id", "timestamp", "sender_account", "receiver_account", "is_fraud"
]

class UPIPreprocessor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.encoders = {}
        self.feature_columns = []

    def prepare_data(self, df):
        print(f"--- Preprocessing Data ({len(df)} rows) ---")
        
        # Sort chronologically to preserve temporal order
        df['timestamp_dt'] = pd.to_datetime(df['timestamp'])
        df = df.sort_values('timestamp_dt').reset_index(drop=True)

        # Ensure target is valid integer without NaNs or infs
        df['is_fraud'] = pd.to_numeric(df['is_fraud'], errors='coerce').fillna(0).astype(int)

        # Feature matrix X and target y
        drop_cols = [c for c in METADATA_COLUMNS if c in df.columns] + ['timestamp_dt']
        X = df.drop(columns=drop_cols, errors='ignore')
        y = df['is_fraud']

        # Replace infs and NaNs in X
        X = X.replace([np.inf, -np.inf], np.nan).fillna(0)

        # Encode any categorical columns if present
        categorical_cols = X.select_dtypes(include=['object', 'category']).columns.tolist()
        for col in categorical_cols:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
            self.encoders[col] = le

        self.feature_columns = X.columns.tolist()

        # Temporal split (70% train, 15% val, 15% test chronologically)
        n = len(df)
        train_end = int(n * TEMPORAL_SPLIT_RATIOS[0])
        val_end = train_end + int(n * TEMPORAL_SPLIT_RATIOS[1])

        X_train, y_train = X.iloc[:train_end], y.iloc[:train_end]
        X_val, y_val = X.iloc[train_end:val_end], y.iloc[train_end:val_end]
        X_test, y_test = X.iloc[val_end:], y.iloc[val_end:]

        # Fit scaler on training set ONLY (prevent temporal data leakage)
        numeric_cols = X_train.select_dtypes(include=[np.number]).columns.tolist()
        
        X_train_scaled = X_train.copy()
        X_val_scaled = X_val.copy()
        X_test_scaled = X_test.copy()

        X_train_scaled[numeric_cols] = self.scaler.fit_transform(X_train[numeric_cols])
        X_val_scaled[numeric_cols] = self.scaler.transform(X_val[numeric_cols])
        X_test_scaled[numeric_cols] = self.scaler.transform(X_test[numeric_cols])

        print(f"Temporal Split Completed: Train={len(X_train)} (Fraud: {y_train.sum()}), Val={len(X_val)} (Fraud: {y_val.sum()}), Test={len(X_test)} (Fraud: {y_test.sum()})")
        print(f"Feature count ({len(self.feature_columns)}): {self.feature_columns}")

        return (
            X_train_scaled, y_train,
            X_val_scaled, y_val,
            X_test_scaled, y_test,
            self.feature_columns
        )

    def save_artifacts(self):
        artifacts = {
            "scaler.pkl": self.scaler,
            "encoders.pkl": self.encoders,
            "feature_columns.pkl": self.feature_columns
        }
        for name, obj in artifacts.items():
            joblib.dump(obj, MODELS_DIR / name)
            joblib.dump(obj, BACKEND_MODELS_DIR / name)
        print("Preprocessing artifacts successfully saved to models/ and backend/ml/models/")

if __name__ == "__main__":
    feat_file = DATASET_PROCESSED_DIR / "features_engineered.csv"
    if not feat_file.exists():
        print("features_engineered.csv not found. Running feature engineering first...")
        from feature_engineering import build_features
        from generate_dataset import generate_upi_dataset
        raw_files = list(DATASET_RAW_DIR.glob("upi_transactions_*.csv"))
        if not raw_files:
            df_raw = generate_upi_dataset()
        else:
            df_raw = pd.read_csv(raw_files[0])
        df_feat = build_features(df_raw)
    else:
        df_feat = pd.read_csv(feat_file)

    preprocessor = UPIPreprocessor()
    preprocessor.prepare_data(df_feat)
    preprocessor.save_artifacts()

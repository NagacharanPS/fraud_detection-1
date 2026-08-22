import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from xgboost import XGBClassifier

class FraudModelTrainer:

    def __init__(self):
        self.base_path = Path(__file__).resolve().parent
        self.dataset_path = self.base_path / "datasets" / "merged_training_data.csv"
        self.model_path = self.base_path / "models"
        self.model_path.mkdir(exist_ok=True)

    def load_dataset(self):
        self.df = pd.read_csv(self.dataset_path)
        print("\nDataset Loaded:", self.df.shape)

    def drop_columns(self):
        columns_to_drop = [
            "fraud_probability", "risk_level", "ml_prediction",
            "transaction_id", "sender_account", "receiver_account",
            "transaction_time", "created_at", "device_id", "remarks",
            "sender_account_id_x", "sender_account_name_x",
            "sender_upi_id", "sender_mobile_number", "sender_created_at",
            "sender_account_id_y", "sender_account_name_y",
            "receiver_account_id", "receiver_account_name",
            "receiver_upi_id", "receiver_mobile_number", "receiver_created_at",
            "transaction_status", "is_fraud_new"
        ]
        
        self.df.drop(columns=[c for c in columns_to_drop if c in self.df.columns], inplace=True, errors="ignore")
        print(f"Kept features for model training: {len(self.df.columns) - 1}")

    def encode(self):
        self.encoders = {}
        object_columns = self.df.select_dtypes(include=["object", "string", "category"]).columns
        for column in object_columns:
            if column == "is_fraud":
                continue
            encoder = LabelEncoder()
            self.df[column] = encoder.fit_transform(self.df[column].astype(str))
            self.encoders[column] = encoder
        print("Categorical Encoding Completed")

    def split(self):
        self.X = self.df.drop("is_fraud", axis=1)
        self.y = self.df["is_fraud"]
        self.feature_columns = self.X.columns.tolist()
        
        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            self.X, self.y, test_size=0.2, random_state=42, stratify=self.y
        )
        print("Train/Test Split Completed")

    def scale(self):
        self.scaler = StandardScaler()
        numeric_columns = self.X_train.select_dtypes(include=["number"]).columns
        self.X_train[numeric_columns] = self.scaler.fit_transform(self.X_train[numeric_columns])
        self.X_test[numeric_columns] = self.scaler.transform(self.X_test[numeric_columns])
        print("Scaling Completed")

    def train(self):
        # Calculate class weights instead of synthetic SMOTE oversampling
        neg_count = (self.y_train == 0).sum()
        pos_count = (self.y_train == 1).sum()
        scale_weight = neg_count / max(pos_count, 1)

        self.model = XGBClassifier(
            n_estimators=150,
            learning_rate=0.05,
            max_depth=4,
            min_child_weight=5,
            gamma=1.0,
            reg_lambda=2.0,
            scale_pos_weight=scale_weight,
            random_state=42,
            eval_metric="logloss"
        )
        self.model.fit(self.X_train, self.y_train)
        print("Model Training Completed (With Balanced Class Weights)")

    def evaluate(self):
        probabilities = self.model.predict_proba(self.X_test)[:, 1]
        predictions = (probabilities >= 0.5).astype(int)
        
        print("\n" + "=" * 60)
        print("MODEL PERFORMANCE")
        print("=" * 60)
        print(f"Accuracy: {round(accuracy_score(self.y_test, predictions), 4)}")
        print(f"Precision: {round(precision_score(self.y_test, predictions), 4)}")
        print(f"Recall: {round(recall_score(self.y_test, predictions), 4)}")
        print(f"ROC AUC: {round(roc_auc_score(self.y_test, probabilities), 4)}")

    def save(self):
        joblib.dump(self.model, self.model_path / "fraud_model.pkl")
        joblib.dump(self.scaler, self.model_path / "scaler.pkl")
        joblib.dump(self.encoders, self.model_path / "label_encoders.pkl")
        joblib.dump(self.feature_columns, self.model_path / "feature_columns.pkl")
        print("\nMODEL AND ARTIFACTS SAVED SUCCESSFULLY")

    def run(self):
        self.load_dataset()
        self.drop_columns()
        self.encode()
        self.split()
        self.scale()
        self.train()
        self.evaluate()
        self.save()

if __name__ == "__main__":
    FraudModelTrainer().run()
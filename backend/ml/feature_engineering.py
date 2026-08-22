import pandas as pd
from pathlib import Path


class FeatureEngineering:

    def __init__(self):
        self.dataset_path = (
            Path(__file__).resolve().parent /
            "datasets"
        )

        self.output_path = (
            self.dataset_path /
            "merged_training_data.csv"
        )

    def load_data(self):
        self.accounts = pd.read_csv(
            self.dataset_path / "accounts.csv"
        )

        self.transactions = pd.read_csv(
            self.dataset_path / "transactions.csv"
        )

        self.behaviour = pd.read_csv(
            self.dataset_path / "account_behavior.csv"
        )

        self.graph = pd.read_csv(
            self.dataset_path / "graph_patterns.csv"
        )

        print("Datasets Loaded Successfully")

    def merge_sender_accounts(self):
        sender = self.accounts.add_prefix("sender_")

        self.transactions = self.transactions.merge(
            sender,
            left_on="sender_account",
            right_on="sender_account_id",
            how="left"
        )

        print("Sender Account Merged")

    def merge_receiver_accounts(self):
        receiver = self.accounts.add_prefix("receiver_")

        self.transactions = self.transactions.merge(
            receiver,
            left_on="receiver_account",
            right_on="receiver_account_id",
            how="left"
        )

        print("Receiver Account Merged")

    def merge_behaviour(self):
        behaviour = self.behaviour.add_prefix("sender_")

        self.transactions = self.transactions.merge(
            behaviour,
            left_on="sender_account",
            right_on="sender_account_id",
            how="left"
        )

        print("Behaviour Data Merged")

    def merge_graph(self):
        if "transaction_id" in self.graph.columns:
            self.transactions = self.transactions.merge(
                self.graph,
                on="transaction_id",
                how="left"
            )

            print("Graph Data Merged")
        else:
            print("No transaction_id in graph_patterns")

    def create_context_features(self):
        """Create contextual features from existing data"""

        # ----------------------------------------------------
        # 1. Ensure Critical Risk Context Features Exist
        # ----------------------------------------------------
        if 'sender_night_transactions' not in self.transactions.columns:
            if 'night_transactions' in self.transactions.columns:
                self.transactions['sender_night_transactions'] = self.transactions['night_transactions']
            else:
                self.transactions['sender_night_transactions'] = 0

        if 'sender_fraud_transactions' not in self.transactions.columns:
            if 'fraud_transactions' in self.transactions.columns:
                self.transactions['sender_fraud_transactions'] = self.transactions['fraud_transactions']
            else:
                self.transactions['sender_fraud_transactions'] = 0

        if 'sender_frequent_receiver_count' not in self.transactions.columns:
            if 'frequent_receiver_count' in self.transactions.columns:
                self.transactions['sender_frequent_receiver_count'] = self.transactions['frequent_receiver_count']
            else:
                self.transactions['sender_frequent_receiver_count'] = 0

        # ----------------------------------------------------
        # 2. Relationship-based Features
        # ----------------------------------------------------
        if 'sender_relationship_type' in self.transactions.columns:
            rel_series = self.transactions['sender_relationship_type'].fillna('UNKNOWN').astype(str).str.upper()

            self.transactions['is_family_transaction'] = (
                rel_series.isin(['FAMILY', 'PARENT', 'CHILD', 'SIBLING', 'SPOUSE'])
            ).astype(int)

            self.transactions['is_work_transaction'] = (
                rel_series.isin(['WORK', 'EMPLOYER', 'EMPLOYEE', 'COLLEAGUE'])
            ).astype(int)

            self.transactions['is_business_transaction'] = (
                rel_series.isin(['BUSINESS', 'CUSTOMER', 'SUPPLIER'])
            ).astype(int)

            self.transactions['is_unknown_relationship'] = (
                rel_series == 'UNKNOWN'
            ).astype(int)

            self.transactions['sender_is_student'] = (
                rel_series == 'STUDENT'
            ).astype(int)

            self.transactions['sender_is_professional'] = (
                rel_series == 'PROFESSIONAL'
            ).astype(int)

            self.transactions['sender_is_business'] = (
                rel_series == 'BUSINESS'
            ).astype(int)
        else:
            self.transactions['is_family_transaction'] = 0
            self.transactions['is_work_transaction'] = 0
            self.transactions['is_business_transaction'] = 0
            self.transactions['is_unknown_relationship'] = 1
            self.transactions['sender_is_student'] = 0
            self.transactions['sender_is_professional'] = 0
            self.transactions['sender_is_business'] = 0

        # ----------------------------------------------------
        # 3. Receiver Account Context
        # ----------------------------------------------------
        if 'receiver_account_type' in self.transactions.columns:
            self.transactions['receiver_is_educational'] = (
                self.transactions['receiver_account_type'].fillna('').astype(str).str.upper() == 'EDUCATIONAL'
            ).astype(int)
        else:
            self.transactions['receiver_is_educational'] = 0

        if 'receiver_relationship_type' in self.transactions.columns:
            self.transactions['receiver_is_government'] = (
                self.transactions['receiver_relationship_type'].fillna('').astype(str).str.upper() == 'GOVERNMENT'
            ).astype(int)
        else:
            self.transactions['receiver_is_government'] = 0

        # High risk purpose flag
        if 'is_high_risk_purpose' not in self.transactions.columns:
            self.transactions['is_high_risk_purpose'] = 0

        # Amount anomaly ratio relative to sender average
        if 'sender_average_transaction_amount' in self.transactions.columns:
            sender_avg = self.transactions['sender_average_transaction_amount'].fillna(1)
        else:
            sender_avg = 1

        self.transactions['amount_vs_sender_avg'] = (
            self.transactions['amount'] / (sender_avg + 1)
        )

        # ----------------------------------------------------
        # 4. Context Risk Benefit Score
        # ----------------------------------------------------
        self.transactions['context_risk_benefit'] = 0

        self.transactions.loc[
            self.transactions['is_family_transaction'] == 1, 'context_risk_benefit'
        ] -= 20

        self.transactions.loc[
            self.transactions['is_work_transaction'] == 1, 'context_risk_benefit'
        ] -= 10

        self.transactions.loc[
            self.transactions['is_unknown_relationship'] == 1, 'context_risk_benefit'
        ] += 15

        print("Context Features Created Successfully")

    def remove_duplicates(self):
        self.transactions.drop_duplicates(inplace=True)

    def fill_missing(self):
        for column in self.transactions.columns:
            if self.transactions[column].dtype == "object":
                self.transactions[column] = self.transactions[column].fillna("Unknown")
            elif str(self.transactions[column].dtype).startswith("string"):
                self.transactions[column] = self.transactions[column].fillna("Unknown")
            else:
                self.transactions[column] = self.transactions[column].fillna(0)
        print("Missing Values Filled")

    def save(self):
        self.transactions.to_csv(
            self.output_path,
            index=False
        )

        print()
        print("=" * 60)
        print("Merged Dataset Saved")
        print(self.output_path)
        print("=" * 60)
        print()
        print("Rows    :", len(self.transactions))
        print("Columns :", len(self.transactions.columns))

    def run(self):
        self.load_data()
        self.merge_sender_accounts()
        self.merge_receiver_accounts()
        self.merge_behaviour()
        self.merge_graph()
        self.create_context_features()
        self.remove_duplicates()
        self.fill_missing()
        self.save()


if __name__ == "__main__":
    FeatureEngineering().run()
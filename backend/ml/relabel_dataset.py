import pandas as pd
import numpy as np
from pathlib import Path


class DatasetRelabeler:

    def __init__(self):

        self.base_path = Path(__file__).resolve().parent

        self.dataset = self.base_path / "datasets" / "merged_training_data.csv"

    def load(self):

        self.df = pd.read_csv(self.dataset)

        print("Dataset Loaded")

        print(self.df.shape)

    def create_new_labels(self):

        import random

        random.seed(42)

        labels = []

        for _, row in self.df.iterrows():

            score = 0

            amount = row.get("amount", 0)

            sender_trust = row.get("sender_trust_score", 50)

            receiver_trust = row.get("receiver_trust_score", 50)

            sender_balance = row.get("sender_current_balance", 0)

            avg_amount = row.get(
                "sender_average_transaction_amount",
                0
            )

            daily_amount = row.get(
                "sender_average_daily_amount",
                0
            )

            night = row.get(
                "sender_night_transactions",
                0
            )

            max_amount = row.get(
                "sender_maximum_transaction_amount",
                0
            )

            freq = row.get(
                "sender_frequent_receiver_count",
                0
            )

            total_tx = row.get(
                "sender_total_transactions",
                0
            )

            # -------------------------
            # Amount Risk
            # -------------------------

            if amount > 200000:
                score += 3

            elif amount > 100000:
                score += 2

            elif amount > 50000:
                score += 1

            # -------------------------
            # Sender Trust
            # -------------------------

            if sender_trust < 30:
                score += 3

            elif sender_trust < 50:
                score += 2

            elif sender_trust < 70:
                score += 1

            # -------------------------
            # Receiver Trust
            # -------------------------

            if receiver_trust < 30:
                score += 3

            elif receiver_trust < 50:
                score += 2

            elif receiver_trust < 70:
                score += 1

            # -------------------------
            # Behaviour Analysis
            # -------------------------

            if avg_amount > 0:

                if amount > avg_amount * 8:
                    score += 3

                elif amount > avg_amount * 5:
                    score += 2

                elif amount > avg_amount * 3:
                    score += 1

            if daily_amount > 0:

                if amount > daily_amount * 4:
                    score += 2

                elif amount > daily_amount * 2:
                    score += 1

            # -------------------------
            # Maximum Amount
            # -------------------------

            if max_amount > 0:

                if amount > max_amount * 2:
                    score += 2

                elif amount > max_amount:
                    score += 1

            # -------------------------
            # Night Transactions
            # -------------------------

            if night > 20:
                score += 2

            elif night > 10:
                score += 1

            # -------------------------
            # Frequent Receiver
            # -------------------------

            if freq > 40:
                score += 2

            elif freq > 20:
                score += 1

            # -------------------------
            # Balance Check
            # -------------------------

            if sender_balance < amount:
                score += 3

            # -------------------------
            # New Account
            # -------------------------

            if total_tx < 20 and amount > 50000:
                score += 2

            elif total_tx < 10:
                score += 1

            # ====================================================
            # FINAL LABELING
            # ====================================================

            if score >= 9:

                labels.append(1)

            elif score <= 4:

                labels.append(0)

            else:

                # Borderline transaction
                # 35% become fraud
                # 65% become genuine

                labels.append(
                    1 if random.random() < 0.35 else 0
                )

        self.df["is_fraud"] = labels

        print()

        print("New Class Distribution")

        print(self.df["is_fraud"].value_counts())

    def save(self):

        self.df.to_csv(

            self.dataset,

            index=False

        )

        print()

        print("Dataset Updated Successfully")

    def run(self):

        self.load()

        self.create_new_labels()

        self.save()


if __name__ == "__main__":

    DatasetRelabeler().run()
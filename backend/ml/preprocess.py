import sqlite3
import pandas as pd
from pathlib import Path


class DataPreprocessor:

    def __init__(self):

        self.project_root = Path(__file__).resolve().parent.parent

        self.database_path = (
            self.project_root /
            "database" /
            "fraud_detection.db"
        )

        self.output_dir = (
            self.project_root /
            "ml" /
            "datasets"
        )

        self.output_dir.mkdir(
            parents=True,
            exist_ok=True
        )

    def connect(self):

        return sqlite3.connect(
            self.database_path
        )

    def load_table(
        self,
        table_name
    ):

        conn = self.connect()

        df = pd.read_sql(
            f"SELECT * FROM {table_name}",
            conn
        )

        conn.close()

        print(
            f"{table_name} : {len(df)} rows loaded"
        )

        return df

    def load_all_tables(self):

        tables = {

            "accounts":
                self.load_table(
                    "accounts"
                ),

            "transactions":
                self.load_table(
                    "transactions"
                ),

            "account_behavior":
                self.load_table(
                    "account_behavior"
                ),

            "graph_patterns":
                self.load_table(
                    "graph_patterns"
                )

        }

        return tables

    def save_csvs(
        self,
        tables
    ):

        for name, df in tables.items():

            output = (
                self.output_dir /
                f"{name}.csv"
            )

            df.to_csv(
                output,
                index=False
            )

            print(
                f"Saved : {output}"
            )

    def summary(
        self,
        tables
    ):

        print("\n")
        print("=" * 60)
        print("DATABASE SUMMARY")
        print("=" * 60)

        for name, df in tables.items():

            print(f"\n{name.upper()}")

            print("-" * 40)

            print(
                f"Rows : {len(df)}"
            )

            print(
                f"Columns : {len(df.columns)}"
            )

            print("\nColumn Names")

            for column in df.columns:

                print(
                    f" - {column}"
                )

        print("\n")
        print("=" * 60)

    def run(self):

        tables = self.load_all_tables()

        self.summary(
            tables
        )

        self.save_csvs(
            tables
        )

        print("\n")

        print(
            "Preprocessing Completed Successfully."
        )


if __name__ == "__main__":

    processor = DataPreprocessor()

    processor.run()
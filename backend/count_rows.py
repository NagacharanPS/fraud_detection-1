import pandas as pd

df = pd.read_csv("data/transactions.csv")

print("Rows:", len(df))
print("Senders:", df["sender_id"].nunique())
print("Receivers:", df["receiver_id"].nunique())
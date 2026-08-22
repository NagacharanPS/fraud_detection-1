import pandas as pd

from services.fraud_engine import FraudEngine
from config import TRANSACTIONS_FILE

engine = FraudEngine()

df = pd.read_csv(
    TRANSACTIONS_FILE
)

transaction_id = (
    df.iloc[0]["transaction_id"]
)

result = engine.analyze_transaction(
    transaction_id
)

print(result)
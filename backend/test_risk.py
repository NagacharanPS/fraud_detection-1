import pandas as pd

from services.risk_engine import RiskEngine
from config import TRANSACTIONS_FILE

df = pd.read_csv(
    TRANSACTIONS_FILE
)

engine = RiskEngine(df)

result = engine.calculate_risk(
    amount=75000,
    velocity=12,
    pattern_count=3,
    network_risk=70,
    receiver_trust=40
)

print(result)
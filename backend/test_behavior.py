from services.behavior_analyzer import BehaviorAnalyzer
from config import BEHAVIOR_FILE

analyzer = BehaviorAnalyzer(
    BEHAVIOR_FILE
)

account_id = "A0001"

result = analyzer.detect_amount_anomaly(
    account_id,
    80000
)

print("\nAmount Analysis")
print(result)

result2 = analyzer.detect_frequency_anomaly(
    account_id,
    30
)

print("\nFrequency Analysis")
print(result2)
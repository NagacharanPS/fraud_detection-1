from services.context_rules import ContextRules
from config import ACCOUNTS_FILE

rules = ContextRules(
    ACCOUNTS_FILE
)

result = rules.evaluate_transaction(
    sender_id="A0001",
    amount=75000
)

print(result)
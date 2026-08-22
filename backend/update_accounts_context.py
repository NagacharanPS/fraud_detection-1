import pandas as pd
from database.database import get_session
from database.models import Account

session = get_session()
df = pd.read_csv('data/accounts.csv')

updated = 0
for _, row in df.iterrows():
    acc = session.query(Account).filter_by(account_id=row['account_id']).first()
    if acc:
        acc.relationship_type = row.get('relationship_type', 'UNKNOWN')
        acc.occupation = row.get('occupation', None)
        acc.annual_income = row.get('annual_income', None)
        acc.age_group = row.get('age_group', None)
        acc.account_purpose = row.get('account_purpose', 'PERSONAL')
        acc.verified_status = row.get('verified_status', 'UNVERIFIED')
        acc.kyc_status = row.get('kyc_status', 'PENDING')
        acc.device_trust_score = int(row.get('device_trust_score', 50))
        acc.last_login_device = row.get('last_login_device', None)
        acc.is_trusted_device = bool(row.get('is_trusted_device', 0))
        updated += 1

session.commit()
print(f"✅ Updated {updated} accounts")
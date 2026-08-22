"""
update_accounts_context.py

Update existing accounts with new context columns from CSV.
Run: python database/update_accounts_context.py
"""

import os
import sys
import pandas as pd

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database.database import get_session
from database.models import Account

session = get_session()

# Read the updated accounts CSV
csv_path = os.path.join(BACKEND_DIR, "data", "accounts.csv")
df = pd.read_csv(csv_path)

print("=" * 60)
print("UPDATING ACCOUNTS WITH CONTEXT DATA")
print("=" * 60)
print(f"Found {len(df)} accounts in CSV")

updated = 0
not_found = 0

for index, row in df.iterrows():
    account_id = row['account_id']
    
    # Find account in database
    account = session.query(Account).filter_by(account_id=account_id).first()
    
    if account:
        # Update with new columns
        account.relationship_type = row.get('relationship_type', 'UNKNOWN')
        account.occupation = row.get('occupation', None)
        account.annual_income = row.get('annual_income', None)
        account.age_group = row.get('age_group', None)
        account.account_purpose = row.get('account_purpose', 'PERSONAL')
        account.verified_status = row.get('verified_status', 'UNVERIFIED')
        account.kyc_status = row.get('kyc_status', 'PENDING')
        account.device_trust_score = int(row.get('device_trust_score', 50))
        account.last_login_device = row.get('last_login_device', None)
        account.is_trusted_device = bool(row.get('is_trusted_device', 0))
        updated += 1
    else:
        not_found += 1
    
    # Commit in batches
    if updated % 100 == 0:
        session.commit()
        print(f"   Updated {updated} accounts...")

session.commit()
print(f"\n✅ Updated: {updated} accounts")
if not_found > 0:
    print(f"⚠ Not found: {not_found} accounts")
print("=" * 60)

# Verify updates
print("\n🔍 Verifying updates...")
sample = session.query(Account).filter_by(account_id='A0014').first()
if sample:
    print(f"   Account A0014: {sample.account_name}")
    print(f"   Relationship Type: {sample.relationship_type}")
    print(f"   Occupation: {sample.occupation}")
    print(f"   Age Group: {sample.age_group}")
    print(f"   Account Purpose: {sample.account_purpose}")

print("\n✅ Done!")
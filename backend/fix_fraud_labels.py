import pandas as pd
import numpy as np

df = pd.read_csv('ml/datasets/merged_training_data.csv')
print(f"Loaded {len(df)} rows")

# Create synthetic relationship-based fraud
def get_fraud_label(row):
    is_family = row.get('is_family_transaction', 0)
    is_unknown = row.get('is_unknown_relationship', 0)
    is_student = row.get('sender_is_student', 0)
    amount = row.get('amount', 0)
    trust = row.get('sender_trust_score', 50)
    
    # Family transactions are always safe
    if is_family == 1:
        return 0
    
    # Student transactions are safe (parent sending money)
    if is_student == 1 and amount < 100000:
        return 0
    
    # Unknown + high amount = fraud
    if is_unknown == 1 and amount > 50000:
        return 1
    
    # Unknown + low trust = fraud
    if is_unknown == 1 and trust < 30:
        return 1
    
    # Unknown + high risk purpose = fraud
    if is_unknown == 1 and row.get('is_high_risk_purpose', 0) == 1:
        return 1
    
    # Default
    return 0

# Apply
df['is_fraud_new'] = df.apply(get_fraud_label, axis=1)

# Ensure both classes exist
fraud_count = df['is_fraud_new'].sum()
print(f"Fraud count: {fraud_count} / {len(df)} ({fraud_count/len(df)*100:.1f}%)")

# Show by relationship
print("\nFraud rate by relationship:")
for rel in ['is_family_transaction', 'is_unknown_relationship']:
    mask = df[rel] == 1
    if mask.sum() > 0:
        rate = df.loc[mask, 'is_fraud_new'].mean()
        print(f"  {rel}: {rate*100:.1f}% ({mask.sum()} transactions)")

# Save
df['is_fraud'] = df['is_fraud_new']
df.drop(columns=['is_fraud_new'], inplace=True)
df.to_csv('ml/datasets/merged_training_data.csv', index=False)
print("\n✅ Updated labels saved")
print("\nNow retrain: python ml/train_model.py")
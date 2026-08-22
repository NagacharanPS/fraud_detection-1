import pandas as pd
import numpy as np

df = pd.read_csv('ml/datasets/merged_training_data.csv')
print(f"Original rows: {len(df)}")

# Randomly assign relationships to 30% of transactions
np.random.seed(42)
mask = np.random.random(len(df)) < 0.3

# Assign family to some
family_mask = mask & (np.random.random(len(df)) < 0.3)
df.loc[family_mask, 'is_family_transaction'] = 1
df.loc[family_mask, 'is_unknown_relationship'] = 0

# Assign student to some (overlap with family)
student_mask = mask & (np.random.random(len(df)) < 0.2)
df.loc[student_mask, 'sender_is_student'] = 1

# Now define fraud based on relationship + amount
def label(row):
    amount = row['amount']
    is_family = row['is_family_transaction']
    is_student = row['sender_is_student']
    is_unknown = row['is_unknown_relationship']
    
    # Family/Student = safe
    if is_family == 1 or is_student == 1:
        return 0
    # Unknown + high amount = fraud
    if is_unknown == 1 and amount > 50000:
        return 1
    # Unknown + low trust = fraud
    if is_unknown == 1 and row.get('sender_trust_score', 50) < 30:
        return 1
    return 0

df['is_fraud_new'] = df.apply(label, axis=1)

# Ensure both classes
fraud_count = df['is_fraud_new'].sum()
if fraud_count == 0:
    # Force some fraud
    df.loc[df['amount'] > 100000, 'is_fraud_new'] = 1
if fraud_count == len(df):
    # Force some safe
    df.loc[df['amount'] < 5000, 'is_fraud_new'] = 0

print(f"Fraud: {df['is_fraud_new'].sum()} / {len(df)} ({df['is_fraud_new'].mean()*100:.1f}%)")
print(f"Family: {df['is_family_transaction'].sum()}")
print(f"Student: {df['sender_is_student'].sum()}")

df['is_fraud'] = df['is_fraud_new']
df.drop(columns=['is_fraud_new'], inplace=True)
df.to_csv('ml/datasets/merged_training_data.csv', index=False)
print("✅ Updated dataset saved")
import urllib.request
import json

scenarios = [
    # LOW
    {'id': 'low-1', 'sender_account': 'A0001', 'receiver_account': 'A0012', 'amount': 1450, 'is_new_receiver': False, 'is_new_device': False, 'transactions_last_10min': 0, 'transaction_time': '2026-09-22T12:00'},
    {'id': 'low-2', 'sender_account': 'A0002', 'receiver_account': 'A0010', 'amount': 2400, 'is_new_receiver': False, 'is_new_device': False, 'transactions_last_10min': 0, 'transaction_time': '2026-09-22T12:00'},
    {'id': 'low-3', 'sender_account': 'A0006', 'receiver_account': 'A0021', 'amount': 3500, 'is_new_receiver': False, 'is_new_device': False, 'transactions_last_10min': 0, 'transaction_time': '2026-09-22T12:00'},
    # MEDIUM
    {'id': 'med-1', 'sender_account': 'A0001', 'receiver_account': 'A0010', 'amount': 12500, 'is_new_receiver': True, 'is_new_device': False, 'transactions_last_10min': 0, 'transaction_time': '2026-09-22T12:00'},
    {'id': 'med-2', 'sender_account': 'A0002', 'receiver_account': 'A0031', 'amount': 16000, 'is_new_receiver': True, 'is_new_device': False, 'transactions_last_10min': 0, 'transaction_time': '2026-09-22T12:00'},
    {'id': 'med-3', 'sender_account': 'A0006', 'receiver_account': 'A0014', 'amount': 48000, 'is_new_receiver': True, 'is_new_device': False, 'transactions_last_10min': 1, 'transaction_time': '2026-09-22T12:00'},
    # HIGH
    {'id': 'high-1', 'sender_account': 'A0001', 'receiver_account': 'A0014', 'amount': 22000, 'is_new_receiver': True, 'is_new_device': False, 'transactions_last_10min': 0, 'transaction_time': '2026-09-22T02:30'},
    {'id': 'high-2', 'sender_account': 'A0002', 'receiver_account': 'A0010', 'amount': 26000, 'is_new_receiver': True, 'is_new_device': False, 'transactions_last_10min': 2, 'transaction_time': '2026-09-22T12:00'},
    {'id': 'high-3', 'sender_account': 'A0014', 'receiver_account': 'A0002', 'amount': 30000, 'is_new_receiver': True, 'is_new_device': False, 'transactions_last_10min': 1, 'transaction_time': '2026-09-22T12:00'},
    # CRITICAL
    {'id': 'crit-1', 'sender_account': 'A0001', 'receiver_account': 'A0026', 'amount': 185000, 'is_new_receiver': True, 'is_new_device': False, 'transactions_last_10min': 2, 'transaction_time': '2026-09-22T04:00'},
    {'id': 'crit-2', 'sender_account': 'A0004', 'receiver_account': 'A0091', 'amount': 350000, 'is_new_receiver': True, 'is_new_device': False, 'transactions_last_10min': 4, 'transaction_time': '2026-09-22T01:45'},
]

print(f"{'ID':<8} | {'Score':<6} | {'Level':<9} | {'Auth':<8} | {'Rec':<14} | {'Reasons'}")
print("-" * 85)

for sc in scenarios:
    req = urllib.request.Request(
        'http://127.0.0.1:3000/api/check-risk',
        data=json.dumps(sc).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            reasons_str = "; ".join(data.get('reasons', []))[:40]
            print(f"{sc['id']:<8} | {data['risk_score']:<6} | {data['risk_level']:<9} | {data['authentication']:<8} | {data['recommendation']:<14} | {reasons_str}")
    except Exception as e:
        print(f"{sc['id']:<8} | ERROR: {e}")

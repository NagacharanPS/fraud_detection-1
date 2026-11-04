import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\nagac\Desktop\fraud-detection\extracted_images\report_pages.json', encoding='utf-8') as f:
    up = json.load(f)

print('Total pages in user report:', len(up))
for p in range(len(up)):
    txt = up[p]['text'].strip()
    lines = [l.strip() for l in txt.split('\n') if l.strip()]
    header = ' // '.join(lines[:2]) if lines else 'EMPTY'
    # replace non-ascii or print clean
    clean_header = header.encode('ascii', errors='replace').decode('ascii')
    print(f"Page {p+1:02d}: {clean_header[:80]}")

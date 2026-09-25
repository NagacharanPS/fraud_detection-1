"""Small JSON-lines adapter used by the demo server for model inference."""
import json
import sys
from pathlib import Path

import joblib
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
artifact = joblib.load(ROOT / "models" / "relationship_aware_risk_model.pkl")
payload = json.loads(sys.stdin.read())
frame = pd.DataFrame([payload])[artifact["features"]]
print(json.dumps({"fraud_probability": float(artifact["pipeline"].predict_proba(frame)[0, 1])}))

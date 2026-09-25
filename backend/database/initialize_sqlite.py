"""Create or update the canonical SQLite database used by the Flask backend."""
import os
import sqlite3
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database.database import DATABASE_PATH, db
import database.models  # Register every model, including auth tables.
from flask import Flask

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DATABASE_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

with app.app_context():
    db.create_all()

connection = sqlite3.connect(DATABASE_PATH)
connection.execute("DROP TABLE IF EXISTS otp_sessions")
columns = {row[1] for row in connection.execute("PRAGMA table_info(users)")}
for name, definition in {
    "face_embedding": "TEXT",
    "template_hash": "TEXT",
    "algorithm_version": "TEXT DEFAULT 'opencv-yunet-sface-2021dec'",
    "enrolled_at": "DATETIME",
}.items():
    if name not in columns:
        connection.execute(f"ALTER TABLE users ADD COLUMN {name} {definition}")

if connection.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='user_face_biometrics'").fetchone():
    connection.execute("""UPDATE users SET
        face_embedding = (SELECT face_embedding FROM user_face_biometrics WHERE user_face_biometrics.user_id = users.user_id),
        template_hash = (SELECT template_hash FROM user_face_biometrics WHERE user_face_biometrics.user_id = users.user_id),
        algorithm_version = (SELECT algorithm_version FROM user_face_biometrics WHERE user_face_biometrics.user_id = users.user_id),
        enrolled_at = (SELECT enrolled_at FROM user_face_biometrics WHERE user_face_biometrics.user_id = users.user_id)
        WHERE EXISTS (SELECT 1 FROM user_face_biometrics WHERE user_face_biometrics.user_id = users.user_id)""")
    connection.execute("DROP TABLE user_face_biometrics")
connection.commit()
tx_columns = {row[1] for row in connection.execute("PRAGMA table_info(transactions)")}
for name, definition in {
    "transaction_type": "TEXT DEFAULT 'PUSH'",
    "transaction_purpose": "TEXT DEFAULT 'OTHER'",
    "beneficiary_type": "TEXT DEFAULT 'UNKNOWN'",
    "relationship_type": "TEXT DEFAULT 'UNKNOWN'",
    "relationship_verified": "BOOLEAN DEFAULT 0",
}.items():
    if name not in tx_columns:
        connection.execute(f"ALTER TABLE transactions ADD COLUMN {name} {definition}")
connection.commit()
connection.close()

print(f"SQLite database ready: {DATABASE_PATH}")
print("Open this file in DB Browser for SQLite.")

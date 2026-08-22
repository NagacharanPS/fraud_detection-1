import os
import sys

# Add project paths safely
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

CURRENT_DIR = os.path.abspath(os.path.dirname(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from database.database import db, DATABASE_PATH
from database.models import (
    Account,
    Transaction,
    AccountBehavior,
    GraphPattern,
    RiskAnalysisLog,
    UPIDirectory
)
from flask import Flask

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DATABASE_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    # Remove old database file if it exists to ensure fresh schema
    if os.path.exists(DATABASE_PATH):
        try:
            os.remove(DATABASE_PATH)
            print("Old database file removed.")
        except Exception as e:
            print(f"Note: Could not delete existing database file ({e}), dropping tables via SQLAlchemy...")
            db.drop_all()

    db.create_all()
    print("Database tables created successfully!")
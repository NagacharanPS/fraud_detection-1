"""
database.py

Creates the SQLite database connection and SQLAlchemy objects.
Every module in the project should import the database from here.
"""

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# SQLAlchemy instance used by Flask
db = SQLAlchemy()

# Database file path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "fraud_detection.db")

# SQLite URL
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# SQLAlchemy Engine
engine = create_engine(
    DATABASE_URL,
    echo=False,
    future=True
)

# Session Factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_session():
    """
    Returns a new SQLAlchemy session.
    """
    return SessionLocal()


def get_database_path():
    """
    Returns the absolute path of the SQLite database.
    """
    return DATABASE_PATH
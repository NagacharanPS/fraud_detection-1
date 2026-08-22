"""
Database package initialization

This package contains database configuration, models, and utilities
for the AI-Powered UPI Fraud Prevention System.
"""

from database.database import db
from database.models import (
    Account,
    Transaction,
    AccountBehavior,
    GraphPattern,
    RiskAnalysisLog,
    UPIDirectory
)

__all__ = [
    "db",
    "Account",
    "Transaction",
    "AccountBehavior",
    "GraphPattern",
    "RiskAnalysisLog",
    "UPIDirectory"
]
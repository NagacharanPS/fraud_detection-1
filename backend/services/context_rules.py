import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ContextRuleEngine:
    """
    Layer 3: Context Rules Engine for UPI Fraud Detection.
    Matches exact column definitions in database/models.py.
    """

    ROLE_LIMITS = {
        "STUDENT": 25000.0,
        "RETIRED": 50000.0,
        "INDIVIDUAL": 100000.0,
        "BUSINESS": 1000000.0,
        "GOVERNMENT": 10000000.0,
    }

    def __init__(self, db_session):
        self.db = db_session

    def evaluate_context(
        self,
        sender_account_id: str,
        receiver_account_id: str,
        amount: float,
        timestamp: Optional[datetime] = None
    ) -> Dict[str, Any]:
        if timestamp is None:
            timestamp = datetime.utcnow()

        from database.models import Account, UPIDirectory, Transaction

        results = {
            "role_limit_exceeded": False,
            "dormant_reactivation": False,
            "merchant_misuse": False,
            "is_blacklisted": False,
            "risk_score_contribution": 0.0,
            "flags": []
        }

        try:
            # 1. Check Blacklist and Account Status
            sender_acc = self.db.query(Account).filter_by(account_id=sender_account_id).first()
            receiver_acc = self.db.query(Account).filter_by(account_id=receiver_account_id).first()

            sender_upi = self.db.query(UPIDirectory).filter_by(account_id=sender_account_id).first()
            receiver_upi = self.db.query(UPIDirectory).filter_by(account_id=receiver_account_id).first()

            sender_status = sender_acc.account_status.upper() if (sender_acc and sender_acc.account_status) else ""
            receiver_status = receiver_acc.account_status.upper() if (receiver_acc and receiver_acc.account_status) else ""

            if sender_status in ["BLOCKED", "SUSPENDED", "BLACKLISTED"] or receiver_status in ["BLOCKED", "SUSPENDED", "BLACKLISTED"]:
                results["is_blacklisted"] = True
                results["flags"].append("BLACKLISTED_ENTITY_DETECTED")

            # 2. Role-Based Limits
            sender_role = (sender_acc.account_type.upper() if sender_acc and sender_acc.account_type else "INDIVIDUAL")
            max_limit = self.ROLE_LIMITS.get(sender_role, self.ROLE_LIMITS["INDIVIDUAL"])

            if amount > max_limit:
                results["role_limit_exceeded"] = True
                results["flags"].append(f"ROLE_LIMIT_EXCEEDED_{sender_role}")

            # 3. Dormant Account Reactivation Check
            ninety_days_ago_str = (timestamp - timedelta(days=90)).strftime("%Y-%m-%d %H:%M:%S")
            last_tx = self.db.query(Transaction).filter(
                (Transaction.sender_account == sender_account_id) | (Transaction.receiver_account == sender_account_id)
            ).order_by(Transaction.transaction_time.desc()).first()

            if last_tx and last_tx.transaction_time and last_tx.transaction_time < ninety_days_ago_str and amount > 5000.0:
                results["dormant_reactivation"] = True
                results["flags"].append("DORMANT_ACCOUNT_SUDDEN_HIGH_VALUE")

            # 4. Calculate Layer 3 Risk Contribution
            score = 0.0
            if results["is_blacklisted"]:
                score += 100.0
            if results["role_limit_exceeded"]:
                score += 40.0
            if results["dormant_reactivation"]:
                score += 35.0

            results["risk_score_contribution"] = min(score, 100.0)
            return results

        except SQLAlchemyError as db_err:
            logger.error(f"Database error during context evaluation: {str(db_err)}")
            self.db.rollback()
            return results
        except Exception as e:
            logger.error(f"Error in ContextRuleEngine: {str(e)}")
            return results
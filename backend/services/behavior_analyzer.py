import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BehaviorAnalyzer:

    def __init__(self, db_session=None):
        self.db = db_session

    def analyze_receiver(self, upi_id: str):

        if self.db is None:

            return {
                "behaviour_score": 92,
                "average_amount": 4200,
                "maximum_amount": 25000,
                "velocity": "LOW",
                "night_transactions": 2,
                "known_device": True,
                "risk_score": 12,
                "flags": []
            }

        try:

            from database.models import (
                UPIDirectory,
                AccountBehavior
            )

            receiver = (
                self.db.query(UPIDirectory)
                .filter_by(upi_id=upi_id)
                .first()
            )

            if receiver is None:

                return {
                    "behaviour_score": 0,
                    "flags": [
                        "RECEIVER_NOT_FOUND"
                    ]
                }

            behavior = (
                self.db.query(AccountBehavior)
                .filter_by(
                    account_id=receiver.account_id
                )
                .first()
            )

            if behavior is None:

                return {
                    "behaviour_score": 80,
                    "average_amount": 0,
                    "maximum_amount": 0,
                    "velocity": "UNKNOWN",
                    "night_transactions": 0,
                    "known_device": False,
                    "risk_score": 20,
                    "flags": [
                        "NO_BEHAVIOUR_HISTORY"
                    ]
                }

            score = 100
            flags = []

            avg = behavior.average_transaction_amount or 0
            maximum = behavior.maximum_transaction_amount or 0

            night = getattr(
                behavior,
                "night_transaction_count",
                0
            )

            if night > 10:
                score -= 15
                flags.append(
                    "HIGH_NIGHT_ACTIVITY"
                )

            velocity = "LOW"

            if avg > 50000:
                velocity = "HIGH"
                score -= 20

            elif avg > 10000:
                velocity = "MEDIUM"
                score -= 10

            return {

                "behaviour_score": max(
                    score,
                    0
                ),

                "average_amount": avg,

                "maximum_amount": maximum,

                "velocity": velocity,

                "night_transactions": night,

                "known_device": True,

                "risk_score": 100 - max(
                    score,
                    0
                ),

                "flags": flags

            }

        except SQLAlchemyError as e:

            logger.error(str(e))

            if self.db:
                self.db.rollback()

            return {
                "behaviour_score": 0,
                "flags": [
                    "DATABASE_ERROR"
                ]
            }

    def analyze_transaction(
        self,
        sender_account_id: str,
        receiver_account_id: str,
        amount: float,
        timestamp: Optional[datetime] = None
    ) -> Dict[str, Any]:

        if timestamp is None:
            timestamp = datetime.utcnow()

        if self.db is None:

            return {
                "amount_anomaly": amount > 10000,
                "velocity_anomaly": False,
                "frequency_anomaly": False,
                "night_transfer": timestamp.hour >= 23 or timestamp.hour < 5,
                "risk_score_contribution": 20,
                "flags": []
            }

        from database.models import (
            AccountBehavior,
            Transaction,
            ReceiverReputation
        )

        results = {

            "amount_anomaly": False,

            "velocity_anomaly": False,

            "frequency_anomaly": False,

            "night_transfer": False,

            "receiver_trust_score": 1.0,

            "risk_score_contribution": 0,

            "flags": []

        }

        try:

            behavior = (
                self.db.query(AccountBehavior)
                .filter_by(
                    account_id=sender_account_id
                )
                .first()
            )

            avg = 1000

            if behavior:
                avg = behavior.average_transaction_amount or 1000

            if amount > avg * 3:

                results["amount_anomaly"] = True

                results["flags"].append(
                    "HIGH_AMOUNT"
                )

            one_hour = timestamp - timedelta(hours=1)

            count = (
                self.db.query(
                    func.count(Transaction.transaction_id)
                )
                .filter(
                    Transaction.sender_account == sender_account_id,
                    Transaction.transaction_time >= one_hour
                )
                .scalar()
            )

            if count >= 10:

                results["velocity_anomaly"] = True

                results["flags"].append(
                    "HIGH_VELOCITY"
                )

            if timestamp.hour >= 23 or timestamp.hour < 5:

                results["night_transfer"] = True

            score = 0

            if results["amount_anomaly"]:
                score += 35

            if results["velocity_anomaly"]:
                score += 25

            if results["night_transfer"]:
                score += 10

            results["risk_score_contribution"] = score

            return results

        except Exception as e:

            logger.error(str(e))

            return results
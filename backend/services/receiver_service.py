import logging
from typing import Dict, Any
from sqlalchemy.exc import SQLAlchemyError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ReceiverService:

    def __init__(self, db_session=None):
        self.db = db_session

    def verify_receiver(self, upi_id: str) -> Dict[str, Any]:

        if self.db is None:
            return {
                "verified": True,
                "upi_id": upi_id,
                "receiver_name": "Demo Receiver",
                "bank": "Demo Bank",
                "trust_score": 90,
                "risk_level": "LOW"
            }

        try:

            from database.models import UPIDirectory

            receiver = (
                self.db.query(UPIDirectory)
                .filter_by(upi_id=upi_id)
                .first()
            )

            if receiver is None:
                return {
                    "verified": False
                }

            return {
                "verified": True,
                "upi_id": receiver.upi_id,
                "receiver_name": receiver.account_holder_name,
                "bank": receiver.bank_name,
                "account_number": receiver.account_number,
                "trust_score": getattr(receiver, "trust_score", 90),
                "risk_level": getattr(receiver, "risk_level", "LOW")
            }

        except SQLAlchemyError as e:

            logger.error(str(e))

            return {
                "verified": False
            }

    def analyze_receiver(self, receiver_account_id: str) -> Dict[str, Any]:

        if self.db is None:

            return {
                "behaviour_score": 92,
                "average_amount": 4200,
                "max_amount": 25000,
                "night_transactions": 2,
                "known_device": True,
                "reasons": []
            }

        from database.models import (
            Account,
            ReceiverReputation,
            Alert
        )

        results = {
            "receiver_account": receiver_account_id,
            "trust_score": 100,
            "is_high_risk": False,
            "is_blacklisted": False,
            "suspicious_ratio": 0.0,
            "prior_alerts_count": 0,
            "risk_score_contribution": 0.0,
            "reasons": []
        }

        try:

            account = (
                self.db.query(Account)
                .filter_by(account_id=receiver_account_id)
                .first()
            )

            if account is None:

                results["reasons"].append(
                    "Receiver account not found"
                )

                results["risk_score_contribution"] = 30

                return results

            if getattr(account, "trust_score", None) is not None:
                results["trust_score"] = account.trust_score

            rep = (
                self.db.query(ReceiverReputation)
                .filter_by(account_id=receiver_account_id)
                .first()
            )

            if rep:

                total = rep.total_received_transactions or 0
                suspicious = rep.suspicious_received_transactions or 0

                if total > 0:

                    ratio = suspicious / total

                    results["suspicious_ratio"] = round(
                        ratio,
                        2
                    )

                    if ratio >= 0.30:

                        results["is_high_risk"] = True

                        results["reasons"].append(
                            "High suspicious transaction ratio"
                        )

            alerts = (
                self.db.query(Alert)
                .filter_by(
                    receiver_account=receiver_account_id
                )
                .count()
            )

            results["prior_alerts_count"] = alerts

            score = 0

            if results["is_high_risk"]:
                score += 40

            if results["trust_score"] < 50:
                score += 30

            if alerts > 0:
                score += min(alerts * 10, 30)

            results["risk_score_contribution"] = min(
                score,
                100
            )

            return results

        except Exception as e:

            logger.error(str(e))

            return {
                "receiver_account": receiver_account_id,
                "trust_score": 50,
                "is_high_risk": False,
                "risk_score_contribution": 0,
                "reasons": [
                    "PROCESSING_ERROR"
                ]
            }
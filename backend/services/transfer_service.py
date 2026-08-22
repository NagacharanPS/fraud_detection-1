import logging
from datetime import datetime
from typing import Dict, Any

from sqlalchemy.exc import SQLAlchemyError

from ml.predict import FraudPredictor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TransferService:

    def __init__(self, db_session):
        self.db = db_session
        self.predictor = FraudPredictor()

    def process_transfer(
        self,
        sender_account_id: str,
        receiver_account_id: str,
        amount: float,
        remark: str = ""
    ) -> Dict[str, Any]:
        from database.models import (
            Account,
            Transaction,
            Alert,
            AccountBehavior
        )

        try:
            sender = self.db.query(Account).filter_by(
                account_id=sender_account_id
            ).first()

            receiver = self.db.query(Account).filter_by(
                account_id=receiver_account_id
            ).first()

            if sender is None:
                return {
                    "success": False,
                    "message": "Sender account not found."
                }

            if receiver is None:
                return {
                    "success": False,
                    "message": "Receiver account not found."
                }

            if sender.current_balance < amount:
                return {
                    "success": False,
                    "message": "Insufficient balance."
                }

            behaviour = self.db.query(
                AccountBehavior
            ).filter_by(
                account_id=sender_account_id
            ).first()

            features = {
                "amount": amount,
                "fraud_probability": 0,
                "transaction_status": "SUCCESS",
                "payment_mode": "UPI",
                "location": "INDIA",
                "sender_account_type": sender.account_type,
                "receiver_account_type": receiver.account_type,
                "sender_bank_name": sender.bank_name,
                "receiver_bank_name": receiver.bank_name,
                "sender_current_balance": sender.current_balance,
                "receiver_current_balance": receiver.current_balance,
                "sender_trust_score": sender.trust_score,
                "receiver_trust_score": receiver.trust_score,
                "sender_total_transactions": (
                    behaviour.total_transactions if behaviour else 0
                ),
                "sender_total_sent_transactions": (
                    behaviour.total_sent_transactions if behaviour else 0
                ),
                "sender_total_received_transactions": (
                    behaviour.total_received_transactions if behaviour else 0
                ),
                "sender_total_amount_sent": (
                    behaviour.total_amount_sent if behaviour else 0
                ),
                "sender_total_amount_received": (
                    behaviour.total_amount_received if behaviour else 0
                ),
                "sender_average_transaction_amount": (
                    behaviour.average_transaction_amount if behaviour else 0
                ),
                "sender_average_daily_amount": (
                    behaviour.average_daily_amount if behaviour else 0
                ),
                "sender_maximum_transaction_amount": (
                    behaviour.maximum_transaction_amount if behaviour else 0
                ),
                "sender_minimum_transaction_amount": (
                    behaviour.minimum_transaction_amount if behaviour else 0
                ),
                "sender_night_transactions": (
                    behaviour.night_transactions if behaviour else 0
                ),
                "sender_frequent_receiver_count": (
                    behaviour.frequent_receiver_count if behaviour else 0
                ),
                "sender_fraud_transactions": (
                    behaviour.fraud_transactions if behaviour else 0
                )
            }

            prediction = self.predictor.predict(features)

            risk_score = prediction["risk_score"]
            risk_level = prediction["risk_level"]
            recommendation = prediction["recommendation"]
            authentication = prediction["authentication"]
            fraud_probability = prediction["fraud_probability"]

            transaction_id = (
                "TX" + datetime.now().strftime("%Y%m%d%H%M%S%f")[-12:]
            )
            current_time = datetime.now()

            transaction = Transaction(
                transaction_id=transaction_id,
                sender_account=sender_account_id,
                receiver_account=receiver_account_id,
                amount=amount,
                remarks=remark,
                transaction_time=current_time,
                transaction_status="PENDING",
                payment_mode="UPI",
                fraud_probability=round(fraud_probability * 100, 2),
                risk_level=risk_level,
                ml_prediction=recommendation,
                is_fraud=1 if risk_level == "CRITICAL" else 0
            )

            if recommendation == "ALLOW":
                sender.current_balance -= amount
                receiver.current_balance += amount
                transaction.transaction_status = "SUCCESS"
                status = "COMPLETED"
                message = "Transfer completed successfully."
            elif authentication == "OTP":
                transaction.transaction_status = "PENDING_OTP"
                status = "OTP_REQUIRED"
                message = "OTP verification required."
            elif authentication == "FACE":
                transaction.transaction_status = "PENDING_FACE"
                status = "FACE_REQUIRED"
                message = "Face verification required."
            else:
                transaction.transaction_status = "BLOCKED"
                status = "BLOCKED"
                message = "Transaction blocked due to fraud risk."

            self.db.add(transaction)

            if risk_level in ["HIGH", "CRITICAL"]:
                alert = Alert(
                    alert_id="ALT" + transaction_id[2:],
                    transaction_id=transaction_id,
                    sender_account=sender_account_id,
                    receiver_account=receiver_account_id,
                    transaction_amount=amount,
                    final_risk_score=risk_score,
                    risk_level=risk_level,
                    alert_type="ML_FRAUD_DETECTION",
                    alert_generated_at=current_time,
                    recommended_action=recommendation,
                    alert_status="OPEN"
                )
                self.db.add(alert)

            self.db.commit()

            return {
                "success": True,
                "status": status,
                "message": message,
                "transaction_id": transaction_id,
                "sender_account": sender_account_id,
                "receiver_account": receiver_account_id,
                "receiver_name": receiver.account_name,
                "receiver_upi": receiver.upi_id,
                "amount": amount,
                "remaining_balance": sender.current_balance,
                "ai_analysis": {
                    "risk_score": risk_score,
                    "risk_level": risk_level,
                    "authentication": authentication,
                    "recommendation": recommendation,
                    "fraud_probability": round(fraud_probability * 100, 2)
                }
            }

        except SQLAlchemyError as e:
            logger.exception("Database Error")
            self.db.rollback()
            return {
                "success": False,
                "status": "FAILED",
                "message": "Database error occurred.",
                "error": str(e)
            }

        except Exception as e:
            logger.exception("Transfer Error")
            self.db.rollback()
            return {
                "success": False,
                "status": "FAILED",
                "message": "Unexpected error occurred.",
                "error": str(e)
            }
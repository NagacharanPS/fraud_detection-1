import logging
from typing import Dict, Any

from sqlalchemy.exc import SQLAlchemyError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RiskEngine:

    def __init__(self, db_session=None):
        self.db = db_session

    def calculate_receiver_risk(
        self,
        receiver,
        behaviour,
        graph
    ):

        trust = receiver.get("trust_score", 50)

        graph_score = graph.get("graph_score", 0)

        behaviour_score = behaviour.get("risk_score", 0)

        receiver_score = max(100 - trust, 0)

        final_score = (
            graph_score * 0.40 +
            behaviour_score * 0.30 +
            receiver_score * 0.30
        )

        final_score = round(min(final_score, 100), 2)

        if final_score < 30:
            prediction = "SAFE"
            recommendation = "Proceed"
            risk_level = "LOW"

        elif final_score < 60:
            prediction = "WARNING"
            recommendation = "Verify Receiver"
            risk_level = "MEDIUM"

        elif final_score < 80:
            prediction = "HIGH RISK"
            recommendation = "Do Not Proceed"
            risk_level = "HIGH"

        else:
            prediction = "BLOCK"
            recommendation = "Block Transaction"
            risk_level = "CRITICAL"

        reasons = []

        reasons.extend(graph.get("reasons", []))
        reasons.extend(behaviour.get("flags", []))

        return {

            "risk_score": final_score,

            "prediction": prediction,

            "risk_level": risk_level,

            "recommendation": recommendation,

            "graph_score": graph_score,

            "behaviour_score": behaviour_score,

            "receiver_score": receiver_score,

            "reasons": list(dict.fromkeys(reasons))

        }

    def evaluate_risk(
        self,
        transaction_id,
        sender_account_id,
        receiver_account_id,
        amount,
        graph_results,
        behavior_results,
        receiver_results,
        context_results
    ):

        graph = graph_results.get(
            "risk_score_contribution",
            0
        )

        behaviour = behavior_results.get(
            "risk_score_contribution",
            0
        )

        receiver = receiver_results.get(
            "risk_score_contribution",
            0
        )

        context = context_results.get(
            "risk_score_contribution",
            0
        )

        amount_score = 0

        if amount >= 100000:
            amount_score = 100

        elif amount >= 50000:
            amount_score = 70

        elif amount >= 20000:
            amount_score = 40

        else:
            amount_score = 10

        final = round(

            graph * 0.30 +

            behaviour * 0.25 +

            receiver * 0.20 +

            context * 0.15 +

            amount_score * 0.10,

            2

        )

        if final > 100:
            final = 100

        reasons = []

        if graph >= 60:
            reasons.append(
                "Suspicious graph pattern detected."
            )

        if behaviour >= 60:
            reasons.append(
                "Abnormal transaction behaviour."
            )

        if receiver >= 60:
            reasons.append(
                "Receiver has low trust score."
            )

        if context >= 60:
            reasons.append(
                "Context aware rules triggered."
            )

        if amount_score >= 70:
            reasons.append(
                "High value transaction."
            )

        if final <= 30:

            level = "LOW"

            recommendation = "ALLOW"

            authentication = "NONE"

        elif final <= 60:

            level = "MEDIUM"

            recommendation = "OTP"

            authentication = "OTP"

        elif final <= 80:

            level = "HIGH"

            recommendation = "FACE"

            authentication = "FACE"

        else:

            level = "CRITICAL"

            recommendation = "FREEZE"

            authentication = "FREEZE"

        payload = {

            "transaction_id": transaction_id,

            "sender": sender_account_id,

            "receiver": receiver_account_id,

            "amount": amount,

            "risk_score": final,

            "risk_level": level,

            "recommendation": recommendation,

            "authentication": authentication,

            "reasons": reasons,

            "layer_breakdown": {

                "graph": graph,

                "behaviour": behaviour,

                "receiver": receiver,

                "context": context,

                "amount": amount_score

            }

        }

        if self.db:

            self.save_risk_score(

                transaction_id,

                sender_account_id,

                receiver_account_id,

                payload

            )

        return payload

    
    def save_risk_score(
        self,
        transaction_id,
        sender_id,
        receiver_id,
        payload
    ):

        if self.db is None:
            return True

        try:

            from database.models import RiskScore

            breakdown = payload["layer_breakdown"]

            row = RiskScore(

                transaction_id=transaction_id,

                sender_account=sender_id,

                receiver_account=receiver_id,

                graph_risk_score=breakdown["graph"],

                ml_risk_score=breakdown["behaviour"],

                receiver_trust_risk=breakdown["receiver"],

                amount_risk_score=breakdown["amount"],

                final_risk_score=payload["risk_score"],

                risk_level=payload["risk_level"],

                recommendation=payload["recommendation"]

            )

            self.db.add(row)

            self.db.commit()

            return True

        except SQLAlchemyError as e:

            logger.error(str(e))

            self.db.rollback()

            return False
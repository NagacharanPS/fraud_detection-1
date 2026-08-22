import logging
import uuid
from typing import Dict, Any, Optional

from services.graph_detector import GraphDetector
from services.behavior_analyzer import BehaviorAnalyzer
from services.receiver_service import ReceiverService
from services.context_rules import ContextRuleEngine
from services.risk_engine import RiskEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FraudEngine:

    def __init__(self, db_session=None):

        self.db = db_session

        self.graph_detector = GraphDetector(self.db)
        self.behavior_analyzer = BehaviorAnalyzer(self.db)
        self.receiver_service = ReceiverService(self.db)
        self.context_rules = ContextRuleEngine(self.db)
        self.risk_engine = RiskEngine(self.db)

    def evaluate_transaction(
        self,
        sender_account_id: str,
        receiver_account_id: str,
        amount: float,
        transaction_id: Optional[str] = None
    ) -> Dict[str, Any]:

        if transaction_id is None:
            transaction_id = "TX" + uuid.uuid4().hex[:10].upper()

        try:

            graph = self.graph_detector.analyze_transaction_graph(
                sender_account_id,
                receiver_account_id,
                amount
            )

            behaviour = self.behavior_analyzer.analyze_transaction(
                sender_account_id,
                receiver_account_id,
                amount
            )

            receiver = self.receiver_service.analyze_receiver(
                receiver_account_id
            )

            context = self.context_rules.evaluate_context(
                sender_account_id,
                receiver_account_id,
                amount
            )

            risk = self.risk_engine.evaluate_risk(

                transaction_id=transaction_id,

                sender_account_id=sender_account_id,

                receiver_account_id=receiver_account_id,

                amount=amount,

                graph_results=graph,

                behavior_results=behaviour,

                receiver_results=receiver,

                context_results=context

            )

            return {

                "success": True,

                "transaction_id": transaction_id,

                "sender": sender_account_id,

                "receiver": receiver_account_id,

                "amount": amount,

                "graph": graph,

                "behaviour": behaviour,

                "receiver_analysis": receiver,

                "context": context,

                "risk": risk

            }

        except Exception as e:

            logger.error(str(e))

            return {

                "success": False,

                "transaction_id": transaction_id,

                "risk": {

                    "risk_score": 100,

                    "risk_level": "CRITICAL",

                    "recommendation": "BLOCK"

                },

                "error": str(e)

            }

    def verify_receiver(
        self,
        upi_id: str
    ):

        receiver = self.receiver_service.verify_receiver(
            upi_id
        )

        if not receiver.get("verified"):

            return {

                "success": False,

                "verified": False

            }

        behaviour = self.behavior_analyzer.analyze_receiver(
            upi_id
        )

        graph = self.graph_detector.receiver_graph_analysis(
            upi_id
        )

        risk = self.risk_engine.calculate_receiver_risk(

            receiver,

            behaviour,

            graph

        )

        return {

            "success": True,

            "receiver": receiver,

            "behaviour": behaviour,

            "graph": graph,

            "risk": risk

        }
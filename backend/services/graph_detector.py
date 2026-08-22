import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

import networkx as nx
from sqlalchemy.exc import SQLAlchemyError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GraphDetector:

    def __init__(self, db_session=None):
        self.db = db_session

    def receiver_graph_analysis(self, upi_id: str):

        if self.db is None:

            return {
                "graph_score": 8,
                "fan_out": False,
                "fan_in": False,
                "circular": False,
                "multi_hop": False,
                "scatter_gather": False,
                "rapid": False,
                "risk_level": "LOW",
                "reasons": []
            }

        try:

            from database.models import (
                UPIDirectory,
                Transaction
            )

            receiver = (
                self.db.query(UPIDirectory)
                .filter_by(upi_id=upi_id)
                .first()
            )

            if receiver is None:

                return {
                    "graph_score": 100,
                    "risk_level": "HIGH",
                    "reasons": [
                        "RECEIVER_NOT_FOUND"
                    ]
                }

            account = receiver.account_id

            G = nx.DiGraph()

            txs = self.db.query(Transaction).all()

            for tx in txs:

                G.add_edge(
                    tx.sender_account,
                    tx.receiver_account
                )

            fan_in = G.in_degree(account) if G.has_node(account) else 0
            fan_out = G.out_degree(account) if G.has_node(account) else 0

            circular = False

            try:

                for cycle in nx.simple_cycles(G):

                    if account in cycle:

                        circular = True
                        break

            except Exception:
                pass

            multi_hop = False

            if G.has_node(account):

                if fan_out >= 5:
                    multi_hop = True

            scatter = fan_in >= 5 and fan_out >= 5

            rapid = False

            last15 = datetime.utcnow() - timedelta(minutes=15)

            count = (
                self.db.query(Transaction)
                .filter(
                    Transaction.receiver_account == account,
                    Transaction.transaction_time >= last15
                )
                .count()
            )

            if count >= 5:
                rapid = True

            score = 0

            if fan_out >= 5:
                score += 20

            if fan_in >= 5:
                score += 20

            if circular:
                score += 35

            if multi_hop:
                score += 15

            if scatter:
                score += 10

            if rapid:
                score += 15

            if score >= 70:
                level = "HIGH"
            elif score >= 40:
                level = "MEDIUM"
            else:
                level = "LOW"

            return {

                "graph_score": score,

                "fan_out": fan_out >= 5,

                "fan_in": fan_in >= 5,

                "circular": circular,

                "multi_hop": multi_hop,

                "scatter_gather": scatter,

                "rapid": rapid,

                "risk_level": level,

                "reasons": []

            }

        except SQLAlchemyError as e:

            logger.error(str(e))

            if self.db:
                self.db.rollback()

            return {
                "graph_score": 0,
                "risk_level": "UNKNOWN",
                "reasons": [
                    "DATABASE_ERROR"
                ]
            }

    def analyze_transaction_graph(
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
                "fan_out": False,
                "fan_in": False,
                "circular": False,
                "rapid": False,
                "multi_hop": False,
                "scatter_gather": False,
                "risk_score_contribution": 10,
                "reasons": []
            }

        from database.models import Transaction

        results = {

            "fan_out": False,

            "fan_in": False,

            "circular": False,

            "rapid": False,

            "multi_hop": False,

            "scatter_gather": False,

            "risk_score_contribution": 0,

            "reasons": []

        }

        try:

            G = nx.DiGraph()

            txs = self.db.query(Transaction).all()

            for tx in txs:

                G.add_edge(
                    tx.sender_account,
                    tx.receiver_account
                )

            G.add_edge(
                sender_account_id,
                receiver_account_id
            )

            if G.out_degree(sender_account_id) >= 5:
                results["fan_out"] = True

            if G.in_degree(receiver_account_id) >= 5:
                results["fan_in"] = True

            try:

                for cycle in nx.simple_cycles(G):

                    if sender_account_id in cycle and receiver_account_id in cycle:

                        results["circular"] = True
                        break

            except Exception:
                pass

            score = 0

            if results["fan_out"]:
                score += 20

            if results["fan_in"]:
                score += 20

            if results["circular"]:
                score += 40

            results["risk_score_contribution"] = score

            return results

        except Exception as e:

            logger.error(str(e))

            return results
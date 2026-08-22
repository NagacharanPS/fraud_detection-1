from flask import Blueprint, request, jsonify

from services.receiver_service import ReceiverService
from services.behavior_analyzer import BehaviorAnalyzer
from services.graph_detector import GraphDetector
from services.risk_engine import RiskEngine

receiver_bp = Blueprint(
    "receiver",
    __name__
)

receiver_service = ReceiverService()
behavior_service = BehaviorAnalyzer()
graph_service = GraphDetector()
risk_engine = RiskEngine()


# -----------------------------------------------------
# POST API (Existing)
# -----------------------------------------------------
@receiver_bp.route(
    "/api/receiver/verify",
    methods=["POST"]
)
def verify_receiver():

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body missing"
        }), 400

    upi_id = data.get("upi_id")

    if not upi_id:
        return jsonify({
            "success": False,
            "message": "UPI ID is required"
        }), 400

    return analyze_receiver(upi_id)


# -----------------------------------------------------
# GET API (For React Frontend)
# -----------------------------------------------------
@receiver_bp.route(
    "/api/receiver/<upi_id>",
    methods=["GET"]
)
def get_receiver(upi_id):

    return analyze_receiver(upi_id)


# -----------------------------------------------------
# Shared Receiver Analysis
# -----------------------------------------------------
def analyze_receiver(upi_id):

    receiver = receiver_service.verify_receiver(
        upi_id
    )

    if not receiver.get("verified"):

        return jsonify({

            "success": False,

            "verified": False,

            "message": "Receiver not found"

        }), 404

    behaviour = behavior_service.analyze_receiver(
        upi_id
    )

    graph = graph_service.receiver_graph_analysis(
        upi_id
    )

    risk = risk_engine.calculate_receiver_risk(

        receiver=receiver,

        behaviour=behaviour,

        graph=graph

    )

    return jsonify({

        "success": True,

        "receiver": receiver,

        "behaviour": behaviour,

        "graph": graph,

        "risk": risk,

        "summary": {

            "receiver_name": receiver.get("account_name"),

            "upi_id": receiver.get("upi_id"),

            "bank_name": receiver.get("bank_name"),

            "verified": receiver.get("verified"),

            "trust_score": receiver.get("trust_score"),

            "behaviour_score": risk.get("behaviour_score"),

            "graph_score": risk.get("graph_score"),

            "risk_score": risk.get("risk_score"),

            "risk_level": risk.get("risk_level"),

            "recommendation": risk.get("recommendation")

        }

    })
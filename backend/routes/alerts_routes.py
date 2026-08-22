from flask import Blueprint, jsonify

alerts_bp = Blueprint(
    "alerts",
    __name__
)

@alerts_bp.route("/api/alerts", methods=["GET"])
def get_alerts():

    return jsonify([
        {
            "transaction_id": "TXN1001",
            "sender": "Rahul",
            "amount": 25000,
            "risk_score": 98,
            "risk_level": "CRITICAL"
        },
        {
            "transaction_id": "TXN1002",
            "sender": "Sai",
            "amount": 8500,
            "risk_score": 81,
            "risk_level": "HIGH"
        },
        {
            "transaction_id": "TXN1003",
            "sender": "Amazon",
            "amount": 999,
            "risk_score": 18,
            "risk_level": "LOW"
        }
    ])
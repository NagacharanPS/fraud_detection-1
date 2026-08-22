from flask import Blueprint, request, jsonify
from database.database import db
from backend.services.transfer_service import TransferService

transfer_bp = Blueprint("transfer_bp", __name__)


@transfer_bp.route("/api/transfer", methods=["POST"])
def process_transfer_route():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "status": "FAILED",
            "message": "Invalid JSON payload"
        }), 400

    sender_id = data.get("sender_id")
    receiver_id = data.get("receiver_id")
    amount = data.get("amount")
    remark = data.get("remark", "")

    if not sender_id:
        return jsonify({
            "status": "FAILED",
            "message": "sender_id is required"
        }), 400

    if not receiver_id:
        return jsonify({
            "status": "FAILED",
            "message": "receiver_id is required"
        }), 400

    if amount is None:
        return jsonify({
            "status": "FAILED",
            "message": "amount is required"
        }), 400

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return jsonify({
            "status": "FAILED",
            "message": "Amount must be numeric"
        }), 400

    if amount <= 0:
        return jsonify({
            "status": "FAILED",
            "message": "Amount must be greater than zero"
        }), 400

    try:

        service = TransferService(db.session)

        result = service.process_transfer(
            sender_account_id=sender_id,
            receiver_account_id=receiver_id,
            amount=amount,
            remark=remark
        )

        if result.get("status") in ["FAILED", "BLOCKED"]:
            return jsonify(result), 400

        return jsonify(result), 200

    except Exception as e:

        return jsonify({
            "status": "FAILED",
            "message": str(e)
        }), 500
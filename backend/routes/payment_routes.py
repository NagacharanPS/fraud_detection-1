from flask import Blueprint, request, jsonify
from ml.predict import FraudPredictor
from datetime import datetime
import json
import uuid

from database.database import db
from database.models import (
    Account,
    UPIDirectory,
    Transaction,
    AccountBehavior,
    RiskAnalysisLog
)

from backend.services.transfer_service import TransferService

payment_bp = Blueprint("payment_bp", __name__)

predictor = FraudPredictor()

# ==========================================================
# Helper
# ==========================================================

def transfer_service():
    return TransferService(db.session)


# ==========================================================
# Dashboard
# ==========================================================

@payment_bp.route("/api/dashboard", methods=["GET"])
def dashboard():
    total_accounts = Account.query.count()
    total_transactions = Transaction.query.count()
    total_balance = db.session.query(db.func.sum(Account.current_balance)).scalar() or 0
    active_accounts = Account.query.filter_by(account_status="ACTIVE").count()
    return jsonify({
        "success": True,
        "total_accounts": total_accounts,
        "total_transactions": total_transactions,
        "active_accounts": active_accounts,
        "total_balance": round(total_balance, 2)
    })


# ==========================================================
# Balance API
# ==========================================================

@payment_bp.route("/api/balance/<account_id>", methods=["GET"])
def get_balance(account_id):
    account = Account.query.filter_by(account_id=account_id).first()
    if account is None:
        return jsonify({"success": False, "message": "Account not found."}), 404
    return jsonify({
        "success": True,
        "account_id": account.account_id,
        "account_name": account.account_name,
        "upi_id": account.upi_id,
        "bank_name": account.bank_name,
        "account_type": account.account_type,
        "balance": account.current_balance,
        "trust_score": account.trust_score,
        "status": account.account_status
    })


# ==========================================================
# Receiver Lookup
# ==========================================================

@payment_bp.route("/api/receiver/<upi_id>", methods=["GET"])
def receiver_lookup(upi_id):
    receiver = Account.query.filter_by(upi_id=upi_id).first()
    if receiver is None:
        receiver = UPIDirectory.query.filter_by(upi_id=upi_id).first()
        if receiver is None:
            return jsonify({"success": False, "message": "Receiver not found."}), 404
        return jsonify({
            "success": True,
            "account_id": receiver.account_id,
            "account_name": receiver.account_name,
            "upi_id": receiver.upi_id,
            "bank_name": receiver.bank_name,
            "account_type": receiver.account_type,
            "verified": receiver.is_verified,
            "status": receiver.account_status
        })
    return jsonify({
        "success": True,
        "account_id": receiver.account_id,
        "account_name": receiver.account_name,
        "upi_id": receiver.upi_id,
        "bank_name": receiver.bank_name,
        "account_type": receiver.account_type,
        "verified": "YES",
        "status": receiver.account_status,
        "trust_score": receiver.trust_score
    })


# ==========================================================
# Check Risk API (FIXED: Payload & Database Sync)
# ==========================================================

@payment_bp.route("/api/check-risk", methods=["POST"])
def check_risk():
    try:
        data = request.get_json() or {}

        sender = data.get("sender_account") or data.get("sender_id")
        receiver = data.get("receiver_account") or data.get("receiver_id")
        amount = float(data.get("amount", 0))

        relationship_type = str(data.get("relationship_type") or data.get("category") or "UNKNOWN").upper()
        transaction_purpose = str(data.get("transaction_purpose") or data.get("purpose") or "OTHER").upper()

        # Parse transaction time
        transaction_time_str = data.get("transaction_time")
        if transaction_time_str:
            try:
                transaction_time = datetime.fromisoformat(transaction_time_str)
            except Exception:
                transaction_time = datetime.utcnow()
        else:
            transaction_time = datetime.utcnow()

        hour = transaction_time.hour
        is_night_transaction = 1 if (hour >= 23 or hour < 5) else 0

        sender_account = Account.query.filter_by(account_id=sender).first()
        receiver_account = Account.query.filter_by(account_id=receiver).first()
        behaviour = AccountBehavior.query.filter_by(account_id=sender).first()

        if sender_account is None:
            return jsonify({"success": False, "message": f"Sender account '{sender}' not found"}), 404
        if receiver_account is None:
            return jsonify({"success": False, "message": f"Receiver account '{receiver}' not found"}), 404

        # Insufficient Balance Check
        if sender_account.current_balance < amount:
            return jsonify({
                "success": False,
                "error": "INSUFFICIENT_BALANCE",
                "message": "Insufficient balance.",
                "available_balance": sender_account.current_balance,
                "requested_amount": amount
            }), 400

        # ---------- Map relationship to flags ----------
        is_family = 1 if relationship_type in ['FAMILY', 'PARENT', 'CHILD', 'SIBLING', 'SPOUSE'] else 0
        is_work = 1 if relationship_type in ['WORK', 'EMPLOYER', 'EMPLOYEE', 'COLLEAGUE'] else 0
        is_business = 1 if relationship_type in ['BUSINESS', 'CUSTOMER', 'SUPPLIER'] else 0
        is_unknown = 1 if relationship_type in ['UNKNOWN', 'OTHER', 'NONE', ''] else 0

        # Check sender account context (Check both relationship_type and account_type)
        sender_rel = str(getattr(sender_account, 'relationship_type', '') or '').upper()
        sender_acc_type = str(getattr(sender_account, 'account_type', '') or '').upper()
        sender_context = f"{sender_rel} {sender_acc_type} {relationship_type}"

        sender_is_student = 1 if 'STUDENT' in sender_context else 0
        sender_is_professional = 1 if 'PROFESSIONAL' in sender_context else 0
        sender_is_business = 1 if 'BUSINESS' in sender_context or 'MERCHANT' in sender_context else 0

        high_risk_purposes = ['CRYPTOCURRENCY', 'GAMBLING', 'ONLINE_GAMING', 'CRYPTO']
        is_high_risk_purpose = 1 if transaction_purpose in high_risk_purposes else 0

        # Receiver context check
        rec_acc_type = str(getattr(receiver_account, 'account_type', '') or '').upper()
        rec_rel_type = str(getattr(receiver_account, 'relationship_type', '') or '').upper()
        rec_context = f"{rec_acc_type} {rec_rel_type}"

        receiver_is_educational = 1 if 'EDUCATIONAL' in rec_context or 'COLLEGE' in rec_context or 'SCHOOL' in rec_context else 0
        receiver_is_government = 1 if 'GOVERNMENT' in rec_context or 'GOVT' in rec_context else 0

        # Extract behavior metrics (PRIORITIZE Payload first, then DB)
        night_txns = int(data.get("sender_night_transactions") or (behaviour.night_transactions if behaviour else 0))
        fraud_txns = int(data.get("sender_fraud_transactions") or (behaviour.fraud_transactions if behaviour else 0))
        freq_count = int(data.get("sender_frequent_receiver_count") or (behaviour.frequent_receiver_count if behaviour else 0))
        
        avg_amount = float(data.get("sender_average_transaction_amount", 0))
        if avg_amount <= 0:
            avg_amount = float(behaviour.average_transaction_amount if (behaviour and behaviour.average_transaction_amount > 0) else 0)
        if avg_amount <= 0:
            if sender_is_student:
                avg_amount = 800.0
            elif sender_is_business:
                avg_amount = 30000.0
            elif sender_is_professional:
                avg_amount = 6500.0
            else:
                avg_amount = 2500.0

        max_amount = float(data.get("sender_maximum_transaction_amount", 0))
        if max_amount <= 0:
            max_amount = float(behaviour.maximum_transaction_amount if (behaviour and behaviour.maximum_transaction_amount > 0) else (avg_amount * 5.0))

        # Device & Counterparty flags directly from payload or context
        is_new_device = 1 if (data.get("is_new_device") is True or str(data.get("is_new_device", "")).lower() in ["1", "true", "yes"]) else 0
        is_new_receiver = 1 if (data.get("is_new_receiver") is True or str(data.get("is_new_receiver", "")).lower() in ["1", "true", "yes"]) else 0
        tx_10m = int(data.get("transactions_last_10min", data.get("velocity", 0)))
        fan_in = int(data.get("fan_in_score", data.get("network_risk", 0) // 25))

        # Calculate context risk benefit adjustment
        context_benefit = 0
        if is_family:
            context_benefit -= 20
        elif is_work:
            context_benefit -= 10
        elif is_unknown:
            context_benefit += 15

        amount_vs_sender_avg = amount / (avg_amount + 1) if avg_amount > 0 else amount

        # ---------- Build complete features dictionary ----------
        features = {
            "amount": amount,
            "payment_mode": "UPI",
            "location": "INDIA",
            "sender_account_type": sender_account.account_type,
            "receiver_account_type": receiver_account.account_type,
            "sender_account_status": getattr(sender_account, 'account_status', 'ACTIVE') or 'ACTIVE',
            "receiver_account_status": getattr(receiver_account, 'account_status', 'ACTIVE') or 'ACTIVE',
            "sender_bank_name": sender_account.bank_name,
            "receiver_bank_name": receiver_account.bank_name,
            "sender_current_balance": sender_account.current_balance,
            "receiver_current_balance": receiver_account.current_balance,
            "sender_trust_score": sender_account.trust_score,
            "receiver_trust_score": receiver_account.trust_score,
            "sender_total_transactions": behaviour.total_transactions if behaviour else 0,
            "sender_total_sent_transactions": behaviour.total_sent_transactions if behaviour else 0,
            "sender_total_received_transactions": behaviour.total_received_transactions if behaviour else 0,
            "sender_total_amount_sent": behaviour.total_amount_sent if behaviour else 0,
            "sender_total_amount_received": behaviour.total_amount_received if behaviour else 0,
            "sender_average_transaction_amount": avg_amount,
            "sender_avg_amount": avg_amount,
            "sender_average_daily_amount": behaviour.average_daily_amount if behaviour else 0,
            "sender_maximum_transaction_amount": max_amount,
            "sender_max_amount": max_amount,
            "sender_minimum_transaction_amount": behaviour.minimum_transaction_amount if behaviour else 0,
            "sender_night_transactions": night_txns,
            "sender_frequent_receiver": freq_count,
            "sender_frequent_receiver_count": freq_count,
            "sender_fraud_transactions": fraud_txns,

            # Key ML model features
            "is_new_device": is_new_device,
            "is_new_receiver": is_new_receiver,
            "transactions_last_10min": tx_10m,
            "transactions_last_5min": int(data.get("transactions_last_5min", tx_10m)),
            "transactions_last_1hour": int(data.get("transactions_last_1hour", tx_10m)),
            "transaction_hour": hour,
            "transaction_time": transaction_time.isoformat(),
            "is_night": is_night_transaction,
            "is_night_transaction": is_night_transaction,
            "fan_in_score": fan_in,
            "fan_out_score": int(data.get("fan_out_score", 0)),
            "circular_transaction_flag": int(data.get("circular_transaction_flag", 0)),

            # Context features
            "is_family_transaction": is_family,
            "is_work_transaction": is_work,
            "is_business_transaction": is_business,
            "is_unknown_relationship": is_unknown,
            "sender_is_student": sender_is_student,
            "sender_is_professional": sender_is_professional,
            "sender_is_business": sender_is_business,
            "receiver_is_educational": receiver_is_educational,
            "receiver_is_government": receiver_is_government,
            "is_high_risk_purpose": is_high_risk_purpose,
            "amount_vs_sender_avg": amount_vs_sender_avg,
            "context_risk_benefit": context_benefit,
        }

        # ---------- Get ML prediction ----------
        prediction = predictor.predict(features)
        risk_score = prediction["risk_score"]
        risk_level = prediction["risk_level"]
        reasons = prediction.get("reasons", [])

        txn_id = "TXN" + uuid.uuid4().hex[:8].upper()

        # Save risk analysis log
        risk_log = RiskAnalysisLog(
            transaction_id=txn_id,
            sender_account=sender,
            receiver_account=receiver,
            amount=amount,
            features=json.dumps(features),
            risk_score=risk_score,
            risk_level=risk_level,
            fraud_probability=prediction.get("fraud_probability", 0),
            recommendation=prediction.get("recommendation", "ALLOW"),
            authentication=prediction.get("authentication", "NONE"),
            reasons=json.dumps(reasons),
            transaction_time=transaction_time
        )
        db.session.add(risk_log)
        db.session.commit()

        return jsonify({
            "success": True,
            "receiver_name": receiver_account.account_name,
            "transaction_id": txn_id,
            "risk_score": round(risk_score, 2),
            "risk_level": risk_level,
            "fraud_probability": prediction.get("fraud_probability", 0),
            "recommendation": prediction.get("recommendation", "ALLOW"),
            "authentication": prediction.get("authentication", "NONE"),
            "reasons": reasons,
            "is_night_transaction": is_night_transaction,
            "transaction_time": transaction_time.isoformat()
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ==========================================================
# Risk Log
# ==========================================================

@payment_bp.route("/api/risk-log/<transaction_id>", methods=["GET"])
def get_risk_log(transaction_id):
    try:
        log = RiskAnalysisLog.query.filter_by(transaction_id=transaction_id).first()
        if log is None:
            return jsonify({"success": False, "message": "Transaction not found"}), 404

        features = json.loads(log.features) if log.features else {}
        reasons = json.loads(log.reasons) if log.reasons else []

        return jsonify({
            "success": True,
            "transaction_id": log.transaction_id,
            "sender_account": log.sender_account,
            "receiver_account": log.receiver_account,
            "amount": log.amount,
            "features": features,
            "risk_score": log.risk_score,
            "risk_level": log.risk_level,
            "fraud_probability": log.fraud_probability,
            "recommendation": log.recommendation,
            "authentication": log.authentication,
            "reasons": reasons,
            "transaction_time": log.transaction_time.isoformat() if log.transaction_time else None,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ==========================================================
# Accounts API
# ==========================================================

@payment_bp.route("/api/accounts", methods=["GET"])
def get_accounts():
    try:
        accounts = Account.query.order_by(Account.account_id).all()
        response = []
        for account in accounts:
            raw_rel = str(getattr(account, 'relationship_type', '') or getattr(account, 'account_type', '') or 'UNKNOWN').strip().upper()
            raw_acc_type = str(getattr(account, 'account_type', 'SAVINGS') or 'SAVINGS').strip().upper()

            response.append({
                "account_id": account.account_id,
                "account_name": account.account_name,
                "upi_id": account.upi_id,
                "bank_name": account.bank_name,
                "trust_score": account.trust_score if account.trust_score is not None else 100,
                "current_balance": account.current_balance if account.current_balance is not None else 0.0,
                "account_type": raw_acc_type,
                "relationship_type": raw_rel,
                "category": raw_rel,
                "occupation": raw_rel,
                "status": account.account_status if account.account_status else "ACTIVE"
            })
        return jsonify(response)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ==========================================================
# Recent Transactions
# ==========================================================

@payment_bp.route("/api/transactions", methods=["GET"])
def get_transactions():
    try:
        transactions = Transaction.query.order_by(Transaction.transaction_time.desc()).limit(50).all()
        results = []
        for txn in transactions:
            formatted_time = txn.transaction_time.isoformat() if isinstance(txn.transaction_time, datetime) else str(txn.transaction_time or "")
            txn_id = str(txn.transaction_id) if txn.transaction_id else "N/A"
            amt = float(txn.amount) if txn.amount is not None else 0.0
            
            results.append({
                "transaction_id": txn_id,
                "id": txn_id,
                "txn_id": txn_id,
                "sender_account": txn.sender_account if txn.sender_account else "Unknown",
                "sender_id": txn.sender_account if txn.sender_account else "Unknown",
                "receiver_account": txn.receiver_account if txn.receiver_account else "Unknown",
                "receiver_id": txn.receiver_account if txn.receiver_account else "Unknown",
                "amount": amt,
                "transaction_amount": amt,
                "remarks": txn.remarks if txn.remarks else "UPI Transfer",
                "transaction_time": formatted_time,
                "timestamp": formatted_time,
                "transaction_status": txn.transaction_status if txn.transaction_status else "SUCCESS",
                "status": txn.transaction_status if txn.transaction_status else "SUCCESS",
                "risk_level": txn.risk_level if txn.risk_level else "LOW",
                "fraud_probability": round(float(txn.fraud_probability or 0.0) * 100, 2),
                "payment_mode": txn.payment_mode if txn.payment_mode else "UPI",
                "ml_prediction": txn.ml_prediction if txn.ml_prediction is not None else 0,
                "is_fraud": getattr(txn, 'is_fraud', 0) or 0
            })
        return jsonify({"success": True, "count": len(results), "transactions": results})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


# ==========================================================
# Transaction Details
# ==========================================================

@payment_bp.route("/api/transaction/<transaction_id>", methods=["GET"])
def transaction_details(transaction_id):
    txn = Transaction.query.filter_by(transaction_id=transaction_id).first()
    if txn is None:
        return jsonify({"success": False, "message": "Transaction not found."}), 404
    
    formatted_time = txn.transaction_time.isoformat() if isinstance(txn.transaction_time, datetime) else str(txn.transaction_time or "")
    return jsonify({
        "success": True,
        "transaction": {
            "transaction_id": txn.transaction_id,
            "sender_account": txn.sender_account,
            "receiver_account": txn.receiver_account,
            "amount": float(txn.amount or 0.0),
            "remarks": txn.remarks,
            "transaction_time": formatted_time,
            "transaction_status": txn.transaction_status,
            "payment_mode": txn.payment_mode,
            "fraud_probability": float(txn.fraud_probability or 0.0),
            "risk_level": txn.risk_level,
            "ml_prediction": txn.ml_prediction,
            "is_fraud": getattr(txn, 'is_fraud', 0) or 0
        }
    })


# ==========================================================
# Payment API
# ==========================================================

@payment_bp.route("/api/payment", methods=["POST"])
def make_payment():
    try:
        data = request.get_json()
        if data is None:
            return jsonify({"success": False, "message": "Invalid JSON payload."}), 400

        sender_account = data.get("sender_account") or data.get("sender_id")
        receiver_account = data.get("receiver_account") or data.get("receiver_id")
        amount = float(data.get("amount", 0))
        remark = data.get("remark", "")
        relationship_type = data.get("relationship_type", "UNKNOWN")
        transaction_purpose = data.get("transaction_purpose", "OTHER")
        transaction_time_str = data.get("transaction_time")

        if not sender_account or not receiver_account:
            return jsonify({"success": False, "message": "Sender and receiver required."}), 400
        if amount <= 0:
            return jsonify({"success": False, "message": "Amount must be greater than zero."}), 400

        if transaction_time_str:
            try:
                transaction_time = datetime.fromisoformat(transaction_time_str)
            except Exception:
                transaction_time = datetime.utcnow()
        else:
            transaction_time = datetime.utcnow()

        service = transfer_service()
        result = service.process_transfer(
            sender_account_id=sender_account,
            receiver_account_id=receiver_account,
            amount=amount,
            remark=remark,
            relationship_type=relationship_type,
            transaction_purpose=transaction_purpose,
            transaction_time=transaction_time
        )
        return jsonify(result)

    except ValueError:
        return jsonify({"success": False, "message": "Invalid amount."}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ==========================================================
# Health Check
# ==========================================================

@payment_bp.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "success": True,
        "service": "AI Powered UPI Fraud Detection",
        "status": "RUNNING"
    })


# ==========================================================
# Statistics
# ==========================================================

@payment_bp.route("/api/statistics", methods=["GET"])
def statistics():
    try:
        total_transactions = Transaction.query.count()
        successful = Transaction.query.filter_by(transaction_status="SUCCESS").count()
        pending = Transaction.query.filter(Transaction.transaction_status.like("%PENDING%")).count()
        blocked = Transaction.query.filter_by(transaction_status="BLOCKED").count()
        fraud_transactions = Transaction.query.filter_by(is_fraud=1).count()
        total_amount = db.session.query(db.func.sum(Transaction.amount)).scalar() or 0

        return jsonify({
            "success": True,
            "statistics": {
                "total_transactions": total_transactions,
                "successful_transactions": successful,
                "pending_transactions": pending,
                "blocked_transactions": blocked,
                "fraud_transactions": fraud_transactions,
                "total_amount_processed": round(total_amount, 2)
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ==========================================================
# AI Service Test
# ==========================================================

@payment_bp.route("/api/test-transfer", methods=["POST"])
def test_transfer():
    try:
        data = request.get_json()
        service = transfer_service()
        result = service.process_transfer(
            sender_account_id=data.get("sender_account"),
            receiver_account_id=data.get("receiver_account"),
            amount=float(data.get("amount")),
            remark=data.get("remark", "")
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ==========================================================
# API Information
# ==========================================================

@payment_bp.route("/api", methods=["GET"])
def api_information():
    return jsonify({
        "success": True,
        "project": "AI Powered UPI Fraud Detection System",
        "version": "2.0",
        "available_endpoints": [
            "/api/dashboard",
            "/api/statistics",
            "/api/balance/<account_id>",
            "/api/receiver/<upi_id>",
            "/api/transactions",
            "/api/transaction/<transaction_id>",
            "/api/check-risk",
            "/api/payment",
            "/api/test-transfer",
            "/api/health"
        ]
    })
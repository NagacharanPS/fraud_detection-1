from flask import Blueprint, jsonify

from services.fraud_engine import FraudEngine

from database.database import get_session
from database.models import (
    Transaction,
    Alert,
    GraphPattern
)

fraud_bp = Blueprint(
    "fraud",
    __name__
)

engine = FraudEngine()
session = get_session()


@fraud_bp.route(
    "/api/risk/<transaction_id>",
    methods=["GET"]
)
def get_risk(transaction_id):

    result = engine.analyze_transaction(
        transaction_id
    )

    return jsonify(result)


@fraud_bp.route(
    "/api/sample-risk",
    methods=["GET"]
)
def sample_risk():

    txn = (
        session.query(Transaction)
        .first()
    )

    if not txn:
        return jsonify({
            "error": "No transactions found"
        })

    result = engine.analyze_transaction(
        txn.transaction_id
    )

    return jsonify(result)


@fraud_bp.route(
    "/api/transactions",
    methods=["GET"]
)
def get_transactions():

    transactions = (
        session.query(Transaction)
        .limit(100)
        .all()
    )

    data = []

    for txn in transactions:

        data.append({

            "transaction_id":
            txn.transaction_id,

            "sender_account":
            txn.sender_account,

            "receiver_account":
            txn.receiver_account,

            "amount":
            float(txn.amount),

            "transaction_time":
            txn.transaction_time,

            "risk_level":
            txn.risk_level
        })

    return jsonify(data)


@fraud_bp.route(
    "/api/alerts",
    methods=["GET"]
)
def get_alerts():

    alerts = (
        session.query(Alert)
        .all()
    )

    data = []

    for alert in alerts:

        data.append({

            "alert_id":
            alert.alert_id,

            "transaction_id":
            alert.transaction_id,

            "sender":
            alert.sender_account,

            "receiver":
            alert.receiver_account,

            "amount":
            float(alert.transaction_amount),

            "risk_score":
            float(alert.final_risk_score),

            "risk_level":
            alert.risk_level,

            "recommended_action":
            alert.recommended_action
        })

    return jsonify(data)


@fraud_bp.route(
    "/api/network",
    methods=["GET"]
)
def get_network():

    patterns = (
        session.query(GraphPattern)
        .limit(100)
        .all()
    )

    nodes = set()

    edges = []

    for pattern in patterns:

        nodes.add(pattern.sender_account)
        nodes.add(pattern.receiver_account)

        edges.append({

            "source":
            pattern.sender_account,

            "target":
            pattern.receiver_account,

            "pattern":
            pattern.pattern_type,

            "risk":
            pattern.risk_level
        })

    node_list = []

    for node in nodes:

        node_list.append({

            "id":
            node
        })

    return jsonify({

        "nodes":
        node_list,

        "edges":
        edges
    })


@fraud_bp.route(
    "/api/search-risk/<transaction_id>",
    methods=["GET"]
)
def search_risk(transaction_id):

    result = engine.analyze_transaction(
        transaction_id
    )

    return jsonify(result)


@fraud_bp.route(
    "/api/statistics",
    methods=["GET"]
)
def get_statistics():

    transactions = (
        session.query(Transaction)
        .all()
    )

    total_transactions = len(transactions)

    high_value_transactions = len(

        [

            txn

            for txn in transactions

            if txn.amount > 50000
        ]
    )

    amounts = [

        txn.amount

        for txn in transactions
    ]

    average_amount = round(

        sum(amounts) / len(amounts),

        2
    )

    max_amount = max(amounts)

    return jsonify({

        "total_transactions":
        total_transactions,

        "high_value_transactions":
        high_value_transactions,

        "average_amount":
        average_amount,

        "max_amount":
        float(max_amount)
    })
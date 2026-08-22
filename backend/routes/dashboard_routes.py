from flask import Blueprint, jsonify
import sqlite3
from database.database import DATABASE_PATH

dashboard_bp = Blueprint(
    "dashboard",
    __name__
)


@dashboard_bp.route("/api/dashboard", methods=["GET"])
def dashboard():

    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row

    cur = conn.cursor()

    # Total Accounts
    cur.execute("SELECT COUNT(*) FROM accounts")
    total_accounts = cur.fetchone()[0]

    # Total Transactions
    cur.execute("SELECT COUNT(*) FROM transactions")
    total_transactions = cur.fetchone()[0]

    # Unique Senders
    cur.execute("""
        SELECT COUNT(DISTINCT sender_account)
        FROM transactions
    """)
    total_senders = cur.fetchone()[0]

    # Unique Receivers
    cur.execute("""
        SELECT COUNT(DISTINCT receiver_account)
        FROM transactions
    """)
    total_receivers = cur.fetchone()[0]

    conn.close()

    return jsonify({
        "total_accounts": total_accounts,
        "total_transactions": total_transactions,
        "total_senders": total_senders,
        "total_receivers": total_receivers
    })
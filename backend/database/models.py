from datetime import datetime
from database.database import db


class Account(db.Model):
    __tablename__ = "accounts"

    account_id = db.Column(db.String(50), primary_key=True)
    account_name = db.Column(db.String(100), nullable=False)
    upi_id = db.Column(db.String(100), unique=True, nullable=False)
    bank_name = db.Column(db.String(100), nullable=False)
    account_type = db.Column(db.String(50), nullable=False, default="SAVINGS")
    account_status = db.Column(db.String(20), nullable=False, default="ACTIVE")
    current_balance = db.Column(db.Float, nullable=False, default=0.0)
    trust_score = db.Column(db.Float, nullable=False, default=100.0)
    relationship_type = db.Column(db.String(50), nullable=True, default="UNKNOWN")
    mobile_number = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    behavior = db.relationship("AccountBehavior", backref="account", uselist=False)


class Transaction(db.Model):
    __tablename__ = "transactions"

    transaction_id = db.Column(db.String(100), primary_key=True)
    sender_account = db.Column(db.String(50), db.ForeignKey("accounts.account_id"), nullable=False)
    receiver_account = db.Column(db.String(50), db.ForeignKey("accounts.account_id"), nullable=False)
    amount = db.Column(db.Float, nullable=False, default=0.0)
    remarks = db.Column(db.String(255), nullable=True, default="")
    transaction_time = db.Column(db.DateTime, default=datetime.utcnow)
    transaction_status = db.Column(db.String(20), default="SUCCESS")
    payment_mode = db.Column(db.String(20), default="UPI")
    fraud_probability = db.Column(db.Float, nullable=True, default=0.0)
    risk_level = db.Column(db.String(20), nullable=True, default="LOW")
    ml_prediction = db.Column(db.Integer, nullable=True, default=0)
    is_fraud = db.Column(db.Integer, nullable=True, default=0)


class AccountBehavior(db.Model):
    __tablename__ = "account_behavior"

    account_id = db.Column(db.String(50), db.ForeignKey("accounts.account_id"), primary_key=True)
    total_transactions = db.Column(db.Integer, default=0)
    total_sent_transactions = db.Column(db.Integer, default=0)
    total_received_transactions = db.Column(db.Integer, default=0)
    total_amount_sent = db.Column(db.Float, default=0.0)
    total_amount_received = db.Column(db.Float, default=0.0)
    average_transaction_amount = db.Column(db.Float, default=0.0)
    average_daily_amount = db.Column(db.Float, default=0.0)
    maximum_transaction_amount = db.Column(db.Float, default=0.0)
    minimum_transaction_amount = db.Column(db.Float, default=0.0)
    night_transactions = db.Column(db.Integer, default=0)
    frequent_receiver_count = db.Column(db.Integer, default=0)
    fraud_transactions = db.Column(db.Integer, default=0)
    first_transaction_time = db.Column(db.DateTime, default=datetime.utcnow)
    last_transaction_time = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class GraphPattern(db.Model):
    __tablename__ = "graph_patterns"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    transaction_id = db.Column(db.String(100), db.ForeignKey("transactions.transaction_id"), nullable=True)
    sender_account = db.Column(db.String(50), nullable=False)
    receiver_account = db.Column(db.String(50), nullable=False)
    relationship_type = db.Column(db.String(50), default="UNKNOWN")
    is_frequent_pair = db.Column(db.Integer, default=0)
    receiver_trust_score = db.Column(db.Float, default=50.0)
    sender_trust_score = db.Column(db.Float, default=50.0)
    receiver_fraud_history = db.Column(db.Integer, default=0)
    is_high_risk_purpose = db.Column(db.Integer, default=0)
    graph_risk_score = db.Column(db.Float, default=0.0)
    pattern_type = db.Column(db.String(50), default="ISOLATED_PAIR")


class RiskAnalysisLog(db.Model):
    __tablename__ = "risk_analysis_logs"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    transaction_id = db.Column(db.String(100), nullable=False)
    sender_account = db.Column(db.String(50), nullable=False)
    receiver_account = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    features = db.Column(db.Text, nullable=True)
    risk_score = db.Column(db.Float, nullable=False)
    risk_level = db.Column(db.String(20), nullable=False)
    fraud_probability = db.Column(db.Float, nullable=False)
    recommendation = db.Column(db.String(20), nullable=False)
    authentication = db.Column(db.String(20), nullable=False)
    reasons = db.Column(db.Text, nullable=True)
    transaction_time = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class UPIDirectory(db.Model):
    __tablename__ = "upi_directory"

    upi_id = db.Column(db.String(100), primary_key=True)
    account_id = db.Column(db.String(50), nullable=False)
    account_name = db.Column(db.String(100), nullable=False)
    bank_name = db.Column(db.String(100), nullable=False)
    account_type = db.Column(db.String(50), default="SAVINGS")
    account_status = db.Column(db.String(20), default="ACTIVE")
    is_verified = db.Column(db.String(10), default="YES")


class User(db.Model):
    __tablename__ = "users"

    user_id = db.Column(db.String(50), primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    salt = db.Column(db.String(64), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    phone_number = db.Column(db.String(20), nullable=False, index=True)
    account_id = db.Column(db.String(50), db.ForeignKey("accounts.account_id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    face_biometric = db.relationship("UserFaceBiometric", backref="user", uselist=False, cascade="all, delete-orphan")


class UserFaceBiometric(db.Model):
    __tablename__ = "user_face_biometrics"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String(50), db.ForeignKey("users.user_id"), nullable=False, unique=True, index=True)
    face_embedding = db.Column(db.Text, nullable=False)  # JSON-encoded 128-d unit vector
    template_hash = db.Column(db.String(64), nullable=False)
    algorithm_version = db.Column(db.String(50), default="v2.1-liveness-enclave")
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)


class OTPSession(db.Model):
    __tablename__ = "otp_sessions"

    session_id = db.Column(db.String(100), primary_key=True)
    user_id = db.Column(db.String(50), nullable=False, index=True)
    phone_number = db.Column(db.String(20), nullable=False)
    otp_hash = db.Column(db.String(64), nullable=False)  # SHA-256 hash of the 6-digit OTP (never plaintext)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_verified = db.Column(db.Integer, default=0)
    attempts = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

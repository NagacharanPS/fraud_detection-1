-- ====================================================================
-- UPI PayGuard AI - Relational Database Schema (MySQL Compatible)
-- ====================================================================

CREATE DATABASE IF NOT EXISTS upi_fraud_detection;
USE upi_fraud_detection;

-- 1. Accounts Table (UPI & Banking Core)
CREATE TABLE IF NOT EXISTS accounts (
    account_id VARCHAR(50) PRIMARY KEY,
    account_name VARCHAR(100) NOT NULL,
    upi_id VARCHAR(100) NOT NULL UNIQUE,
    bank_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL DEFAULT 'SAVINGS',
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    trust_score DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
    relationship_type VARCHAR(50) DEFAULT 'PERSONAL',
    mobile_number VARCHAR(20) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Users Table (Authentication & Profile Identity)
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    account_id VARCHAR(50) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_account FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE SET NULL,
    INDEX idx_users_email (email),
    INDEX idx_users_phone (phone_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Face Biometrics Table (Secure 128-D Vector Embeddings / Templates)
-- Note: Raw photos are never permanently stored to preserve user privacy.
CREATE TABLE IF NOT EXISTS user_face_biometrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    face_embedding MEDIUMTEXT NOT NULL COMMENT 'JSON-encoded 128-dimensional normalized unit vector',
    template_hash VARCHAR(64) NOT NULL COMMENT 'Cryptographic SHA-256 fingerprint of the enrolled template',
    algorithm_version VARCHAR(50) DEFAULT 'v2.1-liveness-enclave',
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_biometrics_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_biometrics_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Temporary OTP Sessions Table (Secure Short-lived Hashed Codes)
CREATE TABLE IF NOT EXISTS otp_sessions (
    session_id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(64) NOT NULL COMMENT 'SHA-256 hash of the 6-digit OTP (never plaintext)',
    expires_at DATETIME NOT NULL,
    is_verified TINYINT(1) DEFAULT 0,
    attempts INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_otp_user (user_id),
    INDEX idx_otp_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id VARCHAR(100) PRIMARY KEY,
    sender_account VARCHAR(50) NOT NULL,
    receiver_account VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    remarks VARCHAR(255) DEFAULT '',
    transaction_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    transaction_status VARCHAR(20) DEFAULT 'SUCCESS',
    payment_mode VARCHAR(20) DEFAULT 'UPI',
    fraud_probability DECIMAL(6, 4) DEFAULT 0.0000,
    risk_level VARCHAR(20) DEFAULT 'LOW',
    ml_prediction INT DEFAULT 0,
    is_fraud INT DEFAULT 0,
    CONSTRAINT fk_tx_sender FOREIGN KEY (sender_account) REFERENCES accounts(account_id),
    CONSTRAINT fk_tx_receiver FOREIGN KEY (receiver_account) REFERENCES accounts(account_id),
    INDEX idx_tx_sender (sender_account),
    INDEX idx_tx_receiver (receiver_account),
    INDEX idx_tx_time (transaction_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Account Behavioral Profiling
CREATE TABLE IF NOT EXISTS account_behavior (
    account_id VARCHAR(50) PRIMARY KEY,
    total_transactions INT DEFAULT 0,
    total_sent_transactions INT DEFAULT 0,
    total_received_transactions INT DEFAULT 0,
    total_amount_sent DECIMAL(15, 2) DEFAULT 0.00,
    total_amount_received DECIMAL(15, 2) DEFAULT 0.00,
    average_transaction_amount DECIMAL(15, 2) DEFAULT 0.00,
    average_daily_amount DECIMAL(15, 2) DEFAULT 0.00,
    maximum_transaction_amount DECIMAL(15, 2) DEFAULT 0.00,
    minimum_transaction_amount DECIMAL(15, 2) DEFAULT 0.00,
    night_transactions INT DEFAULT 0,
    frequent_receiver_count INT DEFAULT 0,
    fraud_transactions INT DEFAULT 0,
    first_transaction_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_transaction_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_beh_account FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Risk Analysis Logs Table (Explainable AI audit trails)
CREATE TABLE IF NOT EXISTS risk_analysis_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(100) NOT NULL,
    sender_account VARCHAR(50) NOT NULL,
    receiver_account VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    features TEXT NULL,
    risk_score DECIMAL(5, 2) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    fraud_probability DECIMAL(6, 4) NOT NULL,
    recommendation VARCHAR(20) NOT NULL,
    authentication VARCHAR(20) NOT NULL,
    reasons TEXT NULL,
    transaction_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_risk_tx (transaction_id),
    INDEX idx_risk_sender (sender_account)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. UPI Directory (Directory Lookups)
CREATE TABLE IF NOT EXISTS upi_directory (
    upi_id VARCHAR(100) PRIMARY KEY,
    account_id VARCHAR(50) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) DEFAULT 'SAVINGS',
    account_status VARCHAR(20) DEFAULT 'ACTIVE',
    is_verified VARCHAR(10) DEFAULT 'YES',
    INDEX idx_upi_account (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

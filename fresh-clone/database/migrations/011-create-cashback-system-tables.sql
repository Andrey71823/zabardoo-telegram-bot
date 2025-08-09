-- Migration: Create Cashback System Tables
-- Description: Creates tables for Indian payment methods, cashback accounts, transactions, and withdrawals

-- Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('UPI', 'PAYTM', 'PHONEPE', 'BANK_ACCOUNT', 'WALLET')),
    details JSONB NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_payment_methods_user_id (user_id),
    INDEX idx_payment_methods_type (type),
    INDEX idx_payment_methods_verified (is_verified),
    INDEX idx_payment_methods_active (is_active)
);

-- Cashback Accounts Table
CREATE TABLE IF NOT EXISTS cashback_accounts (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    pending_balance DECIMAL(10,2) DEFAULT 0.00,
    total_earned DECIMAL(10,2) DEFAULT 0.00,
    total_withdrawn DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'INR',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_cashback_accounts_user_id (user_id),
    INDEX idx_cashback_accounts_balance (balance),
    INDEX idx_cashback_accounts_active (is_active)
);

-- Cashback Transactions Table
CREATE TABLE IF NOT EXISTS cashback_transactions (
    id VARCHAR(255) PRIMARY KEY,
    account_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('EARNED', 'WITHDRAWN', 'REFUNDED', 'BONUS', 'REFERRAL')),
    amount DECIMAL(10,2) NOT NULL,
    original_amount DECIMAL(10,2),
    transaction_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES cashback_accounts(id) ON DELETE CASCADE,
    INDEX idx_cashback_transactions_account_id (account_id),
    INDEX idx_cashback_transactions_user_id (user_id),
    INDEX idx_cashback_transactions_type (type),
    INDEX idx_cashback_transactions_status (status),
    INDEX idx_cashback_transactions_created_at (created_at),
    INDEX idx_cashback_transactions_transaction_id (transaction_id)
);

-- Withdrawal Requests Table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id VARCHAR(255) PRIMARY KEY,
    account_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    metadata JSONB,
    
    FOREIGN KEY (account_id) REFERENCES cashback_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
    INDEX idx_withdrawal_requests_account_id (account_id),
    INDEX idx_withdrawal_requests_user_id (user_id),
    INDEX idx_withdrawal_requests_status (status),
    INDEX idx_withdrawal_requests_requested_at (requested_at),
    INDEX idx_withdrawal_requests_payment_method (payment_method_id)
);

-- Cashback Rules Table
CREATE TABLE IF NOT EXISTS cashback_rules (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cashback_rate DECIMAL(5,2) NOT NULL,
    max_cashback_amount DECIMAL(10,2),
    minimum_transaction_amount DECIMAL(10,2) DEFAULT 0.00,
    category_filter JSONB,
    store_filter JSONB,
    user_tier_filter JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_cashback_rules_active (is_active),
    INDEX idx_cashback_rules_valid_from (valid_from),
    INDEX idx_cashback_rules_valid_until (valid_until),
    INDEX idx_cashback_rules_rate (cashback_rate)
);

-- Referral Programs Table
CREATE TABLE IF NOT EXISTS referral_programs (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    referrer_reward DECIMAL(10,2) NOT NULL,
    referee_reward DECIMAL(10,2) DEFAULT 0.00,
    minimum_transaction_amount DECIMAL(10,2) DEFAULT 0.00,
    max_referrals_per_user INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_referral_programs_active (is_active),
    INDEX idx_referral_programs_valid_from (valid_from),
    INDEX idx_referral_programs_valid_until (valid_until)
);

-- User Referrals Table
CREATE TABLE IF NOT EXISTS user_referrals (
    id VARCHAR(255) PRIMARY KEY,
    referrer_id VARCHAR(255) NOT NULL,
    referee_id VARCHAR(255) NOT NULL,
    program_id VARCHAR(255) NOT NULL,
    referral_code VARCHAR(50),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'EXPIRED')),
    reward_given BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    FOREIGN KEY (program_id) REFERENCES referral_programs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_referral (referrer_id, referee_id, program_id),
    INDEX idx_user_referrals_referrer (referrer_id),
    INDEX idx_user_referrals_referee (referee_id),
    INDEX idx_user_referrals_program (program_id),
    INDEX idx_user_referrals_status (status),
    INDEX idx_user_referrals_code (referral_code)
);

-- Payment Validations Table
CREATE TABLE IF NOT EXISTS payment_validations (
    id VARCHAR(255) PRIMARY KEY,
    payment_method_id VARCHAR(255) NOT NULL,
    validation_type VARCHAR(50) NOT NULL,
    validation_data JSONB,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'FAILED')),
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE CASCADE,
    INDEX idx_payment_validations_method (payment_method_id),
    INDEX idx_payment_validations_status (status),
    INDEX idx_payment_validations_type (validation_type)
);

-- Cashback Notifications Table
CREATE TABLE IF NOT EXISTS cashback_notifications (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_cashback_notifications_user_id (user_id),
    INDEX idx_cashback_notifications_type (type),
    INDEX idx_cashback_notifications_read (is_read),
    INDEX idx_cashback_notifications_created_at (created_at)
);

-- Cashback Disputes Table
CREATE TABLE IF NOT EXISTS cashback_disputes (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    transaction_id VARCHAR(255),
    withdrawal_id VARCHAR(255),
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'REJECTED')),
    resolution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    
    INDEX idx_cashback_disputes_user_id (user_id),
    INDEX idx_cashback_disputes_transaction (transaction_id),
    INDEX idx_cashback_disputes_withdrawal (withdrawal_id),
    INDEX idx_cashback_disputes_status (status),
    INDEX idx_cashback_disputes_type (type)
);

-- Tax Information Table
CREATE TABLE IF NOT EXISTS tax_information (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    financial_year VARCHAR(10) NOT NULL,
    total_cashback_earned DECIMAL(10,2) DEFAULT 0.00,
    tax_deducted DECIMAL(10,2) DEFAULT 0.00,
    tds_certificate_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_year (user_id, financial_year),
    INDEX idx_tax_information_user_id (user_id),
    INDEX idx_tax_information_year (financial_year)
);

-- Cashback Promotions Table
CREATE TABLE IF NOT EXISTS cashback_promotions (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    promotion_type VARCHAR(50) NOT NULL,
    bonus_rate DECIMAL(5,2),
    bonus_amount DECIMAL(10,2),
    minimum_transaction DECIMAL(10,2),
    maximum_bonus DECIMAL(10,2),
    target_users JSONB,
    target_categories JSONB,
    target_stores JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_cashback_promotions_active (is_active),
    INDEX idx_cashback_promotions_dates (start_date, end_date),
    INDEX idx_cashback_promotions_type (promotion_type)
);

-- Create triggers for updated_at timestamps
DELIMITER //

CREATE TRIGGER payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER cashback_accounts_updated_at
    BEFORE UPDATE ON cashback_accounts
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER cashback_transactions_updated_at
    BEFORE UPDATE ON cashback_transactions
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER cashback_rules_updated_at
    BEFORE UPDATE ON cashback_rules
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER referral_programs_updated_at
    BEFORE UPDATE ON referral_programs
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER tax_information_updated_at
    BEFORE UPDATE ON tax_information
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER cashback_promotions_updated_at
    BEFORE UPDATE ON cashback_promotions
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

DELIMITER ;

-- Insert default cashback rules
INSERT INTO cashback_rules (id, name, description, cashback_rate, max_cashback_amount, minimum_transaction_amount, is_active) VALUES
('rule_default', 'Default Cashback', 'Standard cashback rate for all transactions', 2.00, 500.00, 100.00, TRUE),
('rule_electronics', 'Electronics Cashback', 'Higher cashback for electronics purchases', 3.50, 1000.00, 500.00, TRUE),
('rule_fashion', 'Fashion Cashback', 'Special rate for fashion and lifestyle', 4.00, 750.00, 200.00, TRUE),
('rule_grocery', 'Grocery Cashback', 'Cashback for grocery and essentials', 1.50, 200.00, 50.00, TRUE);

-- Insert default referral program
INSERT INTO referral_programs (id, name, description, referrer_reward, referee_reward, minimum_transaction_amount, is_active) VALUES
('ref_default', 'Friend Referral Program', 'Earn rewards for referring friends', 100.00, 50.00, 500.00, TRUE);

-- Create materialized views for analytics
CREATE VIEW cashback_analytics_daily AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN type = 'EARNED' THEN amount ELSE 0 END) as total_earned,
    SUM(CASE WHEN type = 'WITHDRAWN' THEN ABS(amount) ELSE 0 END) as total_withdrawn,
    COUNT(DISTINCT user_id) as active_users
FROM cashback_transactions 
WHERE status = 'COMPLETED'
GROUP BY DATE(created_at);

CREATE VIEW user_cashback_summary AS
SELECT 
    ca.user_id,
    ca.balance,
    ca.pending_balance,
    ca.total_earned,
    ca.total_withdrawn,
    COUNT(ct.id) as total_transactions,
    MAX(ct.created_at) as last_transaction_at
FROM cashback_accounts ca
LEFT JOIN cashback_transactions ct ON ca.id = ct.account_id
GROUP BY ca.user_id, ca.balance, ca.pending_balance, ca.total_earned, ca.total_withdrawn;

-- Add comments for documentation
ALTER TABLE payment_methods COMMENT = 'Stores user payment methods for cashback withdrawals';
ALTER TABLE cashback_accounts COMMENT = 'User cashback account balances and totals';
ALTER TABLE cashback_transactions COMMENT = 'All cashback earning and withdrawal transactions';
ALTER TABLE withdrawal_requests COMMENT = 'User withdrawal requests and their processing status';
ALTER TABLE cashback_rules COMMENT = 'Rules for calculating cashback rates and limits';
ALTER TABLE referral_programs COMMENT = 'Referral program configurations and rewards';
ALTER TABLE user_referrals COMMENT = 'User referral relationships and status';
ALTER TABLE payment_validations COMMENT = 'Payment method verification attempts and results';
ALTER TABLE cashback_notifications COMMENT = 'Cashback-related notifications to users';
ALTER TABLE cashback_disputes COMMENT = 'User disputes regarding cashback transactions';
ALTER TABLE tax_information COMMENT = 'Annual tax information for cashback earnings';
ALTER TABLE cashback_promotions COMMENT = 'Special cashback promotions and bonus campaigns';
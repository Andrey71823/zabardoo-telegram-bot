-- Data Compliance Tables for Indian Data Protection Compliance

-- User Consents Table (PDPB Compliance)
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN (
        'data_collection', 'marketing', 'analytics', 'cookies', 'third_party_sharing'
    )),
    granted BOOLEAN NOT NULL DEFAULT false,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    version VARCHAR(10) NOT NULL DEFAULT '1.0',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user_consents
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_type ON user_consents(consent_type);
CREATE INDEX idx_user_consents_granted ON user_consents(granted, revoked_at);
CREATE INDEX idx_user_consents_granted_at ON user_consents(granted_at);

-- Data Processing Records Table (Purpose Limitation & Storage Minimization)
CREATE TABLE IF NOT EXISTS data_processing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_type VARCHAR(50) NOT NULL CHECK (data_type IN (
        'personal', 'sensitive', 'financial', 'behavioral', 'location'
    )),
    processing_purpose TEXT NOT NULL,
    legal_basis VARCHAR(50) NOT NULL CHECK (legal_basis IN (
        'consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'
    )),
    data_source VARCHAR(100) NOT NULL,
    processing_date TIMESTAMP WITH TIME ZONE NOT NULL,
    retention_period INTEGER NOT NULL, -- days
    deletion_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for data_processing_records
CREATE INDEX idx_data_processing_user_id ON data_processing_records(user_id);
CREATE INDEX idx_data_processing_type ON data_processing_records(data_type);
CREATE INDEX idx_data_processing_deletion_date ON data_processing_records(deletion_date);
CREATE INDEX idx_data_processing_legal_basis ON data_processing_records(legal_basis);

-- Data Deletion Requests Table (Right to be Forgotten)
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN (
        'full_deletion', 'partial_deletion', 'anonymization'
    )),
    requested_data JSONB NOT NULL, -- array of data types
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'rejected'
    )),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    verification_token VARCHAR(64) NOT NULL UNIQUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for data_deletion_requests
CREATE INDEX idx_data_deletion_user_id ON data_deletion_requests(user_id);
CREATE INDEX idx_data_deletion_status ON data_deletion_requests(status);
CREATE INDEX idx_data_deletion_requested_at ON data_deletion_requests(requested_at);
CREATE INDEX idx_data_deletion_verification_token ON data_deletion_requests(verification_token);

-- Compliance Audit Logs Table
CREATE TABLE IF NOT EXISTS compliance_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    legal_basis VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failure', 'warning')),
    details JSONB NOT NULL DEFAULT '{}',
    compliance_officer VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for compliance_audit_logs
CREATE INDEX idx_compliance_audit_user_id ON compliance_audit_logs(user_id);
CREATE INDEX idx_compliance_audit_action ON compliance_audit_logs(action);
CREATE INDEX idx_compliance_audit_timestamp ON compliance_audit_logs(timestamp);
CREATE INDEX idx_compliance_audit_result ON compliance_audit_logs(result);
CREATE INDEX idx_compliance_audit_data_type ON compliance_audit_logs(data_type);

-- Grievance Records Table (IT Rules 2021 Compliance)
CREATE TABLE IF NOT EXISTS grievance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    grievance_type VARCHAR(50) NOT NULL CHECK (grievance_type IN (
        'data_protection', 'content_moderation', 'account_suspension', 'privacy_violation', 'other'
    )),
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN (
        'open', 'in_progress', 'resolved', 'closed'
    )),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN (
        'low', 'medium', 'high', 'critical'
    )),
    assigned_officer VARCHAR(100),
    resolution TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for grievance_records
CREATE INDEX idx_grievance_user_id ON grievance_records(user_id);
CREATE INDEX idx_grievance_status ON grievance_records(status);
CREATE INDEX idx_grievance_type ON grievance_records(grievance_type);
CREATE INDEX idx_grievance_submitted_at ON grievance_records(submitted_at);
CREATE INDEX idx_grievance_priority ON grievance_records(priority);

-- Data Localization Compliance Table (RBI Guidelines)
CREATE TABLE IF NOT EXISTS data_localization_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_type VARCHAR(50) NOT NULL,
    data_category VARCHAR(50) NOT NULL CHECK (data_category IN (
        'payment_data', 'personal_data', 'sensitive_data', 'financial_data'
    )),
    storage_location VARCHAR(100) NOT NULL,
    is_localized BOOLEAN NOT NULL DEFAULT true,
    compliance_status VARCHAR(20) NOT NULL DEFAULT 'compliant' CHECK (compliance_status IN (
        'compliant', 'non_compliant', 'pending_review'
    )),
    last_audit_date TIMESTAMP WITH TIME ZONE,
    next_audit_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for data_localization_records
CREATE INDEX idx_data_localization_category ON data_localization_records(data_category);
CREATE INDEX idx_data_localization_compliance ON data_localization_records(compliance_status);
CREATE INDEX idx_data_localization_audit_date ON data_localization_records(next_audit_date);

-- Consent Withdrawal Impact Table
CREATE TABLE IF NOT EXISTS consent_withdrawal_impacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL,
    withdrawal_date TIMESTAMP WITH TIME ZONE NOT NULL,
    impacted_services JSONB NOT NULL, -- array of affected services
    data_retention_period INTEGER, -- days before deletion
    deletion_scheduled_date TIMESTAMP WITH TIME ZONE,
    deletion_completed_date TIMESTAMP WITH TIME ZONE,
    impact_assessment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for consent_withdrawal_impacts
CREATE INDEX idx_consent_withdrawal_user_id ON consent_withdrawal_impacts(user_id);
CREATE INDEX idx_consent_withdrawal_type ON consent_withdrawal_impacts(consent_type);
CREATE INDEX idx_consent_withdrawal_deletion_date ON consent_withdrawal_impacts(deletion_scheduled_date);

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_user_consents_updated_at 
    BEFORE UPDATE ON user_consents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grievance_records_updated_at 
    BEFORE UPDATE ON grievance_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_localization_updated_at 
    BEFORE UPDATE ON data_localization_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for compliance reporting
CREATE OR REPLACE VIEW compliance_summary AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE result = 'success') as successful_actions,
    COUNT(*) FILTER (WHERE result = 'failure') as failed_actions,
    COUNT(DISTINCT user_id) as unique_users,
    ROUND(
        (COUNT(*) FILTER (WHERE result = 'success')::DECIMAL / COUNT(*)) * 100, 2
    ) as success_rate
FROM compliance_audit_logs
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- View for active consents
CREATE OR REPLACE VIEW active_user_consents AS
SELECT DISTINCT ON (user_id, consent_type)
    user_id,
    consent_type,
    granted,
    granted_at,
    revoked_at,
    version
FROM user_consents
WHERE granted = true AND revoked_at IS NULL
ORDER BY user_id, consent_type, created_at DESC;

-- View for pending data deletions
CREATE OR REPLACE VIEW pending_data_deletions AS
SELECT 
    dr.*,
    u.email as user_email,
    EXTRACT(DAYS FROM (NOW() - dr.requested_at)) as days_pending
FROM data_deletion_requests dr
JOIN users u ON dr.user_id = u.id
WHERE dr.status = 'pending'
ORDER BY dr.requested_at ASC;

-- Monthly compliance report materialized view
CREATE MATERIALIZED VIEW monthly_compliance_report AS
SELECT 
    DATE_TRUNC('month', NOW()) as report_month,
    
    -- Consent metrics
    (SELECT COUNT(*) FROM user_consents WHERE granted = true AND revoked_at IS NULL) as active_consents,
    (SELECT COUNT(*) FROM user_consents WHERE created_at >= DATE_TRUNC('month', NOW())) as new_consents_this_month,
    (SELECT COUNT(*) FROM user_consents WHERE revoked_at >= DATE_TRUNC('month', NOW())) as revoked_consents_this_month,
    
    -- Data processing metrics
    (SELECT COUNT(*) FROM data_processing_records WHERE created_at >= DATE_TRUNC('month', NOW())) as data_processing_events,
    (SELECT COUNT(*) FROM data_processing_records WHERE deletion_date <= NOW()) as expired_data_records,
    
    -- Deletion request metrics
    (SELECT COUNT(*) FROM data_deletion_requests WHERE status = 'pending') as pending_deletions,
    (SELECT COUNT(*) FROM data_deletion_requests WHERE completed_at >= DATE_TRUNC('month', NOW())) as completed_deletions_this_month,
    
    -- Grievance metrics
    (SELECT COUNT(*) FROM grievance_records WHERE status = 'open') as open_grievances,
    (SELECT COUNT(*) FROM grievance_records WHERE resolved_at >= DATE_TRUNC('month', NOW())) as resolved_grievances_this_month,
    
    -- Compliance score
    (SELECT 
        ROUND(
            (COUNT(*) FILTER (WHERE result = 'success')::DECIMAL / COUNT(*)) * 100, 2
        )
     FROM compliance_audit_logs 
     WHERE timestamp >= DATE_TRUNC('month', NOW())
    ) as monthly_compliance_score,
    
    NOW() as generated_at;

-- Create unique index for materialized view
CREATE UNIQUE INDEX idx_monthly_compliance_report_month ON monthly_compliance_report(report_month);

-- Function to refresh compliance report
CREATE OR REPLACE FUNCTION refresh_compliance_report()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_compliance_report;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE user_consents IS 'Stores user consent records for PDPB compliance';
COMMENT ON TABLE data_processing_records IS 'Records all data processing activities for audit trail';
COMMENT ON TABLE data_deletion_requests IS 'Manages user requests for data deletion (Right to be Forgotten)';
COMMENT ON TABLE compliance_audit_logs IS 'Comprehensive audit log for all compliance-related actions';
COMMENT ON TABLE grievance_records IS 'Handles user grievances as per IT Rules 2021';
COMMENT ON TABLE data_localization_records IS 'Tracks data localization compliance for RBI guidelines';
COMMENT ON MATERIALIZED VIEW monthly_compliance_report IS 'Monthly compliance metrics and KPIs';
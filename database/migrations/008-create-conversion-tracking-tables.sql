-- Migration: Create conversion tracking tables
-- Description: Tables for advanced conversion tracking, fraud detection, attribution, and analytics

-- Conversion Pixels table
CREATE TABLE IF NOT EXISTS conversion_pixels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id VARCHAR(255) NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    pixel_type VARCHAR(50) NOT NULL CHECK (pixel_type IN ('facebook', 'google', 'custom', 'postback')),
    pixel_id VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    tracking_code TEXT NOT NULL,
    conversion_events JSONB DEFAULT '[]'::jsonb,
    custom_parameters JSONB DEFAULT '{}'::jsonb,
    test_mode BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversion Rules table
CREATE TABLE IF NOT EXISTS conversion_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    store_id VARCHAR(255),
    category VARCHAR(100),
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversion Webhooks table
CREATE TABLE IF NOT EXISTS conversion_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    method VARCHAR(10) DEFAULT 'POST' CHECK (method IN ('GET', 'POST', 'PUT')),
    headers JSONB DEFAULT '{}'::jsonb,
    payload JSONB DEFAULT '{}'::jsonb,
    events JSONB NOT NULL DEFAULT '[]'::jsonb,
    retry_attempts INTEGER DEFAULT 3,
    timeout INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    last_triggered TIMESTAMP WITH TIME ZONE,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversion Fraud table
CREATE TABLE IF NOT EXISTS conversion_fraud (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversion_id UUID NOT NULL REFERENCES conversion_events(id),
    click_id UUID NOT NULL REFERENCES click_events(id),
    user_id VARCHAR(255) NOT NULL,
    fraud_type VARCHAR(50) NOT NULL CHECK (fraud_type IN ('duplicate_conversion', 'invalid_click', 'bot_traffic', 'suspicious_pattern', 'manual_review')),
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    fraud_indicators JSONB DEFAULT '[]'::jsonb,
    detection_method VARCHAR(20) DEFAULT 'automatic' CHECK (detection_method IN ('automatic', 'manual', 'third_party')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed_fraud', 'false_positive', 'under_review')),
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversion Attribution table
CREATE TABLE IF NOT EXISTS conversion_attribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversion_id UUID NOT NULL REFERENCES conversion_events(id),
    user_id VARCHAR(255) NOT NULL,
    attribution_model VARCHAR(50) NOT NULL CHECK (attribution_model IN ('first_click', 'last_click', 'linear', 'time_decay', 'position_based', 'data_driven')),
    touchpoints JSONB NOT NULL DEFAULT '[]'::jsonb,
    attribution_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_weight DECIMAL(5,4) DEFAULT 1.0,
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversion Cohorts table
CREATE TABLE IF NOT EXISTS conversion_cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cohort_type VARCHAR(50) NOT NULL CHECK (cohort_type IN ('acquisition_date', 'first_purchase', 'user_segment', 'traffic_source')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    user_count INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    retention_rates JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversion Segments table
CREATE TABLE IF NOT EXISTS conversion_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    segment_type VARCHAR(50) NOT NULL CHECK (segment_type IN ('demographic', 'behavioral', 'geographic', 'technographic', 'psychographic')),
    criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    user_count INTEGER DEFAULT 0,
    conversion_metrics JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_calculated TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversion Predictions table
CREATE TABLE IF NOT EXISTS conversion_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    prediction_type VARCHAR(50) NOT NULL CHECK (prediction_type IN ('conversion_probability', 'order_value', 'churn_risk', 'lifetime_value')),
    predicted_value DECIMAL(12,4) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    features JSONB DEFAULT '{}'::jsonb,
    model_version VARCHAR(50) NOT NULL,
    prediction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_value DECIMAL(12,4),
    accuracy DECIMAL(3,2),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversion Tests table
CREATE TABLE IF NOT EXISTS conversion_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('a_b_test', 'multivariate', 'split_url')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    traffic_allocation INTEGER DEFAULT 100 CHECK (traffic_allocation >= 0 AND traffic_allocation <= 100),
    variants JSONB NOT NULL DEFAULT '[]'::jsonb,
    conversion_goal VARCHAR(255) NOT NULL,
    significance_level DECIMAL(3,2) DEFAULT 0.05,
    minimum_sample_size INTEGER DEFAULT 1000,
    results JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversion Alerts table
CREATE TABLE IF NOT EXISTS conversion_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('conversion_drop', 'fraud_detected', 'goal_achieved', 'anomaly_detected')),
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
    channels JSONB NOT NULL DEFAULT '[]'::jsonb,
    frequency VARCHAR(20) DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
    is_active BOOLEAN DEFAULT true,
    last_triggered TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversion Reports table
CREATE TABLE IF NOT EXISTS conversion_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('conversion_summary', 'attribution_analysis', 'cohort_analysis', 'funnel_analysis', 'fraud_report')),
    parameters JSONB DEFAULT '{}'::jsonb,
    schedule JSONB,
    last_generated TIMESTAMP WITH TIME ZONE,
    next_scheduled TIMESTAMP WITH TIME ZONE,
    format VARCHAR(10) DEFAULT 'json' CHECK (format IN ('pdf', 'excel', 'csv', 'json')),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversion Funnels table
CREATE TABLE IF NOT EXISTS conversion_funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    conversion_rates JSONB DEFAULT '{}'::jsonb,
    dropoff_points JSONB DEFAULT '{}'::jsonb,
    average_time_to_convert INTEGER DEFAULT 0,
    total_users INTEGER DEFAULT 0,
    completed_users INTEGER DEFAULT 0,
    overall_conversion_rate DECIMAL(5,2) DEFAULT 0,
    date_range JSONB NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversion_pixels_store_id ON conversion_pixels(store_id);
CREATE INDEX IF NOT EXISTS idx_conversion_pixels_active ON conversion_pixels(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_conversion_rules_store_id ON conversion_rules(store_id);
CREATE INDEX IF NOT EXISTS idx_conversion_rules_category ON conversion_rules(category);
CREATE INDEX IF NOT EXISTS idx_conversion_rules_active ON conversion_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_conversion_rules_priority ON conversion_rules(priority);

CREATE INDEX IF NOT EXISTS idx_conversion_webhooks_active ON conversion_webhooks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_conversion_webhooks_events ON conversion_webhooks USING GIN(events);

CREATE INDEX IF NOT EXISTS idx_conversion_fraud_conversion_id ON conversion_fraud(conversion_id);
CREATE INDEX IF NOT EXISTS idx_conversion_fraud_click_id ON conversion_fraud(click_id);
CREATE INDEX IF NOT EXISTS idx_conversion_fraud_user_id ON conversion_fraud(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_fraud_status ON conversion_fraud(status);
CREATE INDEX IF NOT EXISTS idx_conversion_fraud_risk_score ON conversion_fraud(risk_score);

CREATE INDEX IF NOT EXISTS idx_conversion_attribution_conversion_id ON conversion_attribution(conversion_id);
CREATE INDEX IF NOT EXISTS idx_conversion_attribution_user_id ON conversion_attribution(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_attribution_model ON conversion_attribution(attribution_model);

CREATE INDEX IF NOT EXISTS idx_conversion_cohorts_type ON conversion_cohorts(cohort_type);
CREATE INDEX IF NOT EXISTS idx_conversion_cohorts_date_range ON conversion_cohorts(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_conversion_segments_type ON conversion_segments(segment_type);
CREATE INDEX IF NOT EXISTS idx_conversion_segments_active ON conversion_segments(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_conversion_predictions_user_id ON conversion_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_predictions_type ON conversion_predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_conversion_predictions_date ON conversion_predictions(prediction_date);

CREATE INDEX IF NOT EXISTS idx_conversion_tests_status ON conversion_tests(status);
CREATE INDEX IF NOT EXISTS idx_conversion_tests_dates ON conversion_tests(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_conversion_alerts_active ON conversion_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_conversion_alerts_type ON conversion_alerts(alert_type);

CREATE INDEX IF NOT EXISTS idx_conversion_reports_type ON conversion_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_conversion_reports_active ON conversion_reports(is_active) WHERE is_active = true;

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversion_pixels_updated_at BEFORE UPDATE ON conversion_pixels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversion_rules_updated_at BEFORE UPDATE ON conversion_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversion_webhooks_updated_at BEFORE UPDATE ON conversion_webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversion_fraud_updated_at BEFORE UPDATE ON conversion_fraud FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversion_attribution_updated_at BEFORE UPDATE ON conversion_attribution FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversion_cohorts_updated_at BEFORE UPDATE ON conversion_cohorts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversion_segments_updated_at BEFORE UPDATE ON conversion_segments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversion_predictions_updated_at BEFORE UPDATE ON conversion_predictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversion_tests_updated_at BEFORE UPDATE ON conversion_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversion_alerts_updated_at BEFORE UPDATE ON conversion_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversion_reports_updated_at BEFORE UPDATE ON conversion_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversion_funnels_updated_at BEFORE UPDATE ON conversion_funnels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
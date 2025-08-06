-- Migration: Create retention engine tables
-- Description: Tables for user retention, churn risk analysis, and retention campaigns

-- User Churn Risk table
CREATE TABLE IF NOT EXISTS user_churn_risk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    churn_risk_score INTEGER NOT NULL CHECK (churn_risk_score >= 0 AND churn_risk_score <= 100),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    predicted_churn_date TIMESTAMP WITH TIME ZONE,
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    last_activity_date TIMESTAMP WITH TIME ZONE NOT NULL,
    days_since_last_activity INTEGER NOT NULL DEFAULT 0,
    activity_trend VARCHAR(20) NOT NULL CHECK (activity_trend IN ('increasing', 'stable', 'decreasing', 'inactive')),
    engagement_score INTEGER NOT NULL CHECK (engagement_score >= 0 AND engagement_score <= 100),
    lifetime_value DECIMAL(12,2) DEFAULT 0,
    segment_id VARCHAR(255),
    intervention_recommendations JSONB DEFAULT '[]'::jsonb,
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Activity Monitoring table
CREATE TABLE IF NOT EXISTS user_activity_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    monitoring_period JSONB NOT NULL,
    activity_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    behavior_patterns JSONB DEFAULT '[]'::jsonb,
    engagement_trends JSONB DEFAULT '[]'::jsonb,
    anomalies JSONB DEFAULT '[]'::jsonb,
    health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'at_risk', 'churning', 'churned', 'reactivated')),
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Retention Campaigns table
CREATE TABLE IF NOT EXISTS retention_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(20) NOT NULL CHECK (campaign_type IN ('proactive', 'reactive', 'win_back', 'onboarding', 'loyalty')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    target_segment JSONB NOT NULL,
    triggers JSONB DEFAULT '[]'::jsonb,
    actions JSONB DEFAULT '[]'::jsonb,
    schedule JSONB NOT NULL,
    budget JSONB DEFAULT '{}'::jsonb,
    performance JSONB DEFAULT '{}'::jsonb,
    ab_test_config JSONB,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Lifecycle Stages table
CREATE TABLE IF NOT EXISTS user_lifecycle_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    current_stage VARCHAR(20) NOT NULL CHECK (current_stage IN ('new', 'onboarding', 'active', 'engaged', 'at_risk', 'churning', 'churned', 'won_back')),
    previous_stage VARCHAR(20),
    stage_entry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    days_in_stage INTEGER NOT NULL DEFAULT 0,
    stage_history JSONB DEFAULT '[]'::jsonb,
    next_predicted_stage VARCHAR(20),
    stage_transition_probability JSONB DEFAULT '{}'::jsonb,
    stage_metrics JSONB DEFAULT '{}'::jsonb,
    interventions JSONB DEFAULT '[]'::jsonb,
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Retention Cohorts table
CREATE TABLE IF NOT EXISTS retention_cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cohort_definition JSONB NOT NULL,
    cohort_size INTEGER NOT NULL DEFAULT 0,
    creation_date DATE NOT NULL,
    analysis_date DATE NOT NULL,
    retention_rates JSONB DEFAULT '[]'::jsonb,
    churn_rates JSONB DEFAULT '[]'::jsonb,
    revenue_metrics JSONB DEFAULT '{}'::jsonb,
    behavior_insights JSONB DEFAULT '[]'::jsonb,
    comparison_cohorts JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Win-back Campaigns table
CREATE TABLE IF NOT EXISTS winback_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_segment VARCHAR(50) NOT NULL CHECK (target_segment IN ('recently_churned', 'long_term_churned', 'high_value_churned', 'custom')),
    churn_timeframe JSONB NOT NULL,
    winback_strategy JSONB NOT NULL,
    offers JSONB DEFAULT '[]'::jsonb,
    touchpoints JSONB DEFAULT '[]'::jsonb,
    performance JSONB DEFAULT '{}'::jsonb,
    budget DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Retention Alerts table
CREATE TABLE IF NOT EXISTS retention_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN ('churn_spike', 'engagement_drop', 'cohort_underperformance', 'campaign_failure', 'anomaly_detected')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    affected_users INTEGER DEFAULT 0,
    metric VARCHAR(255) NOT NULL,
    current_value DECIMAL(12,4) NOT NULL,
    threshold_value DECIMAL(12,4) NOT NULL,
    deviation DECIMAL(12,4) NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'investigating', 'resolved', 'false_positive')),
    assigned_to VARCHAR(255),
    resolution JSONB,
    related_campaigns JSONB DEFAULT '[]'::jsonb,
    recommended_actions JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Predictive Models table
CREATE TABLE IF NOT EXISTS predictive_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(30) NOT NULL CHECK (model_type IN ('churn_prediction', 'ltv_prediction', 'engagement_prediction', 'conversion_prediction')),
    algorithm VARCHAR(50) NOT NULL CHECK (algorithm IN ('logistic_regression', 'random_forest', 'gradient_boosting', 'neural_network', 'ensemble')),
    version VARCHAR(50) NOT NULL,
    training_data JSONB NOT NULL,
    features JSONB DEFAULT '[]'::jsonb,
    performance JSONB DEFAULT '{}'::jsonb,
    deployment_status VARCHAR(20) DEFAULT 'training' CHECK (deployment_status IN ('training', 'testing', 'deployed', 'deprecated')),
    last_trained_at TIMESTAMP WITH TIME ZONE NOT NULL,
    next_retraining_date TIMESTAMP WITH TIME ZONE NOT NULL,
    prediction_thresholds JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Predictions table
CREATE TABLE IF NOT EXISTS user_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    model_id UUID NOT NULL REFERENCES predictive_models(id),
    prediction_type VARCHAR(30) NOT NULL CHECK (prediction_type IN ('churn_probability', 'ltv_estimate', 'engagement_score', 'conversion_likelihood')),
    prediction_value DECIMAL(12,4) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    prediction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    feature_values JSONB DEFAULT '{}'::jsonb,
    explanation JSONB DEFAULT '{}'::jsonb,
    actual_outcome DECIMAL(12,4),
    prediction_accuracy DECIMAL(3,2),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign Executions table (for tracking individual campaign executions)
CREATE TABLE IF NOT EXISTS campaign_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES retention_campaigns(id),
    user_id VARCHAR(255) NOT NULL,
    execution_date TIMESTAMP WITH TIME ZONE NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_parameters JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'converted', 'failed')),
    response_data JSONB DEFAULT '{}'::jsonb,
    cost DECIMAL(10,4) DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Segments table (for retention segmentation)
CREATE TABLE IF NOT EXISTS retention_user_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_name VARCHAR(255) NOT NULL,
    segment_description TEXT,
    segment_criteria JSONB NOT NULL,
    segment_type VARCHAR(30) NOT NULL CHECK (segment_type IN ('churn_risk', 'lifecycle_stage', 'value_tier', 'behavior_pattern', 'engagement_level')),
    user_count INTEGER DEFAULT 0,
    last_calculated TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    refresh_frequency VARCHAR(20) DEFAULT 'daily' CHECK (refresh_frequency IN ('real_time', 'hourly', 'daily', 'weekly')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Segment Memberships table
CREATE TABLE IF NOT EXISTS user_segment_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    segment_id UUID NOT NULL REFERENCES retention_user_segments(id),
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    segment_score DECIMAL(5,2),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_churn_risk_user_id ON user_churn_risk(user_id);
CREATE INDEX IF NOT EXISTS idx_user_churn_risk_level ON user_churn_risk(risk_level);
CREATE INDEX IF NOT EXISTS idx_user_churn_risk_score ON user_churn_risk(churn_risk_score);
CREATE INDEX IF NOT EXISTS idx_user_churn_risk_calculated ON user_churn_risk(calculated_at);
CREATE INDEX IF NOT EXISTS idx_user_churn_risk_activity ON user_churn_risk(last_activity_date, days_since_last_activity);

CREATE INDEX IF NOT EXISTS idx_user_activity_monitoring_user_id ON user_activity_monitoring(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_monitoring_status ON user_activity_monitoring(status);
CREATE INDEX IF NOT EXISTS idx_user_activity_monitoring_health ON user_activity_monitoring(health_score);
CREATE INDEX IF NOT EXISTS idx_user_activity_monitoring_updated ON user_activity_monitoring(last_updated);

CREATE INDEX IF NOT EXISTS idx_retention_campaigns_status ON retention_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_retention_campaigns_type ON retention_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_retention_campaigns_dates ON retention_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_retention_campaigns_created_by ON retention_campaigns(created_by);

CREATE INDEX IF NOT EXISTS idx_user_lifecycle_stages_user_id ON user_lifecycle_stages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lifecycle_stages_current ON user_lifecycle_stages(current_stage);
CREATE INDEX IF NOT EXISTS idx_user_lifecycle_stages_calculated ON user_lifecycle_stages(calculated_at);

CREATE INDEX IF NOT EXISTS idx_retention_cohorts_creation_date ON retention_cohorts(creation_date);
CREATE INDEX IF NOT EXISTS idx_retention_cohorts_analysis_date ON retention_cohorts(analysis_date);

CREATE INDEX IF NOT EXISTS idx_winback_campaigns_status ON winback_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_winback_campaigns_segment ON winback_campaigns(target_segment);
CREATE INDEX IF NOT EXISTS idx_winback_campaigns_dates ON winback_campaigns(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_retention_alerts_status ON retention_alerts(status);
CREATE INDEX IF NOT EXISTS idx_retention_alerts_severity ON retention_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_retention_alerts_type ON retention_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_retention_alerts_detected ON retention_alerts(detected_at);

CREATE INDEX IF NOT EXISTS idx_predictive_models_type ON predictive_models(model_type);
CREATE INDEX IF NOT EXISTS idx_predictive_models_status ON predictive_models(deployment_status);
CREATE INDEX IF NOT EXISTS idx_predictive_models_trained ON predictive_models(last_trained_at);

CREATE INDEX IF NOT EXISTS idx_user_predictions_user_id ON user_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_predictions_model_id ON user_predictions(model_id);
CREATE INDEX IF NOT EXISTS idx_user_predictions_type ON user_predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_user_predictions_date ON user_predictions(prediction_date);
CREATE INDEX IF NOT EXISTS idx_user_predictions_valid ON user_predictions(valid_until);

CREATE INDEX IF NOT EXISTS idx_campaign_executions_campaign_id ON campaign_executions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_user_id ON campaign_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_date ON campaign_executions(execution_date);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_status ON campaign_executions(status);

CREATE INDEX IF NOT EXISTS idx_retention_user_segments_type ON retention_user_segments(segment_type);
CREATE INDEX IF NOT EXISTS idx_retention_user_segments_active ON retention_user_segments(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_retention_user_segments_calculated ON retention_user_segments(last_calculated);

CREATE INDEX IF NOT EXISTS idx_user_segment_memberships_user_id ON user_segment_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_segment_memberships_segment_id ON user_segment_memberships(segment_id);
CREATE INDEX IF NOT EXISTS idx_user_segment_memberships_active ON user_segment_memberships(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_segment_memberships_joined ON user_segment_memberships(joined_at);

-- Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_user_churn_risk_factors ON user_churn_risk USING GIN(risk_factors);
CREATE INDEX IF NOT EXISTS idx_user_churn_risk_recommendations ON user_churn_risk USING GIN(intervention_recommendations);
CREATE INDEX IF NOT EXISTS idx_user_activity_monitoring_metrics ON user_activity_monitoring USING GIN(activity_metrics);
CREATE INDEX IF NOT EXISTS idx_user_activity_monitoring_patterns ON user_activity_monitoring USING GIN(behavior_patterns);
CREATE INDEX IF NOT EXISTS idx_retention_campaigns_segment ON retention_campaigns USING GIN(target_segment);
CREATE INDEX IF NOT EXISTS idx_retention_campaigns_triggers ON retention_campaigns USING GIN(triggers);
CREATE INDEX IF NOT EXISTS idx_retention_campaigns_actions ON retention_campaigns USING GIN(actions);
CREATE INDEX IF NOT EXISTS idx_user_lifecycle_stages_history ON user_lifecycle_stages USING GIN(stage_history);
CREATE INDEX IF NOT EXISTS idx_retention_cohorts_definition ON retention_cohorts USING GIN(cohort_definition);
CREATE INDEX IF NOT EXISTS idx_predictive_models_features ON predictive_models USING GIN(features);
CREATE INDEX IF NOT EXISTS idx_user_predictions_features ON user_predictions USING GIN(feature_values);
CREATE INDEX IF NOT EXISTS idx_retention_user_segments_criteria ON retention_user_segments USING GIN(segment_criteria);

-- Add foreign key constraints
ALTER TABLE user_churn_risk ADD CONSTRAINT fk_user_churn_risk_user 
    FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

ALTER TABLE user_activity_monitoring ADD CONSTRAINT fk_user_activity_monitoring_user 
    FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

ALTER TABLE user_lifecycle_stages ADD CONSTRAINT fk_user_lifecycle_stages_user 
    FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

ALTER TABLE campaign_executions ADD CONSTRAINT fk_campaign_executions_user 
    FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

ALTER TABLE user_segment_memberships ADD CONSTRAINT fk_user_segment_memberships_user 
    FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

ALTER TABLE user_predictions ADD CONSTRAINT fk_user_predictions_user 
    FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_user_churn_risk_updated_at BEFORE UPDATE ON user_churn_risk FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_retention_campaigns_updated_at BEFORE UPDATE ON retention_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_winback_campaigns_updated_at BEFORE UPDATE ON winback_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_retention_alerts_updated_at BEFORE UPDATE ON retention_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_predictive_models_updated_at BEFORE UPDATE ON predictive_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaign_executions_updated_at BEFORE UPDATE ON campaign_executions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_retention_user_segments_updated_at BEFORE UPDATE ON retention_user_segments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create materialized views for retention analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS retention_summary AS
SELECT 
    DATE_TRUNC('day', calculated_at) as date,
    risk_level,
    COUNT(*) as user_count,
    AVG(churn_risk_score) as avg_risk_score,
    AVG(engagement_score) as avg_engagement_score,
    AVG(lifetime_value) as avg_lifetime_value,
    COUNT(CASE WHEN days_since_last_activity <= 7 THEN 1 END) as active_last_week,
    COUNT(CASE WHEN days_since_last_activity > 30 THEN 1 END) as inactive_month_plus
FROM (
    SELECT DISTINCT ON (user_id) *
    FROM user_churn_risk
    WHERE calculated_at >= CURRENT_DATE - INTERVAL '90 days'
    ORDER BY user_id, calculated_at DESC
) latest_risks
GROUP BY DATE_TRUNC('day', calculated_at), risk_level
ORDER BY date DESC, risk_level;

CREATE UNIQUE INDEX ON retention_summary (date, risk_level);

-- Create materialized view for lifecycle stage distribution
CREATE MATERIALIZED VIEW IF NOT EXISTS lifecycle_stage_summary AS
SELECT 
    DATE_TRUNC('day', calculated_at) as date,
    current_stage,
    COUNT(*) as user_count,
    AVG(days_in_stage) as avg_days_in_stage,
    COUNT(CASE WHEN days_in_stage <= 7 THEN 1 END) as new_to_stage,
    COUNT(CASE WHEN days_in_stage > 30 THEN 1 END) as long_in_stage
FROM (
    SELECT DISTINCT ON (user_id) *
    FROM user_lifecycle_stages
    WHERE calculated_at >= CURRENT_DATE - INTERVAL '90 days'
    ORDER BY user_id, calculated_at DESC
) latest_stages
GROUP BY DATE_TRUNC('day', calculated_at), current_stage
ORDER BY date DESC, current_stage;

CREATE UNIQUE INDEX ON lifecycle_stage_summary (date, current_stage);

-- Create materialized view for campaign performance
CREATE MATERIALIZED VIEW IF NOT EXISTS campaign_performance_summary AS
SELECT 
    campaign_type,
    status,
    COUNT(*) as campaign_count,
    AVG((performance->>'targetUsers')::numeric) as avg_target_users,
    AVG((performance->>'reachedUsers')::numeric) as avg_reached_users,
    AVG((performance->>'engagementRate')::numeric) as avg_engagement_rate,
    AVG((performance->>'conversionRate')::numeric) as avg_conversion_rate,
    AVG((performance->>'roi')::numeric) as avg_roi,
    SUM((budget->>'totalBudget')::numeric) as total_budget,
    SUM((budget->>'spentAmount')::numeric) as total_spent
FROM retention_campaigns
WHERE performance IS NOT NULL
GROUP BY campaign_type, status
ORDER BY campaign_type, status;

CREATE UNIQUE INDEX ON campaign_performance_summary (campaign_type, status);

-- Function to refresh retention materialized views
CREATE OR REPLACE FUNCTION refresh_retention_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY retention_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY lifecycle_stage_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_performance_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user segment membership
CREATE OR REPLACE FUNCTION calculate_user_segment_membership(p_user_id VARCHAR(255), p_segment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    segment_criteria JSONB;
    criteria_item JSONB;
    field_value TEXT;
    operator TEXT;
    expected_value JSONB;
    meets_criteria BOOLEAN := TRUE;
BEGIN
    -- Get segment criteria
    SELECT segment_criteria INTO segment_criteria 
    FROM retention_user_segments 
    WHERE id = p_segment_id AND is_active = true;
    
    IF segment_criteria IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Evaluate each criteria
    FOR criteria_item IN SELECT * FROM jsonb_array_elements(segment_criteria)
    LOOP
        -- Extract criteria components
        field_value := criteria_item->>'field';
        operator := criteria_item->>'operator';
        expected_value := criteria_item->'value';
        
        -- This is a simplified implementation
        -- In practice, you'd need to evaluate against actual user data
        -- For now, we'll just return true for demonstration
        
    END LOOP;
    
    RETURN meets_criteria;
END;
$$ LANGUAGE plpgsql;

-- Function to update user segment memberships
CREATE OR REPLACE FUNCTION update_user_segment_memberships()
RETURNS void AS $$
DECLARE
    segment_record RECORD;
    user_record RECORD;
    is_member BOOLEAN;
    existing_membership UUID;
BEGIN
    -- Loop through active segments
    FOR segment_record IN 
        SELECT id, segment_name, segment_criteria 
        FROM retention_user_segments 
        WHERE is_active = true
    LOOP
        -- Loop through users (in practice, you'd batch this)
        FOR user_record IN 
            SELECT telegram_id 
            FROM users 
            LIMIT 1000  -- Process in batches
        LOOP
            -- Check if user meets segment criteria
            is_member := calculate_user_segment_membership(user_record.telegram_id, segment_record.id);
            
            -- Check existing membership
            SELECT id INTO existing_membership
            FROM user_segment_memberships
            WHERE user_id = user_record.telegram_id 
              AND segment_id = segment_record.id 
              AND is_active = true;
            
            IF is_member AND existing_membership IS NULL THEN
                -- Add user to segment
                INSERT INTO user_segment_memberships (user_id, segment_id, joined_at, is_active)
                VALUES (user_record.telegram_id, segment_record.id, NOW(), true);
            ELSIF NOT is_member AND existing_membership IS NOT NULL THEN
                -- Remove user from segment
                UPDATE user_segment_memberships 
                SET is_active = false, left_at = NOW()
                WHERE id = existing_membership;
            END IF;
        END LOOP;
        
        -- Update segment user count
        UPDATE retention_user_segments 
        SET user_count = (
            SELECT COUNT(*) 
            FROM user_segment_memberships 
            WHERE segment_id = segment_record.id AND is_active = true
        ),
        last_calculated = NOW()
        WHERE id = segment_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
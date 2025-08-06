-- Migration: Create traffic analytics tables
-- Description: Tables for traffic analytics, dashboards, reports, A/B testing, and insights

-- Traffic Dashboards table
CREATE TABLE IF NOT EXISTS traffic_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    dashboard_type VARCHAR(50) NOT NULL CHECK (dashboard_type IN ('overview', 'channel_performance', 'conversion_analysis', 'roi_analysis', 'user_behavior')),
    widgets JSONB DEFAULT '[]'::jsonb,
    filters JSONB DEFAULT '[]'::jsonb,
    date_range JSONB NOT NULL,
    refresh_interval INTEGER DEFAULT 300, -- seconds
    is_public BOOLEAN DEFAULT false,
    owner_id VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Traffic Reports table
CREATE TABLE IF NOT EXISTS traffic_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('channel_performance', 'conversion_analysis', 'roi_report', 'user_journey', 'fraud_analysis', 'attribution_report')),
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    schedule JSONB,
    format VARCHAR(10) DEFAULT 'json' CHECK (format IN ('pdf', 'excel', 'csv', 'json')),
    recipients JSONB DEFAULT '[]'::jsonb,
    last_generated TIMESTAMP WITH TIME ZONE,
    next_scheduled TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
    generation_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B Tests table
CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('traffic_split', 'feature_toggle', 'content_variation', 'ui_variation')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    traffic_allocation INTEGER DEFAULT 100 CHECK (traffic_allocation >= 0 AND traffic_allocation <= 100),
    variants JSONB NOT NULL DEFAULT '[]'::jsonb,
    target_metric VARCHAR(255) NOT NULL,
    success_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    statistical_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    results JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channel Performance table
CREATE TABLE IF NOT EXISTS channel_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id VARCHAR(255) NOT NULL,
    channel_name VARCHAR(255) NOT NULL,
    channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('personal_channel', 'group', 'direct_message', 'broadcast')),
    date_range JSONB NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    trends JSONB DEFAULT '{}'::jsonb,
    segments JSONB DEFAULT '[]'::jsonb,
    top_performers JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- User Journeys table
CREATE TABLE IF NOT EXISTS user_journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    journey_type VARCHAR(20) NOT NULL CHECK (journey_type IN ('conversion', 'abandoned', 'exploration')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL, -- seconds
    touchpoints JSONB NOT NULL DEFAULT '[]'::jsonb,
    outcome JSONB NOT NULL DEFAULT '{}'::jsonb,
    path_analysis JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ROI Analysis table
CREATE TABLE IF NOT EXISTS roi_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN ('channel', 'campaign', 'store', 'product', 'user_segment')),
    entity_id VARCHAR(255) NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    date_range JSONB NOT NULL,
    investment JSONB NOT NULL DEFAULT '{}'::jsonb,
    returns JSONB NOT NULL DEFAULT '{}'::jsonb,
    roi_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    breakdown JSONB DEFAULT '[]'::jsonb,
    trends JSONB DEFAULT '{}'::jsonb,
    benchmarks JSONB DEFAULT '{}'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Analytics Alerts table
CREATE TABLE IF NOT EXISTS analytics_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('threshold', 'anomaly', 'trend', 'comparison')),
    metric VARCHAR(255) NOT NULL,
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    channels JSONB NOT NULL DEFAULT '[]'::jsonb,
    recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
    frequency VARCHAR(20) DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'hourly', 'daily')),
    is_active BOOLEAN DEFAULT true,
    last_triggered TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    suppression_rules JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Insights table
CREATE TABLE IF NOT EXISTS analytics_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('opportunity', 'risk', 'trend', 'anomaly', 'recommendation')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    impact JSONB NOT NULL DEFAULT '{}'::jsonb,
    evidence JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    affected_entities JSONB DEFAULT '[]'::jsonb,
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'in_progress', 'resolved', 'dismissed')),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Data Exports table
CREATE TABLE IF NOT EXISTS data_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    export_type VARCHAR(20) NOT NULL CHECK (export_type IN ('raw_data', 'aggregated_data', 'report', 'dashboard')),
    format VARCHAR(10) NOT NULL CHECK (format IN ('csv', 'excel', 'json', 'pdf')),
    data_source VARCHAR(255) NOT NULL,
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb,
    schedule JSONB,
    destination JSONB NOT NULL,
    last_exported TIMESTAMP WITH TIME ZONE,
    next_scheduled TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
    export_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Sessions table (for tracking user sessions)
CREATE TABLE IF NOT EXISTS analytics_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- seconds
    page_views INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,
    source VARCHAR(255),
    medium VARCHAR(255),
    campaign VARCHAR(255),
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    country VARCHAR(100),
    city VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    landing_page TEXT,
    exit_page TEXT,
    is_bounce BOOLEAN DEFAULT false,
    conversion_value DECIMAL(12,2) DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Events table (for tracking specific events)
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(100),
    event_action VARCHAR(100),
    event_label VARCHAR(255),
    event_value DECIMAL(12,4),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    page_url TEXT,
    page_title VARCHAR(255),
    custom_dimensions JSONB DEFAULT '{}'::jsonb,
    custom_metrics JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_traffic_dashboards_owner ON traffic_dashboards(owner_id);
CREATE INDEX IF NOT EXISTS idx_traffic_dashboards_type ON traffic_dashboards(dashboard_type);
CREATE INDEX IF NOT EXISTS idx_traffic_dashboards_public ON traffic_dashboards(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_traffic_reports_type ON traffic_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_traffic_reports_status ON traffic_reports(status);
CREATE INDEX IF NOT EXISTS idx_traffic_reports_scheduled ON traffic_reports(next_scheduled) WHERE next_scheduled IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_dates ON ab_tests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ab_tests_active ON ab_tests(status, start_date, end_date) WHERE status = 'running';

CREATE INDEX IF NOT EXISTS idx_channel_performance_channel ON channel_performance(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_performance_type ON channel_performance(channel_type);
CREATE INDEX IF NOT EXISTS idx_channel_performance_calculated ON channel_performance(calculated_at);

CREATE INDEX IF NOT EXISTS idx_user_journeys_user ON user_journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_journeys_session ON user_journeys(session_id);
CREATE INDEX IF NOT EXISTS idx_user_journeys_type ON user_journeys(journey_type);
CREATE INDEX IF NOT EXISTS idx_user_journeys_time ON user_journeys(start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_roi_analysis_type_entity ON roi_analysis(analysis_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_roi_analysis_calculated ON roi_analysis(calculated_at);

CREATE INDEX IF NOT EXISTS idx_analytics_alerts_active ON analytics_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_type ON analytics_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_metric ON analytics_alerts(metric);

CREATE INDEX IF NOT EXISTS idx_analytics_insights_status ON analytics_insights(status);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_type ON analytics_insights(type);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_severity ON analytics_insights(severity);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_detected ON analytics_insights(detected_at);

CREATE INDEX IF NOT EXISTS idx_data_exports_status ON data_exports(status);
CREATE INDEX IF NOT EXISTS idx_data_exports_scheduled ON data_exports(next_scheduled) WHERE next_scheduled IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user ON analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session ON analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_time ON analytics_sessions(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_source ON analytics_sessions(source, medium, campaign);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category_action ON analytics_events(event_category, event_action);

-- Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_traffic_dashboards_widgets ON traffic_dashboards USING GIN(widgets);
CREATE INDEX IF NOT EXISTS idx_traffic_dashboards_filters ON traffic_dashboards USING GIN(filters);
CREATE INDEX IF NOT EXISTS idx_ab_tests_variants ON ab_tests USING GIN(variants);
CREATE INDEX IF NOT EXISTS idx_channel_performance_metrics ON channel_performance USING GIN(metrics);
CREATE INDEX IF NOT EXISTS idx_user_journeys_touchpoints ON user_journeys USING GIN(touchpoints);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_evidence ON analytics_insights USING GIN(evidence);
CREATE INDEX IF NOT EXISTS idx_analytics_events_custom_dimensions ON analytics_events USING GIN(custom_dimensions);

-- Add foreign key constraints where applicable
ALTER TABLE analytics_sessions ADD CONSTRAINT fk_analytics_sessions_user 
    FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

ALTER TABLE analytics_events ADD CONSTRAINT fk_analytics_events_session 
    FOREIGN KEY (session_id) REFERENCES analytics_sessions(session_id) ON DELETE CASCADE;

ALTER TABLE user_journeys ADD CONSTRAINT fk_user_journeys_user 
    FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_traffic_dashboards_updated_at BEFORE UPDATE ON traffic_dashboards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_traffic_reports_updated_at BEFORE UPDATE ON traffic_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ab_tests_updated_at BEFORE UPDATE ON ab_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analytics_alerts_updated_at BEFORE UPDATE ON analytics_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_exports_updated_at BEFORE UPDATE ON data_exports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analytics_sessions_updated_at BEFORE UPDATE ON analytics_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create materialized views for common analytics queries
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_traffic_summary AS
SELECT 
    DATE(ce.click_time) as date,
    ce.source,
    COUNT(DISTINCT ce.click_id) as total_clicks,
    COUNT(DISTINCT ce.user_id) as unique_users,
    COUNT(DISTINCT conv.id) as total_conversions,
    COALESCE(SUM(conv.order_value), 0) as total_revenue,
    COALESCE(SUM(conv.commission), 0) as total_commission,
    CASE 
        WHEN COUNT(DISTINCT ce.click_id) > 0 
        THEN ROUND((COUNT(DISTINCT conv.id)::decimal / COUNT(DISTINCT ce.click_id) * 100), 2)
        ELSE 0 
    END as conversion_rate
FROM click_events ce
LEFT JOIN conversion_events conv ON ce.click_id = conv.click_id
WHERE ce.click_time >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(ce.click_time), ce.source
ORDER BY date DESC, total_revenue DESC;

CREATE UNIQUE INDEX ON daily_traffic_summary (date, source);

-- Create materialized view for channel performance
CREATE MATERIALIZED VIEW IF NOT EXISTS channel_performance_summary AS
SELECT 
    ce.source as channel,
    COUNT(DISTINCT ce.click_id) as total_clicks,
    COUNT(DISTINCT ce.user_id) as unique_users,
    COUNT(DISTINCT conv.id) as total_conversions,
    COALESCE(SUM(conv.order_value), 0) as total_revenue,
    COALESCE(SUM(conv.commission), 0) as total_commission,
    CASE 
        WHEN COUNT(DISTINCT ce.click_id) > 0 
        THEN ROUND((COUNT(DISTINCT conv.id)::decimal / COUNT(DISTINCT ce.click_id) * 100), 2)
        ELSE 0 
    END as conversion_rate,
    CASE 
        WHEN COUNT(DISTINCT conv.id) > 0 
        THEN ROUND(AVG(conv.order_value), 2)
        ELSE 0 
    END as average_order_value,
    MAX(ce.click_time) as last_activity
FROM click_events ce
LEFT JOIN conversion_events conv ON ce.click_id = conv.click_id
WHERE ce.click_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ce.source
ORDER BY total_revenue DESC;

CREATE UNIQUE INDEX ON channel_performance_summary (channel);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_traffic_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY channel_performance_summary;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to refresh views (requires pg_cron extension)
-- SELECT cron.schedule('refresh-analytics-views', '0 1 * * *', 'SELECT refresh_analytics_views();');
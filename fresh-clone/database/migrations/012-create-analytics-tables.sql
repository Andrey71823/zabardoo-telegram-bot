-- Migration: Create Analytics System Tables
-- Description: Creates tables for event collection, user sessions, funnels, cohorts, and analytics

-- User Events Table (Main event storage)
CREATE TABLE IF NOT EXISTS user_events (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    event_type ENUM('user_action', 'system_event', 'business_event', 'error_event', 'performance_event') NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    properties JSON,
    context JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_events_user_id (user_id),
    INDEX idx_user_events_session_id (session_id),
    INDEX idx_user_events_event_type (event_type),
    INDEX idx_user_events_event_name (event_name),
    INDEX idx_user_events_timestamp (timestamp),
    INDEX idx_user_events_composite (user_id, event_type, timestamp),
    INDEX idx_user_events_business (event_type, event_name, timestamp) WHERE event_type = 'business_event'
);

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_start TIMESTAMP NOT NULL,
    session_end TIMESTAMP NULL,
    duration INTEGER NULL, -- in milliseconds
    platform VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    properties JSON,
    context JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_sessions_user_id (user_id),
    INDEX idx_user_sessions_start (session_start),
    INDEX idx_user_sessions_platform (platform),
    INDEX idx_user_sessions_source (source),
    INDEX idx_user_sessions_duration (duration)
);

-- Event Aggregations Table (Pre-computed metrics)
CREATE TABLE IF NOT EXISTS event_aggregations (
    id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    aggregation_type ENUM('count', 'sum', 'average', 'min', 'max', 'percentile', 'unique_count') NOT NULL,
    time_window ENUM('minute', 'hour', 'day', 'week', 'month', 'quarter', 'year') NOT NULL,
    dimensions JSON,
    metrics JSON,
    filters JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_event_aggregations_type (event_type),
    INDEX idx_event_aggregations_name (event_name),
    INDEX idx_event_aggregations_window (time_window)
);

-- Aggregated Data Table (Stores computed aggregations)
CREATE TABLE IF NOT EXISTS aggregated_data (
    id VARCHAR(255) PRIMARY KEY,
    aggregation_id VARCHAR(255) NOT NULL,
    time_bucket TIMESTAMP NOT NULL,
    dimensions JSON,
    metrics JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (aggregation_id) REFERENCES event_aggregations(id) ON DELETE CASCADE,
    INDEX idx_aggregated_data_aggregation (aggregation_id),
    INDEX idx_aggregated_data_time (time_bucket),
    INDEX idx_aggregated_data_composite (aggregation_id, time_bucket)
);

-- Conversion Funnels Table
CREATE TABLE IF NOT EXISTS conversion_funnels (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    steps JSON NOT NULL,
    time_window INTEGER NOT NULL, -- in hours
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_conversion_funnels_active (is_active),
    INDEX idx_conversion_funnels_name (name)
);

-- Funnel Analysis Results Table
CREATE TABLE IF NOT EXISTS funnel_analysis_results (
    id VARCHAR(255) PRIMARY KEY,
    funnel_id VARCHAR(255) NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    total_users INTEGER NOT NULL,
    conversion_rate DECIMAL(5,4) NOT NULL,
    steps_data JSON NOT NULL,
    dropoff_points JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (funnel_id) REFERENCES conversion_funnels(id) ON DELETE CASCADE,
    INDEX idx_funnel_results_funnel (funnel_id),
    INDEX idx_funnel_results_date (date_from, date_to)
);

-- Cohort Definitions Table
CREATE TABLE IF NOT EXISTS cohort_definitions (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cohort_type ENUM('acquisition', 'behavioral', 'revenue') NOT NULL,
    definition_criteria JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_cohort_definitions_type (cohort_type),
    INDEX idx_cohort_definitions_active (is_active)
);

-- Cohort Analysis Results Table
CREATE TABLE IF NOT EXISTS cohort_analysis_results (
    id VARCHAR(255) PRIMARY KEY,
    definition_id VARCHAR(255) NOT NULL,
    cohort_date DATE NOT NULL,
    user_count INTEGER NOT NULL,
    retention_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (definition_id) REFERENCES cohort_definitions(id) ON DELETE CASCADE,
    INDEX idx_cohort_results_definition (definition_id),
    INDEX idx_cohort_results_date (cohort_date)
);

-- Real-time Metrics Table
CREATE TABLE IF NOT EXISTS real_time_metrics (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    value DECIMAL(15,4) NOT NULL,
    previous_value DECIMAL(15,4),
    change_value DECIMAL(15,4),
    change_percent DECIMAL(8,4),
    unit VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    trend ENUM('up', 'down', 'stable') NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_real_time_metrics_name (name),
    INDEX idx_real_time_metrics_timestamp (timestamp),
    INDEX idx_real_time_metrics_trend (trend)
);

-- Custom Reports Table
CREATE TABLE IF NOT EXISTS custom_reports (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    query_config JSON NOT NULL,
    schedule_config JSON,
    recipients JSON,
    format ENUM('json', 'csv', 'excel', 'pdf') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_custom_reports_active (is_active),
    INDEX idx_custom_reports_schedule (last_run)
);

-- Report Executions Table
CREATE TABLE IF NOT EXISTS report_executions (
    id VARCHAR(255) PRIMARY KEY,
    report_id VARCHAR(255) NOT NULL,
    execution_start TIMESTAMP NOT NULL,
    execution_end TIMESTAMP,
    status ENUM('running', 'completed', 'failed') NOT NULL,
    result_data JSON,
    error_message TEXT,
    file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (report_id) REFERENCES custom_reports(id) ON DELETE CASCADE,
    INDEX idx_report_executions_report (report_id),
    INDEX idx_report_executions_status (status),
    INDEX idx_report_executions_start (execution_start)
);

-- Event Processing Rules Table
CREATE TABLE IF NOT EXISTS event_processing_rules (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    conditions JSON NOT NULL,
    actions JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_processing_rules_type (event_type),
    INDEX idx_processing_rules_active (is_active),
    INDEX idx_processing_rules_priority (priority)
);

-- Data Quality Checks Table
CREATE TABLE IF NOT EXISTS data_quality_checks (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    check_type ENUM('completeness', 'accuracy', 'consistency', 'timeliness', 'validity') NOT NULL,
    rules JSON NOT NULL,
    schedule VARCHAR(100) NOT NULL, -- cron expression
    is_active BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_quality_checks_type (check_type),
    INDEX idx_quality_checks_active (is_active),
    INDEX idx_quality_checks_schedule (last_run)
);

-- Data Quality Results Table
CREATE TABLE IF NOT EXISTS data_quality_results (
    id VARCHAR(255) PRIMARY KEY,
    check_id VARCHAR(255) NOT NULL,
    run_at TIMESTAMP NOT NULL,
    passed BOOLEAN NOT NULL,
    score DECIMAL(5,2) NOT NULL, -- 0-100
    issues JSON,
    summary JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (check_id) REFERENCES data_quality_checks(id) ON DELETE CASCADE,
    INDEX idx_quality_results_check (check_id),
    INDEX idx_quality_results_run (run_at),
    INDEX idx_quality_results_passed (passed)
);

-- Alerts Table
CREATE TABLE IF NOT EXISTS analytics_alerts (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    conditions JSON NOT NULL,
    is_triggered BOOLEAN DEFAULT FALSE,
    triggered_at TIMESTAMP NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    message TEXT NOT NULL,
    recipients JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_analytics_alerts_type (alert_type),
    INDEX idx_analytics_alerts_triggered (is_triggered),
    INDEX idx_analytics_alerts_severity (severity),
    INDEX idx_analytics_alerts_active (is_active)
);

-- Event Batches Table (For batch processing tracking)
CREATE TABLE IF NOT EXISTS event_batches (
    id VARCHAR(255) PRIMARY KEY,
    batch_size INTEGER NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    error_message TEXT,
    
    INDEX idx_event_batches_status (status),
    INDEX idx_event_batches_created (created_at)
);

-- User Behavior Patterns Table (ML-derived insights)
CREATE TABLE IF NOT EXISTS user_behavior_patterns (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    pattern_data JSON NOT NULL,
    confidence_score DECIMAL(4,3) NOT NULL, -- 0.000-1.000
    detected_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_behavior_patterns_user (user_id),
    INDEX idx_behavior_patterns_type (pattern_type),
    INDEX idx_behavior_patterns_confidence (confidence_score),
    INDEX idx_behavior_patterns_detected (detected_at)
);

-- Create materialized views for common analytics queries
CREATE VIEW daily_active_users AS
SELECT 
    DATE(timestamp) as date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_events
FROM user_events 
WHERE timestamp >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
GROUP BY DATE(timestamp)
ORDER BY date;

CREATE VIEW hourly_event_volume AS
SELECT 
    DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users
FROM user_events 
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00'), event_type
ORDER BY hour, event_type;

CREATE VIEW top_events_today AS
SELECT 
    event_name,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(JSON_EXTRACT(properties, '$.duration')) as avg_duration
FROM user_events 
WHERE DATE(timestamp) = CURRENT_DATE
GROUP BY event_name
ORDER BY event_count DESC
LIMIT 20;

CREATE VIEW user_session_summary AS
SELECT 
    user_id,
    COUNT(*) as total_sessions,
    AVG(duration) as avg_session_duration,
    MAX(session_start) as last_session,
    SUM(JSON_EXTRACT(properties, '$.eventsCount')) as total_events
FROM user_sessions 
WHERE session_start >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
GROUP BY user_id;

-- Create indexes for performance optimization
CREATE INDEX idx_events_user_time ON user_events(user_id, timestamp);
CREATE INDEX idx_events_type_time ON user_events(event_type, timestamp);
CREATE INDEX idx_events_name_time ON user_events(event_name, timestamp);
CREATE INDEX idx_sessions_user_start ON user_sessions(user_id, session_start);

-- Create partitioning for large tables (if supported)
-- ALTER TABLE user_events PARTITION BY RANGE (TO_DAYS(timestamp)) (
--     PARTITION p_old VALUES LESS THAN (TO_DAYS('2024-01-01')),
--     PARTITION p_2024_q1 VALUES LESS THAN (TO_DAYS('2024-04-01')),
--     PARTITION p_2024_q2 VALUES LESS THAN (TO_DAYS('2024-07-01')),
--     PARTITION p_2024_q3 VALUES LESS THAN (TO_DAYS('2024-10-01')),
--     PARTITION p_2024_q4 VALUES LESS THAN (TO_DAYS('2025-01-01')),
--     PARTITION p_future VALUES LESS THAN MAXVALUE
-- );

-- Insert sample processing rules
INSERT INTO event_processing_rules (id, name, event_type, conditions, actions, is_active, priority) VALUES
('rule_high_value_purchase', 'High Value Purchase Alert', 'business_event', 
 '[{"field": "properties.value", "operator": "gt", "value": 10000}]',
 '[{"type": "alert", "parameters": {"alertType": "high_value_purchase", "message": "High value purchase detected"}}]',
 TRUE, 10),

('rule_error_tracking', 'Error Event Processing', 'error_event',
 '[{"field": "event_type", "operator": "eq", "value": "error_event"}]',
 '[{"type": "enrich", "parameters": {"enrichmentData": {"severity": "high"}}}, {"type": "alert", "parameters": {"alertType": "error", "message": "Error event detected"}}]',
 TRUE, 20),

('rule_user_engagement', 'User Engagement Tracking', 'user_action',
 '[{"field": "properties.action", "operator": "in", "value": ["coupon_click", "purchase_completed", "cashback_earned"]}]',
 '[{"type": "enrich", "parameters": {"enrichmentData": {"engagement_type": "high"}}}]',
 TRUE, 5);

-- Insert sample data quality checks
INSERT INTO data_quality_checks (id, name, check_type, rules, schedule, is_active) VALUES
('check_event_completeness', 'Event Data Completeness', 'completeness',
 '[{"field": "user_id", "constraint": "not_null"}, {"field": "event_name", "constraint": "not_null"}, {"field": "timestamp", "constraint": "not_null"}]',
 '0 */6 * * *', TRUE),

('check_timestamp_validity', 'Timestamp Validity Check', 'validity',
 '[{"field": "timestamp", "constraint": "valid_timestamp"}, {"field": "timestamp", "constraint": "not_future", "threshold": 300}]',
 '0 */2 * * *', TRUE),

('check_user_id_format', 'User ID Format Check', 'validity',
 '[{"field": "user_id", "constraint": "regex", "value": "^[a-zA-Z0-9_]+$"}]',
 '0 */4 * * *', TRUE);

-- Insert sample real-time metrics
INSERT INTO real_time_metrics (id, name, value, unit, timestamp, trend) VALUES
('metric_active_users', 'Active Users', 0, 'count', NOW(), 'stable'),
('metric_events_per_minute', 'Events Per Minute', 0, 'count/min', NOW(), 'stable'),
('metric_conversion_rate', 'Conversion Rate', 0, 'percentage', NOW(), 'stable'),
('metric_avg_session_duration', 'Average Session Duration', 0, 'seconds', NOW(), 'stable'),
('metric_error_rate', 'Error Rate', 0, 'percentage', NOW(), 'stable');

-- Add comments for documentation
ALTER TABLE user_events COMMENT = 'Main table for storing all user interaction events';
ALTER TABLE user_sessions COMMENT = 'User session tracking and analytics';
ALTER TABLE event_aggregations COMMENT = 'Configuration for pre-computed event aggregations';
ALTER TABLE aggregated_data COMMENT = 'Pre-computed aggregated metrics for fast querying';
ALTER TABLE conversion_funnels COMMENT = 'Funnel definitions for conversion analysis';
ALTER TABLE cohort_definitions COMMENT = 'Cohort analysis configurations';
ALTER TABLE real_time_metrics COMMENT = 'Real-time dashboard metrics';
ALTER TABLE custom_reports COMMENT = 'User-defined custom analytics reports';
ALTER TABLE event_processing_rules COMMENT = 'Rules for real-time event processing and enrichment';
ALTER TABLE data_quality_checks COMMENT = 'Data quality monitoring and validation rules';
-- Migration: Create Notification Campaign Tables
-- Description: Tables for comprehensive notification and campaign management system

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('broadcast', 'targeted', 'automated', 'ab_test')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    
    -- Targeting (stored as JSON)
    target_audience JSONB NOT NULL DEFAULT '{}',
    
    -- Content (stored as JSON)
    content JSONB NOT NULL DEFAULT '{}',
    
    -- Scheduling (stored as JSON)
    schedule JSONB NOT NULL DEFAULT '{}',
    
    -- A/B Testing (stored as JSON, nullable)
    ab_test JSONB,
    
    -- Delivery settings (stored as JSON)
    delivery JSONB NOT NULL DEFAULT '{}',
    
    -- Metrics (stored as JSON)
    metrics JSONB NOT NULL DEFAULT '{}',
    
    -- Metadata
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    tags TEXT[] DEFAULT '{}',
    notes TEXT
);

-- Create campaign_executions table
CREATE TABLE IF NOT EXISTS campaign_executions (
    id VARCHAR(255) PRIMARY KEY,
    campaign_id VARCHAR(255) NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    execution_type VARCHAR(20) NOT NULL CHECK (execution_type IN ('manual', 'scheduled', 'triggered')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- Execution details
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration INTEGER, -- seconds
    
    -- Batch processing
    total_batches INTEGER NOT NULL DEFAULT 1,
    completed_batches INTEGER DEFAULT 0,
    current_batch INTEGER,
    batch_size INTEGER NOT NULL DEFAULT 100,
    
    -- Results (stored as JSON)
    results JSONB NOT NULL DEFAULT '{}',
    
    -- A/B Test specific results (stored as JSON, nullable)
    ab_test_results JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(30) NOT NULL CHECK (category IN ('promotional', 'transactional', 'informational', 'reminder')),
    
    -- Template content (stored as JSON)
    content JSONB NOT NULL DEFAULT '{}',
    
    -- Variables that can be replaced (stored as JSON)
    variables JSONB NOT NULL DEFAULT '[]',
    
    -- Usage stats (stored as JSON)
    usage JSONB NOT NULL DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notification_deliveries table
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id VARCHAR(255) PRIMARY KEY,
    campaign_id VARCHAR(255) NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    execution_id VARCHAR(255) NOT NULL REFERENCES campaign_executions(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Content delivered (stored as JSON)
    content JSONB NOT NULL DEFAULT '{}',
    
    -- Delivery details
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('telegram', 'email', 'push', 'sms')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    
    -- Timestamps
    scheduled_at TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,
    
    -- Interaction tracking (stored as JSON)
    interactions JSONB NOT NULL DEFAULT '{}',
    
    -- Technical details
    message_id VARCHAR(255), -- external message ID
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- A/B Test
    ab_test_variant_id VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create automated_campaign_triggers table
CREATE TABLE IF NOT EXISTS automated_campaign_triggers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Trigger conditions (stored as JSON)
    trigger_config JSONB NOT NULL DEFAULT '{}',
    
    -- Campaign template (stored as JSON)
    campaign_template JSONB NOT NULL DEFAULT '{}',
    
    -- Execution settings (stored as JSON)
    settings JSONB NOT NULL DEFAULT '{}',
    
    -- Statistics (stored as JSON)
    stats JSONB NOT NULL DEFAULT '{}',
    
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bulk_notifications table
CREATE TABLE IF NOT EXISTS bulk_notifications (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'promotion', 'system')),
    
    -- Recipients (stored as JSON)
    recipients JSONB NOT NULL DEFAULT '{}',
    
    -- Delivery
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('telegram', 'email', 'push', 'sms')),
    scheduled_at TIMESTAMP,
    
    -- Results (stored as JSON)
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed')),
    results JSONB NOT NULL DEFAULT '{}',
    
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create notification_analytics table for aggregated analytics
CREATE TABLE IF NOT EXISTS notification_analytics (
    id VARCHAR(255) PRIMARY KEY,
    campaign_id VARCHAR(255) NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Daily aggregated metrics
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    converted_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    
    -- Revenue metrics
    revenue DECIMAL(15,2) DEFAULT 0,
    
    -- Calculated rates
    delivery_rate DECIMAL(5,2) DEFAULT 0,
    open_rate DECIMAL(5,2) DEFAULT 0,
    click_rate DECIMAL(5,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    unsubscribe_rate DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(campaign_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(type);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_started_at ON campaigns(started_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_tags ON campaigns USING gin(tags);

CREATE INDEX IF NOT EXISTS idx_campaign_executions_campaign_id ON campaign_executions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_status ON campaign_executions(status);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_started_at ON campaign_executions(started_at);

CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON notification_templates(category);
CREATE INDEX IF NOT EXISTS idx_notification_templates_is_active ON notification_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_templates_created_by ON notification_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_campaign_id ON notification_deliveries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_execution_id ON notification_deliveries(execution_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_id ON notification_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_channel ON notification_deliveries(channel);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_scheduled_at ON notification_deliveries(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_sent_at ON notification_deliveries(sent_at);

CREATE INDEX IF NOT EXISTS idx_automated_triggers_is_active ON automated_campaign_triggers(is_active);
CREATE INDEX IF NOT EXISTS idx_automated_triggers_created_by ON automated_campaign_triggers(created_by);

CREATE INDEX IF NOT EXISTS idx_bulk_notifications_status ON bulk_notifications(status);
CREATE INDEX IF NOT EXISTS idx_bulk_notifications_created_by ON bulk_notifications(created_by);
CREATE INDEX IF NOT EXISTS idx_bulk_notifications_scheduled_at ON bulk_notifications(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_notification_analytics_campaign_id ON notification_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_date ON notification_analytics(date);

-- Create full-text search index for campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_search ON campaigns USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Create full-text search index for templates
CREATE INDEX IF NOT EXISTS idx_templates_search ON notification_templates USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaign_executions_updated_at ON campaign_executions;
CREATE TRIGGER update_campaign_executions_updated_at
    BEFORE UPDATE ON campaign_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_updated_at
    BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_deliveries_updated_at ON notification_deliveries;
CREATE TRIGGER update_notification_deliveries_updated_at
    BEFORE UPDATE ON notification_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_automated_triggers_updated_at ON automated_campaign_triggers;
CREATE TRIGGER update_automated_triggers_updated_at
    BEFORE UPDATE ON automated_campaign_triggers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bulk_notifications_updated_at ON bulk_notifications;
CREATE TRIGGER update_bulk_notifications_updated_at
    BEFORE UPDATE ON bulk_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_analytics_updated_at ON notification_analytics;
CREATE TRIGGER update_notification_analytics_updated_at
    BEFORE UPDATE ON notification_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically update campaign metrics
CREATE OR REPLACE FUNCTION update_campaign_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update campaign metrics when delivery status changes
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- This would typically update aggregated metrics in the campaigns table
        -- For now, it's a placeholder for future enhancements
        NULL;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for campaign metrics updates
DROP TRIGGER IF EXISTS update_campaign_metrics_trigger ON notification_deliveries;
CREATE TRIGGER update_campaign_metrics_trigger
    AFTER UPDATE ON notification_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_metrics();

-- Create function to aggregate daily analytics
CREATE OR REPLACE FUNCTION aggregate_daily_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Aggregate daily metrics when deliveries are updated
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        INSERT INTO notification_analytics (
            id, campaign_id, date, sent_count, delivered_count, 
            opened_count, clicked_count, converted_count, 
            unsubscribed_count, failed_count, bounced_count
        )
        SELECT 
            CONCAT(NEW.campaign_id, '-', DATE(NEW.scheduled_at)) as id,
            NEW.campaign_id,
            DATE(NEW.scheduled_at) as date,
            COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
            COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
            COUNT(*) FILTER (WHERE (interactions->>'opened')::boolean = true) as opened_count,
            COUNT(*) FILTER (WHERE (interactions->>'clicked')::boolean = true) as clicked_count,
            COUNT(*) FILTER (WHERE (interactions->>'converted')::boolean = true) as converted_count,
            COUNT(*) FILTER (WHERE (interactions->>'unsubscribed')::boolean = true) as unsubscribed_count,
            COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
            COUNT(*) FILTER (WHERE status = 'bounced') as bounced_count
        FROM notification_deliveries 
        WHERE campaign_id = NEW.campaign_id 
        AND DATE(scheduled_at) = DATE(NEW.scheduled_at)
        GROUP BY campaign_id, DATE(scheduled_at)
        ON CONFLICT (campaign_id, date) 
        DO UPDATE SET
            sent_count = EXCLUDED.sent_count,
            delivered_count = EXCLUDED.delivered_count,
            opened_count = EXCLUDED.opened_count,
            clicked_count = EXCLUDED.clicked_count,
            converted_count = EXCLUDED.converted_count,
            unsubscribed_count = EXCLUDED.unsubscribed_count,
            failed_count = EXCLUDED.failed_count,
            bounced_count = EXCLUDED.bounced_count,
            delivery_rate = CASE WHEN EXCLUDED.sent_count > 0 THEN (EXCLUDED.delivered_count::decimal / EXCLUDED.sent_count) * 100 ELSE 0 END,
            open_rate = CASE WHEN EXCLUDED.delivered_count > 0 THEN (EXCLUDED.opened_count::decimal / EXCLUDED.delivered_count) * 100 ELSE 0 END,
            click_rate = CASE WHEN EXCLUDED.opened_count > 0 THEN (EXCLUDED.clicked_count::decimal / EXCLUDED.opened_count) * 100 ELSE 0 END,
            conversion_rate = CASE WHEN EXCLUDED.clicked_count > 0 THEN (EXCLUDED.converted_count::decimal / EXCLUDED.clicked_count) * 100 ELSE 0 END,
            unsubscribe_rate = CASE WHEN EXCLUDED.delivered_count > 0 THEN (EXCLUDED.unsubscribed_count::decimal / EXCLUDED.delivered_count) * 100 ELSE 0 END,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create trigger for daily analytics aggregation
DROP TRIGGER IF EXISTS aggregate_daily_analytics_trigger ON notification_deliveries;
CREATE TRIGGER aggregate_daily_analytics_trigger
    AFTER INSERT OR UPDATE ON notification_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION aggregate_daily_analytics();

-- Create views for common queries
CREATE OR REPLACE VIEW campaign_stats_view AS
SELECT 
    COUNT(*) as total_campaigns,
    COUNT(*) FILTER (WHERE status IN ('running', 'scheduled')) as active_campaigns,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_campaigns,
    COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_campaigns,
    COUNT(*) FILTER (WHERE status = 'draft') as draft_campaigns,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_campaigns,
    COUNT(*) FILTER (WHERE type = 'broadcast') as broadcast_campaigns,
    COUNT(*) FILTER (WHERE type = 'targeted') as targeted_campaigns,
    COUNT(*) FILTER (WHERE type = 'automated') as automated_campaigns,
    COUNT(*) FILTER (WHERE type = 'ab_test') as ab_test_campaigns
FROM campaigns;

CREATE OR REPLACE VIEW campaign_performance_view AS
SELECT 
    c.id,
    c.name,
    c.type,
    c.status,
    c.created_at,
    c.started_at,
    c.completed_at,
    (c.metrics->>'sentCount')::int as sent_count,
    (c.metrics->>'deliveredCount')::int as delivered_count,
    (c.metrics->>'openedCount')::int as opened_count,
    (c.metrics->>'clickedCount')::int as clicked_count,
    (c.metrics->>'convertedCount')::int as converted_count,
    (c.metrics->>'revenue')::numeric as revenue,
    (c.metrics->>'deliveryRate')::numeric as delivery_rate,
    (c.metrics->>'openRate')::numeric as open_rate,
    (c.metrics->>'clickRate')::numeric as click_rate,
    (c.metrics->>'conversionRate')::numeric as conversion_rate,
    (c.metrics->>'roi')::numeric as roi
FROM campaigns c
WHERE c.status IN ('completed', 'running');

-- Insert default notification templates
INSERT INTO notification_templates (id, name, description, category, content, variables, usage, is_active, created_by) VALUES
('welcome-template', 'Welcome Message', 'Welcome new users to the platform', 'informational', 
 '{"title": "Welcome to Zabardoo!", "message": "Hi {{firstName}}, welcome to Zabardoo! Start saving with our exclusive coupons.", "actionButtons": [{"text": "Browse Coupons", "url": "https://zabardoo.com/coupons"}]}',
 '[{"name": "firstName", "description": "User first name", "type": "string", "required": true}]',
 '{"timesUsed": 0, "averagePerformance": {"openRate": 0, "clickRate": 0, "conversionRate": 0}}',
 true, 'system'),
 
('coupon-alert-template', 'New Coupon Alert', 'Notify users about new coupons in their favorite categories', 'promotional',
 '{"title": "New {{category}} Coupon Available!", "message": "{{firstName}}, we found a new {{discount}}% off coupon for {{store}}. Don\'t miss out!", "actionButtons": [{"text": "Get Coupon", "url": "{{couponUrl}}"}]}',
 '[{"name": "firstName", "description": "User first name", "type": "string", "required": true}, {"name": "category", "description": "Coupon category", "type": "string", "required": true}, {"name": "discount", "description": "Discount percentage", "type": "number", "required": true}, {"name": "store", "description": "Store name", "type": "string", "required": true}, {"name": "couponUrl", "description": "Coupon URL", "type": "string", "required": true}]',
 '{"timesUsed": 0, "averagePerformance": {"openRate": 0, "clickRate": 0, "conversionRate": 0}}',
 true, 'system'),

('cashback-reminder-template', 'Cashback Reminder', 'Remind users about pending cashback', 'reminder',
 '{"title": "Your Cashback is Ready!", "message": "{{firstName}}, you have ₹{{amount}} cashback waiting. Withdraw it now!", "actionButtons": [{"text": "Withdraw Now", "url": "https://zabardoo.com/cashback"}]}',
 '[{"name": "firstName", "description": "User first name", "type": "string", "required": true}, {"name": "amount", "description": "Cashback amount", "type": "number", "required": true}]',
 '{"timesUsed": 0, "averagePerformance": {"openRate": 0, "clickRate": 0, "conversionRate": 0}}',
 true, 'system'),

('system-maintenance-template', 'System Maintenance', 'Notify users about system maintenance', 'informational',
 '{"title": "Scheduled Maintenance", "message": "We\'ll be performing maintenance on {{date}} from {{startTime}} to {{endTime}}. Service may be temporarily unavailable.", "actionButtons": []}',
 '[{"name": "date", "description": "Maintenance date", "type": "date", "required": true}, {"name": "startTime", "description": "Start time", "type": "string", "required": true}, {"name": "endTime", "description": "End time", "type": "string", "required": true}]',
 '{"timesUsed": 0, "averagePerformance": {"openRate": 0, "clickRate": 0, "conversionRate": 0}}',
 true, 'system')

ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
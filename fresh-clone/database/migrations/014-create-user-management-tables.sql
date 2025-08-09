-- Migration: Create User Management Tables
-- Description: Tables for comprehensive user management system

-- Create users table if it doesn't exist (enhance existing)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_banned BOOLEAN DEFAULT FALSE,
    banned_at TIMESTAMP,
    banned_by VARCHAR(255),
    ban_reason TEXT,
    ban_expires_at TIMESTAMP,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP,
    total_spent DECIMAL(15,2) DEFAULT 0,
    coupons_used INTEGER DEFAULT 0,
    location VARCHAR(255),
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50),
    preferences JSONB DEFAULT '{"notifications": true, "categories": [], "stores": []}',
    metadata JSONB DEFAULT '{"tags": []}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create channel_management table for personal channels
CREATE TABLE IF NOT EXISTS channel_management (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    suspended_by VARCHAR(255),
    suspended_at TIMESTAMP,
    suspension_reason TEXT,
    restored_by VARCHAR(255),
    restored_at TIMESTAMP,
    restoration_reason TEXT,
    deleted_by VARCHAR(255),
    deleted_at TIMESTAMP,
    deletion_reason TEXT,
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id)
);

-- Create user_activities table for tracking user actions
CREATE TABLE IF NOT EXISTS user_activities (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('login', 'coupon_view', 'coupon_use', 'purchase', 'channel_interaction', 'search', 'other')),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_segments table for user segmentation
CREATE TABLE IF NOT EXISTS user_segments (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL,
    user_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_segment_members table for segment membership
CREATE TABLE IF NOT EXISTS user_segment_members (
    segment_id VARCHAR(255) NOT NULL REFERENCES user_segments(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (segment_id, user_id)
);

-- Create moderation_logs table for audit trail
CREATE TABLE IF NOT EXISTS moderation_logs (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    moderator_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('user_banned', 'user_unbanned', 'channel_created', 'channel_suspended', 'channel_restored', 'channel_deleted', 'user_updated', 'notification_sent')),
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_notifications table for user notifications
CREATE TABLE IF NOT EXISTS user_notifications (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'promotion', 'system')),
    action_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    sent_by VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Create ban_list table for comprehensive ban management
CREATE TABLE IF NOT EXISTS ban_list (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL,
    username VARCHAR(255),
    ban_type VARCHAR(20) NOT NULL DEFAULT 'temporary' CHECK (ban_type IN ('temporary', 'permanent', 'ip_ban', 'device_ban')),
    reason TEXT NOT NULL,
    banned_by VARCHAR(255) NOT NULL,
    banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    appeal_status VARCHAR(20) DEFAULT 'none' CHECK (appeal_status IN ('none', 'pending', 'approved', 'rejected')),
    appeal_reason TEXT,
    appealed_at TIMESTAMP,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP,
    review_notes TEXT
);

-- Create user_restrictions table for granular restrictions
CREATE TABLE IF NOT EXISTS user_restrictions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restriction_type VARCHAR(30) NOT NULL CHECK (restriction_type IN ('channel_access', 'coupon_usage', 'message_sending', 'group_participation')),
    is_active BOOLEAN DEFAULT TRUE,
    reason TEXT NOT NULL,
    applied_by VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Create group_moderation_settings table
CREATE TABLE IF NOT EXISTS group_moderation_settings (
    id VARCHAR(255) PRIMARY KEY,
    group_id VARCHAR(255) NOT NULL,
    auto_moderation JSONB DEFAULT '{"enabled": true, "spamDetection": true, "linkFiltering": true, "profanityFilter": true, "duplicateMessageFilter": true}',
    restrictions JSONB DEFAULT '{"newMemberRestrictions": true, "messageFrequencyLimit": 5, "linkPostingAllowed": false, "mediaPostingAllowed": true, "forwardingAllowed": true}',
    moderators TEXT[] DEFAULT '{}',
    banned_words TEXT[] DEFAULT '{}',
    allowed_domains TEXT[] DEFAULT '{}',
    warning_thresholds JSONB DEFAULT '{"autoWarn": 3, "autoMute": 5, "autoBan": 10}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id)
);

-- Create user_engagement_metrics table for tracking engagement
CREATE TABLE IF NOT EXISTS user_engagement_metrics (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    session_duration INTEGER DEFAULT 0, -- in minutes
    coupons_used INTEGER DEFAULT 0,
    amount_spent DECIMAL(15,2) DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    messages_clicked INTEGER DEFAULT 0,
    engagement_score INTEGER DEFAULT 0, -- 0-100
    activity_level VARCHAR(20) DEFAULT 'inactive' CHECK (activity_level IN ('high', 'medium', 'low', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned);
CREATE INDEX IF NOT EXISTS idx_users_registered_at ON users(registered_at);
CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON users(last_active_at);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location);
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);
CREATE INDEX IF NOT EXISTS idx_users_total_spent ON users(total_spent);
CREATE INDEX IF NOT EXISTS idx_users_coupons_used ON users(coupons_used);

CREATE INDEX IF NOT EXISTS idx_channel_management_user_id ON channel_management(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_management_status ON channel_management(status);
CREATE INDEX IF NOT EXISTS idx_channel_management_created_at ON channel_management(created_at);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_timestamp ON user_activities(timestamp);

CREATE INDEX IF NOT EXISTS idx_moderation_logs_user_id ON moderation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_moderator_id ON moderation_logs(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_action ON moderation_logs(action);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_timestamp ON moderation_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_sent_at ON user_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(type);

CREATE INDEX IF NOT EXISTS idx_ban_list_user_id ON ban_list(user_id);
CREATE INDEX IF NOT EXISTS idx_ban_list_telegram_id ON ban_list(telegram_id);
CREATE INDEX IF NOT EXISTS idx_ban_list_is_active ON ban_list(is_active);
CREATE INDEX IF NOT EXISTS idx_ban_list_banned_at ON ban_list(banned_at);
CREATE INDEX IF NOT EXISTS idx_ban_list_expires_at ON ban_list(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_restrictions_user_id ON user_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_restrictions_type ON user_restrictions(restriction_type);
CREATE INDEX IF NOT EXISTS idx_user_restrictions_is_active ON user_restrictions(is_active);

CREATE INDEX IF NOT EXISTS idx_user_engagement_user_id ON user_engagement_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_date ON user_engagement_metrics(date);
CREATE INDEX IF NOT EXISTS idx_user_engagement_activity_level ON user_engagement_metrics(activity_level);

-- Create full-text search index for users
CREATE INDEX IF NOT EXISTS idx_users_search ON users USING gin(to_tsvector('english', 
    COALESCE(first_name, '') || ' ' || 
    COALESCE(last_name, '') || ' ' || 
    COALESCE(username, '') || ' ' || 
    COALESCE(email, '')
));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_segments_updated_at ON user_segments;
CREATE TRIGGER update_user_segments_updated_at
    BEFORE UPDATE ON user_segments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_moderation_settings_updated_at ON group_moderation_settings;
CREATE TRIGGER update_group_moderation_settings_updated_at
    BEFORE UPDATE ON group_moderation_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically update user engagement scores
CREATE OR REPLACE FUNCTION calculate_engagement_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Simple engagement score calculation
    -- In production, this would be more sophisticated
    NEW.engagement_score = LEAST(100, 
        (NEW.total_sessions * 10) + 
        (NEW.coupons_used * 5) + 
        (CASE WHEN NEW.amount_spent > 0 THEN 20 ELSE 0 END) +
        (NEW.messages_clicked * 2)
    );
    
    -- Determine activity level based on engagement score
    NEW.activity_level = CASE 
        WHEN NEW.engagement_score >= 70 THEN 'high'
        WHEN NEW.engagement_score >= 40 THEN 'medium'
        WHEN NEW.engagement_score >= 10 THEN 'low'
        ELSE 'inactive'
    END;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for engagement score calculation
DROP TRIGGER IF EXISTS calculate_engagement_score_trigger ON user_engagement_metrics;
CREATE TRIGGER calculate_engagement_score_trigger
    BEFORE INSERT OR UPDATE ON user_engagement_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_engagement_score();

-- Create function to update user stats when activities change
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user's last active time when activity is recorded
    IF TG_OP = 'INSERT' THEN
        UPDATE users 
        SET last_active_at = NEW.timestamp 
        WHERE id = NEW.user_id;
        
        -- Update engagement metrics for today
        INSERT INTO user_engagement_metrics (user_id, date, total_sessions)
        VALUES (NEW.user_id, CURRENT_DATE, 1)
        ON CONFLICT (user_id, date) 
        DO UPDATE SET total_sessions = user_engagement_metrics.total_sessions + 1;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create trigger for user stats updates
DROP TRIGGER IF EXISTS update_user_stats_trigger ON user_activities;
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT ON user_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats();

-- Create views for common queries
CREATE OR REPLACE VIEW user_stats_view AS
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE is_active = true) as active_users,
    COUNT(*) FILTER (WHERE is_banned = true) as banned_users,
    COUNT(*) FILTER (WHERE registered_at >= CURRENT_DATE) as new_users_today,
    COUNT(*) FILTER (WHERE registered_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_this_week,
    COUNT(*) FILTER (WHERE registered_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_this_month,
    COALESCE(AVG(total_spent), 0) as average_spent_per_user,
    COALESCE(AVG(coupons_used), 0) as average_coupons_per_user
FROM users;

CREATE OR REPLACE VIEW channel_stats_view AS
SELECT 
    COUNT(*) as total_channels,
    COUNT(*) FILTER (WHERE status = 'active') as active_channels,
    COUNT(*) FILTER (WHERE status = 'suspended') as suspended_channels,
    COUNT(*) FILTER (WHERE status = 'deleted') as deleted_channels
FROM channel_management;

CREATE OR REPLACE VIEW user_activity_summary_view AS
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.username,
    u.telegram_id,
    u.is_active,
    u.is_banned,
    u.registered_at,
    u.last_active_at,
    u.total_spent,
    u.coupons_used,
    cm.status as channel_status,
    cm.channel_id,
    CASE 
        WHEN u.last_active_at >= CURRENT_DATE - INTERVAL '1 day' THEN 'high'
        WHEN u.last_active_at >= CURRENT_DATE - INTERVAL '7 days' THEN 'medium'
        WHEN u.last_active_at >= CURRENT_DATE - INTERVAL '30 days' THEN 'low'
        ELSE 'inactive'
    END as activity_level
FROM users u
LEFT JOIN channel_management cm ON u.id = cm.user_id;

-- Insert default group moderation settings
INSERT INTO group_moderation_settings (id, group_id) VALUES 
('default-group-settings', 'main-group')
ON CONFLICT (group_id) DO NOTHING;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
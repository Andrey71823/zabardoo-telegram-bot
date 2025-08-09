-- Create database schema for Zabardoo Telegram Bot

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with personal channels
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255),
    language_code VARCHAR(10) DEFAULT 'en',
    personal_channel_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    churn_risk DECIMAL(3,2) DEFAULT 0.00,
    lifetime_value DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true
);

-- Personal channels table
CREATE TABLE personal_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_message_at TIMESTAMP WITH TIME ZONE,
    engagement_score DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indian stores table
CREATE TABLE indian_stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    is_popular BOOLEAN DEFAULT false,
    average_commission DECIMAL(5,2) DEFAULT 0.00,
    conversion_rate DECIMAL(5,4) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Coupons table
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    store_id UUID REFERENCES indian_stores(id),
    category VARCHAR(100) NOT NULL,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed', 'offer', 'cashback')),
    discount_value DECIMAL(10,2),
    coupon_code VARCHAR(100),
    site_page_url TEXT NOT NULL,
    direct_store_url TEXT,
    is_text_coupon BOOLEAN DEFAULT true,
    expiry_date TIMESTAMP WITH TIME ZONE,
    is_popular_in_india BOOLEAN DEFAULT false,
    created_in_group BOOLEAN DEFAULT false,
    creator_user_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Traffic events table for tracking clicks and conversions
CREATE TABLE traffic_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    coupon_id UUID NOT NULL REFERENCES coupons(id),
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('personal_channel', 'group', 'ai_recommendation')),
    source_channel_id VARCHAR(255),
    source_message_id VARCHAR(255),
    click_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    conversion_timestamp TIMESTAMP WITH TIME ZONE,
    order_value DECIMAL(10,2),
    commission DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'clicked' CHECK (status IN ('clicked', 'converted', 'abandoned')),
    user_agent TEXT,
    redirect_url TEXT
);

-- Purchase history table
CREATE TABLE purchase_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    coupon_id UUID REFERENCES coupons(id),
    traffic_event_id UUID REFERENCES traffic_events(id),
    order_id VARCHAR(255),
    order_value DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    commission DECIMAL(10,2),
    cashback_amount DECIMAL(10,2),
    purchase_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);

-- Cashback transactions table
CREATE TABLE cashback_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    purchase_id UUID REFERENCES purchase_history(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
    transaction_type VARCHAR(20) DEFAULT 'earning' CHECK (transaction_type IN ('earning', 'withdrawal')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Withdrawal requests table
CREATE TABLE withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('UPI', 'PayTM', 'PhonePe', 'GooglePay', 'NetBanking')),
    payment_details JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT
);

-- User preferences table
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_categories TEXT[] DEFAULT '{}',
    preferred_stores UUID[] DEFAULT '{}',
    payment_methods TEXT[] DEFAULT '{}',
    price_range_min DECIMAL(10,2) DEFAULT 0,
    price_range_max DECIMAL(10,2),
    notification_timing JSONB DEFAULT '{"hours": [9, 12, 18, 21], "timezone": "Asia/Kolkata"}',
    region VARCHAR(20) DEFAULT 'North' CHECK (region IN ('North', 'South', 'East', 'West', 'Central', 'Northeast')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Group interactions table
CREATE TABLE group_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    group_id VARCHAR(255) NOT NULL,
    message_id VARCHAR(255),
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('message', 'coupon_creation', 'moderation', 'reaction')),
    content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Retention metrics table
CREATE TABLE retention_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    days_since_last_purchase INTEGER DEFAULT 0,
    total_purchases INTEGER DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0.00,
    engagement_trend VARCHAR(10) DEFAULT 'stable' CHECK (engagement_trend IN ('up', 'stable', 'down')),
    next_best_action VARCHAR(100),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Groups table for managing Telegram groups
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_group_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    member_count INTEGER DEFAULT 0,
    moderation_level VARCHAR(20) DEFAULT 'medium' CHECK (moderation_level IN ('low', 'medium', 'high')),
    allow_coupon_creation BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Group messages table for tracking all messages in groups
CREATE TABLE group_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    message_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'coupon', 'media', 'link', 'spam')),
    is_moderated BOOLEAN DEFAULT false,
    moderation_action VARCHAR(20) CHECK (moderation_action IN ('approved', 'deleted', 'warned', 'banned')),
    moderation_reason TEXT,
    moderator_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    moderated_at TIMESTAMP WITH TIME ZONE
);

-- Group members table for tracking membership and roles
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'muted', 'banned')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    warning_count INTEGER DEFAULT 0,
    contribution_score DECIMAL(10,2) DEFAULT 0.00,
    UNIQUE(group_id, user_id)
);

-- Moderation rules table for automated moderation
CREATE TABLE moderation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('spam_detection', 'link_filter', 'keyword_filter', 'rate_limit', 'duplicate_content')),
    is_active BOOLEAN DEFAULT true,
    parameters JSONB DEFAULT '{}',
    action VARCHAR(20) DEFAULT 'warn' CHECK (action IN ('warn', 'delete', 'mute', 'ban')),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Coupon creation requests table for group-generated coupons
CREATE TABLE coupon_creation_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id),
    user_id UUID NOT NULL REFERENCES users(id),
    message_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    store VARCHAR(255),
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed', 'offer')),
    discount_value DECIMAL(10,2),
    coupon_code VARCHAR(100),
    link TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
    moderator_id UUID REFERENCES users(id),
    moderation_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    moderated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_personal_channel_id ON users(personal_channel_id);
CREATE INDEX idx_users_last_active ON users(last_active_at);
CREATE INDEX idx_personal_channels_user_id ON personal_channels(user_id);
CREATE INDEX idx_personal_channels_channel_id ON personal_channels(channel_id);
CREATE INDEX idx_coupons_store_id ON coupons(store_id);
CREATE INDEX idx_coupons_category ON coupons(category);
CREATE INDEX idx_coupons_is_active ON coupons(is_active);
CREATE INDEX idx_traffic_events_user_id ON traffic_events(user_id);
CREATE INDEX idx_traffic_events_coupon_id ON traffic_events(coupon_id);
CREATE INDEX idx_traffic_events_timestamp ON traffic_events(click_timestamp);
CREATE INDEX idx_purchase_history_user_id ON purchase_history(user_id);
CREATE INDEX idx_purchase_history_timestamp ON purchase_history(purchase_timestamp);
CREATE INDEX idx_cashback_transactions_user_id ON cashback_transactions(user_id);
CREATE INDEX idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_group_interactions_user_id ON group_interactions(user_id);
CREATE INDEX idx_retention_metrics_user_id ON retention_metrics(user_id);

-- Content sync rules table
CREATE TABLE content_sync_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('group', 'channel', 'external')),
    source_id VARCHAR(255) NOT NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('personal_channels', 'group', 'channel')),
    target_filters JSONB DEFAULT '{}',
    content_filters JSONB DEFAULT '{}',
    sync_timing JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Content sync jobs table
CREATE TABLE content_sync_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES content_sync_rules(id) ON DELETE CASCADE,
    source_content JSONB NOT NULL,
    target_channels JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    results JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Popular content table
CREATE TABLE popular_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id VARCHAR(255) NOT NULL,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('group', 'channel')),
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('coupon', 'text', 'media')),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    popularity_score DECIMAL(5,2) DEFAULT 0.00,
    engagement_metrics JSONB DEFAULT '{}',
    sync_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(source_id, source_type)
);

-- User content preferences table
CREATE TABLE user_content_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_categories JSONB DEFAULT '[]',
    preferred_stores JSONB DEFAULT '[]',
    excluded_categories JSONB DEFAULT '[]',
    excluded_stores JSONB DEFAULT '[]',
    max_messages_per_day INTEGER DEFAULT 10,
    preferred_times JSONB DEFAULT '[9, 12, 18, 21]',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    content_types JSONB DEFAULT '["coupon", "text"]',
    min_discount_threshold DECIMAL(5,2),
    only_popular_content BOOLEAN DEFAULT false,
    personalized_recommendations BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Group-related indexes
CREATE INDEX idx_groups_telegram_id ON groups(telegram_group_id);
CREATE INDEX idx_groups_is_active ON groups(is_active);
CREATE INDEX idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX idx_group_messages_user_id ON group_messages(user_id);
CREATE INDEX idx_group_messages_created_at ON group_messages(created_at);
CREATE INDEX idx_group_messages_is_moderated ON group_messages(is_moderated);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_status ON group_members(status);
CREATE INDEX idx_moderation_rules_group_id ON moderation_rules(group_id);
CREATE INDEX idx_moderation_rules_is_active ON moderation_rules(is_active);
CREATE INDEX idx_coupon_requests_group_id ON coupon_creation_requests(group_id);
CREATE INDEX idx_coupon_requests_status ON coupon_creation_requests(status);
CREATE INDEX idx_coupon_requests_created_at ON coupon_creation_requests(created_at);

-- AI conversations table
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI messages table
CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    message_type VARCHAR(30) DEFAULT 'text' CHECK (message_type IN ('text', 'coupon_recommendation', 'product_inquiry', 'support', 'greeting')),
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI prompt templates table
CREATE TABLE ai_prompt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('greeting', 'coupon_recommendation', 'product_inquiry', 'support', 'general')),
    template TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Coupon recommendations table
CREATE TABLE coupon_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coupon_id UUID NOT NULL REFERENCES coupons(id),
    recommendation_reason TEXT NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.50,
    personalized_message TEXT,
    metadata JSONB DEFAULT '{}',
    was_accepted BOOLEAN,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Content sync indexes
CREATE INDEX idx_content_sync_rules_source ON content_sync_rules(source_type, source_id);
CREATE INDEX idx_content_sync_rules_active ON content_sync_rules(is_active);
CREATE INDEX idx_content_sync_rules_priority ON content_sync_rules(priority DESC);
CREATE INDEX idx_content_sync_jobs_rule_id ON content_sync_jobs(rule_id);
CREATE INDEX idx_content_sync_jobs_status ON content_sync_jobs(status);
CREATE INDEX idx_content_sync_jobs_scheduled ON content_sync_jobs(scheduled_at);
CREATE INDEX idx_popular_content_source ON popular_content(source_id, source_type);
CREATE INDEX idx_popular_content_score ON popular_content(popularity_score DESC);
CREATE INDEX idx_popular_content_type ON popular_content(content_type);
CREATE INDEX idx_user_content_prefs_user_id ON user_content_preferences(user_id);

-- AI-related indexes
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_status ON ai_conversations(status);
CREATE INDEX idx_ai_conversations_updated ON ai_conversations(updated_at DESC);
CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_timestamp ON ai_messages(timestamp DESC);
CREATE INDEX idx_ai_messages_role ON ai_messages(role);
CREATE INDEX idx_ai_prompt_templates_category ON ai_prompt_templates(category);
CREATE INDEX idx_ai_prompt_templates_active ON ai_prompt_templates(is_active);
CREATE INDEX idx_coupon_recommendations_user_id ON coupon_recommendations(user_id);
CREATE INDEX idx_coupon_recommendations_coupon_id ON coupon_recommendations(coupon_id);
CREATE INDEX idx_coupon_recommendations_created ON coupon_recommendations(created_at DESC);

-- Recommendation System Tables

-- User profiles for personalized recommendations
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    demographics JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    behavior JSONB DEFAULT '{}',
    engagement JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Recommendation engines configuration
CREATE TABLE recommendation_engines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('content_based', 'collaborative', 'hybrid', 'trending')),
    configuration JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recommendation requests tracking
CREATE TABLE recommendation_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    context JSONB DEFAULT '{}',
    filters JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recommendation results storage
CREATE TABLE recommendation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES recommendation_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    recommendations JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User similarity matrix for collaborative filtering
CREATE TABLE user_similarity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_id_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    similarity_score DECIMAL(5,4) NOT NULL,
    common_preferences JSONB DEFAULT '[]',
    interaction_overlap DECIMAL(5,4) DEFAULT 0.0000,
    demographic_similarity DECIMAL(5,4) DEFAULT 0.0000,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id_1, user_id_2),
    CHECK (user_id_1 != user_id_2)
);

-- Coupon features for content-based filtering
CREATE TABLE coupon_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    features JSONB NOT NULL,
    embedding DECIMAL(10,8)[] DEFAULT '{}',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(coupon_id)
);

-- Recommendation feedback for learning
CREATE TABLE recommendation_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    coupon_id UUID NOT NULL REFERENCES coupons(id),
    recommendation_id UUID REFERENCES recommendation_results(id),
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('like', 'dislike', 'click', 'purchase', 'view', 'share')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    implicit_feedback JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recommendation performance metrics
CREATE TABLE recommendation_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engine_id UUID NOT NULL REFERENCES recommendation_engines(id),
    date DATE NOT NULL,
    metrics JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(engine_id, date)
);

-- A/B testing experiments for recommendations
CREATE TABLE ab_test_experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    control_engine_id UUID NOT NULL REFERENCES recommendation_engines(id),
    test_engine_id UUID NOT NULL REFERENCES recommendation_engines(id),
    traffic_split DECIMAL(3,2) DEFAULT 0.50,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    results JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User experiment assignments
CREATE TABLE user_experiment_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    experiment_id UUID NOT NULL REFERENCES ab_test_experiments(id) ON DELETE CASCADE,
    variant VARCHAR(20) NOT NULL CHECK (variant IN ('control', 'test')),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, experiment_id)
);

-- Recommendation system indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_updated ON user_profiles(updated_at DESC);
CREATE INDEX idx_recommendation_engines_type ON recommendation_engines(type);
CREATE INDEX idx_recommendation_engines_active ON recommendation_engines(is_active);
CREATE INDEX idx_recommendation_engines_priority ON recommendation_engines(priority DESC);
CREATE INDEX idx_recommendation_requests_user_id ON recommendation_requests(user_id);
CREATE INDEX idx_recommendation_requests_timestamp ON recommendation_requests(timestamp DESC);
CREATE INDEX idx_recommendation_results_request_id ON recommendation_results(request_id);
CREATE INDEX idx_recommendation_results_user_id ON recommendation_results(user_id);
CREATE INDEX idx_recommendation_results_created ON recommendation_results(created_at DESC);
CREATE INDEX idx_user_similarity_user1 ON user_similarity(user_id_1);
CREATE INDEX idx_user_similarity_user2 ON user_similarity(user_id_2);
CREATE INDEX idx_user_similarity_score ON user_similarity(similarity_score DESC);
CREATE INDEX idx_user_similarity_calculated ON user_similarity(calculated_at DESC);
CREATE INDEX idx_coupon_features_coupon_id ON coupon_features(coupon_id);
CREATE INDEX idx_coupon_features_updated ON coupon_features(last_updated DESC);
CREATE INDEX idx_recommendation_feedback_user_id ON recommendation_feedback(user_id);
CREATE INDEX idx_recommendation_feedback_coupon_id ON recommendation_feedback(coupon_id);
CREATE INDEX idx_recommendation_feedback_type ON recommendation_feedback(feedback_type);
CREATE INDEX idx_recommendation_feedback_timestamp ON recommendation_feedback(timestamp DESC);
CREATE INDEX idx_recommendation_metrics_engine_id ON recommendation_metrics(engine_id);
CREATE INDEX idx_recommendation_metrics_date ON recommendation_metrics(date DESC);
CREATE INDEX idx_ab_test_experiments_status ON ab_test_experiments(status);
CREATE INDEX idx_ab_test_experiments_dates ON ab_test_experiments(start_date, end_date);
CREATE INDEX idx_user_experiment_assignments_user_id ON user_experiment_assignments(user_id);
CREATE INDEX idx_user_experiment_assignments_experiment_id ON user_experiment_assignments(experiment_id);

-- Proactive Notification System Tables

-- Notification triggers for behavioral and temporal patterns
CREATE TABLE notification_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('behavioral', 'temporal', 'contextual', 'promotional')),
    conditions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notification templates for different channels and content types
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_id UUID NOT NULL REFERENCES notification_triggers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('telegram', 'push', 'email', 'sms')),
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('text', 'rich_media', 'interactive')),
    content JSONB NOT NULL,
    localization JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Proactive notifications sent to users
CREATE TABLE proactive_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trigger_id UUID NOT NULL REFERENCES notification_triggers(id),
    template_id UUID NOT NULL REFERENCES notification_templates(id),
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'delivered', 'failed', 'cancelled')),
    personalized_content JSONB DEFAULT '{}',
    scheduling JSONB DEFAULT '{}',
    targeting JSONB DEFAULT '{}',
    tracking JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User notification preferences and settings
CREATE TABLE user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channels JSONB DEFAULT '{}',
    categories JSONB DEFAULT '{}',
    frequency JSONB DEFAULT '{}',
    personalization JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Smart timing data for optimal notification delivery
CREATE TABLE smart_timing (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL,
    optimal_hours JSONB DEFAULT '[]',
    engagement_patterns JSONB DEFAULT '{}',
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confidence_score DECIMAL(3,2) DEFAULT 0.50,
    PRIMARY KEY(user_id, channel)
);

-- Notification queue for processing
CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id UUID NOT NULL REFERENCES proactive_notifications(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 1,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notification analytics and performance metrics
CREATE TABLE notification_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    campaign_id UUID,
    trigger_id UUID REFERENCES notification_triggers(id),
    metrics JSONB NOT NULL,
    segmentation JSONB DEFAULT '{}',
    revenue_impact JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notification campaigns for bulk messaging
CREATE TABLE notification_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('one_time', 'recurring', 'triggered', 'drip')),
    target_audience JSONB DEFAULT '{}',
    content JSONB DEFAULT '{}',
    scheduling JSONB DEFAULT '{}',
    performance JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Proactive notification system indexes
CREATE INDEX idx_notification_triggers_type ON notification_triggers(type);
CREATE INDEX idx_notification_triggers_active ON notification_triggers(is_active);
CREATE INDEX idx_notification_triggers_priority ON notification_triggers(priority DESC);
CREATE INDEX idx_notification_templates_trigger_id ON notification_templates(trigger_id);
CREATE INDEX idx_notification_templates_channel ON notification_templates(channel);
CREATE INDEX idx_notification_templates_active ON notification_templates(is_active);
CREATE INDEX idx_proactive_notifications_user_id ON proactive_notifications(user_id);
CREATE INDEX idx_proactive_notifications_status ON proactive_notifications(status);
CREATE INDEX idx_proactive_notifications_trigger_id ON proactive_notifications(trigger_id);
CREATE INDEX idx_proactive_notifications_created ON proactive_notifications(created_at DESC);
CREATE INDEX idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);
CREATE INDEX idx_smart_timing_user_channel ON smart_timing(user_id, channel);
CREATE INDEX idx_smart_timing_calculated ON smart_timing(last_calculated DESC);
CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_at);
CREATE INDEX idx_notification_queue_priority ON notification_queue(priority DESC);
CREATE INDEX idx_notification_analytics_date ON notification_analytics(date DESC);
CREATE INDEX idx_notification_analytics_trigger_id ON notification_analytics(trigger_id);
CREATE INDEX idx_notification_campaigns_status ON notification_campaigns(status);
CREATE INDEX idx_notification_campaigns_type ON notification_campaigns(campaign_type);
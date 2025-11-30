-- Создание таблицы для событий кликов
CREATE TABLE IF NOT EXISTS click_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    click_id VARCHAR(100) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    telegram_user_id VARCHAR(50) NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    affiliate_link_id UUID,
    coupon_id UUID,
    store_id UUID NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    original_url TEXT NOT NULL,
    destination_url TEXT NOT NULL,
    source VARCHAR(50) NOT NULL CHECK (source IN ('personal_channel', 'group', 'ai_recommendation', 'search', 'notification')),
    source_details JSONB DEFAULT '{}',
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    device_info JSONB DEFAULT '{}',
    geo_location JSONB DEFAULT '{}',
    utm_params JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    clicked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создание таблицы для сессий кликов
CREATE TABLE IF NOT EXISTS click_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    telegram_user_id VARCHAR(50) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- в секундах
    click_count INTEGER DEFAULT 0,
    unique_links_clicked INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.0,
    total_commission DECIMAL(12,2) DEFAULT 0.0,
    device_info JSONB DEFAULT '{}',
    geo_location JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создание таблицы для источников трафика
CREATE TABLE IF NOT EXISTS traffic_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('personal_channel', 'group', 'ai_recommendation', 'search', 'notification', 'external')),
    description TEXT,
    source_id VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER DEFAULT 999,
    tracking_enabled BOOLEAN NOT NULL DEFAULT true,
    custom_params JSONB DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создание таблицы для событий конверсии
CREATE TABLE IF NOT EXISTS conversion_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    click_id VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL,
    telegram_user_id VARCHAR(50) NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    journey_id VARCHAR(100),
    order_id VARCHAR(255) NOT NULL,
    store_id UUID NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    order_value DECIMAL(12,2) NOT NULL,
    commission DECIMAL(12,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    products JSONB DEFAULT '[]',
    conversion_type VARCHAR(20) NOT NULL CHECK (conversion_type IN ('purchase', 'signup', 'subscription', 'lead')),
    attribution_model VARCHAR(20) NOT NULL CHECK (attribution_model IN ('first_click', 'last_click', 'linear', 'time_decay', 'position_based')),
    attribution_data JSONB DEFAULT '{}',
    payment_method VARCHAR(50),
    discount_applied DECIMAL(10,2) DEFAULT 0.0,
    coupon_used VARCHAR(100),
    conversion_time TIMESTAMP WITH TIME ZONE NOT NULL,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создание таблицы для аналитики кликов (агрегированные данные)
CREATE TABLE IF NOT EXISTS click_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(255),
    store_id UUID,
    total_clicks INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    returning_users INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0.0,
    average_session_duration INTEGER DEFAULT 0, -- в секундах
    top_devices JSONB DEFAULT '{}',
    top_locations JSONB DEFAULT '{}',
    top_referrers JSONB DEFAULT '{}',
    conversion_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(date, hour, source_type, source_id, store_id)
);

-- Создание таблицы для пользовательских путешествий
CREATE TABLE IF NOT EXISTS user_journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    telegram_user_id VARCHAR(50) NOT NULL,
    journey_id VARCHAR(100) NOT NULL UNIQUE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    total_duration INTEGER, -- в секундах
    journey_stage VARCHAR(20) DEFAULT 'awareness' CHECK (journey_stage IN ('awareness', 'consideration', 'purchase', 'retention')),
    is_completed BOOLEAN NOT NULL DEFAULT false,
    conversion_event_id UUID REFERENCES conversion_events(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создание таблицы для точек касания в пользовательском путешествии
CREATE TABLE IF NOT EXISTS touchpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id VARCHAR(100) NOT NULL,
    sequence INTEGER NOT NULL,
    touchpoint_type VARCHAR(20) NOT NULL CHECK (touchpoint_type IN ('click', 'view', 'interaction', 'conversion')),
    source VARCHAR(50) NOT NULL,
    source_details JSONB DEFAULT '{}',
    content TEXT,
    duration INTEGER, -- в секундах
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (journey_id) REFERENCES user_journeys(journey_id) ON DELETE CASCADE
);

-- Создание таблицы для конфигурации отслеживания
CREATE TABLE IF NOT EXISTS click_tracking_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    tracking_domains TEXT[] DEFAULT '{}',
    excluded_domains TEXT[] DEFAULT '{}',
    session_timeout INTEGER DEFAULT 30, -- в минутах
    enable_geo_tracking BOOLEAN DEFAULT true,
    enable_device_tracking BOOLEAN DEFAULT true,
    enable_utm_tracking BOOLEAN DEFAULT true,
    enable_journey_tracking BOOLEAN DEFAULT true,
    data_retention_days INTEGER DEFAULT 365,
    privacy_settings JSONB DEFAULT '{}',
    webhook_urls TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_click_events_click_id ON click_events(click_id);
CREATE INDEX IF NOT EXISTS idx_click_events_user_id ON click_events(user_id);
CREATE INDEX IF NOT EXISTS idx_click_events_session_id ON click_events(session_id);
CREATE INDEX IF NOT EXISTS idx_click_events_store_id ON click_events(store_id);
CREATE INDEX IF NOT EXISTS idx_click_events_source ON click_events(source);
CREATE INDEX IF NOT EXISTS idx_click_events_clicked_at ON click_events(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_click_events_source_details ON click_events USING GIN(source_details);

CREATE INDEX IF NOT EXISTS idx_click_sessions_session_id ON click_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_click_sessions_user_id ON click_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_click_sessions_active ON click_sessions(is_active, last_activity_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_click_sessions_started_at ON click_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_traffic_sources_source_id ON traffic_sources(source_id);
CREATE INDEX IF NOT EXISTS idx_traffic_sources_type ON traffic_sources(type);
CREATE INDEX IF NOT EXISTS idx_traffic_sources_active ON traffic_sources(is_active, priority) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_conversion_events_click_id ON conversion_events(click_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_user_id ON conversion_events(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_order_id ON conversion_events(order_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_store_id ON conversion_events(store_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_conversion_time ON conversion_events(conversion_time DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_events_status ON conversion_events(processing_status);

CREATE INDEX IF NOT EXISTS idx_click_analytics_date ON click_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_click_analytics_source ON click_analytics(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_click_analytics_store ON click_analytics(store_id);

CREATE INDEX IF NOT EXISTS idx_user_journeys_user_id ON user_journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_journeys_journey_id ON user_journeys(journey_id);
CREATE INDEX IF NOT EXISTS idx_user_journeys_started_at ON user_journeys(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_journeys_completed ON user_journeys(is_completed);

CREATE INDEX IF NOT EXISTS idx_touchpoints_journey_id ON touchpoints(journey_id);
CREATE INDEX IF NOT EXISTS idx_touchpoints_sequence ON touchpoints(journey_id, sequence);
CREATE INDEX IF NOT EXISTS idx_touchpoints_timestamp ON touchpoints(timestamp DESC);

-- Создание триггеров для автоматического обновления updated_at
CREATE TRIGGER update_click_sessions_updated_at 
    BEFORE UPDATE ON click_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_traffic_sources_updated_at 
    BEFORE UPDATE ON traffic_sources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversion_events_updated_at 
    BEFORE UPDATE ON conversion_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_click_analytics_updated_at 
    BEFORE UPDATE ON click_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_journeys_updated_at 
    BEFORE UPDATE ON user_journeys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_click_tracking_config_updated_at 
    BEFORE UPDATE ON click_tracking_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Вставка базовой конфигурации отслеживания
INSERT INTO click_tracking_config (
    name, is_enabled, tracking_domains, session_timeout, 
    enable_geo_tracking, enable_device_tracking, enable_utm_tracking,
    data_retention_days, privacy_settings
) VALUES (
    'Default Tracking Config',
    true,
    ARRAY['bazaarGuru.com', 'flipkart.com', 'amazon.in', 'myntra.com', 'nykaa.com'],
    30,
    true,
    true,
    true,
    365,
    '{"anonymizeIp": true, "respectDoNotTrack": true, "gdprCompliant": true}'::jsonb
) ON CONFLICT (name) DO NOTHING;

-- Создание функции для получения статистики трафика
CREATE OR REPLACE FUNCTION get_traffic_stats(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_clicks BIGINT,
    unique_users BIGINT,
    total_sessions BIGINT,
    total_conversions BIGINT,
    conversion_rate NUMERIC,
    total_revenue NUMERIC,
    total_commission NUMERIC,
    avg_order_value NUMERIC,
    avg_session_duration NUMERIC,
    top_sources JSONB,
    top_stores JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM click_events WHERE clicked_at::date BETWEEN start_date AND end_date) as total_clicks,
        (SELECT COUNT(DISTINCT user_id) FROM click_events WHERE clicked_at::date BETWEEN start_date AND end_date) as unique_users,
        (SELECT COUNT(*) FROM click_sessions WHERE started_at::date BETWEEN start_date AND end_date) as total_sessions,
        (SELECT COUNT(*) FROM conversion_events WHERE conversion_time::date BETWEEN start_date AND end_date) as total_conversions,
        (SELECT 
            CASE 
                WHEN COUNT(ce.id) > 0 THEN ROUND((COUNT(conv.id)::decimal / COUNT(ce.id)) * 100, 2)
                ELSE 0 
            END
         FROM click_events ce
         LEFT JOIN conversion_events conv ON ce.click_id = conv.click_id
         WHERE ce.clicked_at::date BETWEEN start_date AND end_date) as conversion_rate,
        (SELECT COALESCE(SUM(order_value), 0) FROM conversion_events WHERE conversion_time::date BETWEEN start_date AND end_date) as total_revenue,
        (SELECT COALESCE(SUM(commission), 0) FROM conversion_events WHERE conversion_time::date BETWEEN start_date AND end_date) as total_commission,
        (SELECT 
            CASE 
                WHEN COUNT(*) > 0 THEN ROUND(AVG(order_value), 2)
                ELSE 0 
            END
         FROM conversion_events WHERE conversion_time::date BETWEEN start_date AND end_date) as avg_order_value,
        (SELECT 
            CASE 
                WHEN COUNT(*) > 0 THEN ROUND(AVG(duration), 2)
                ELSE 0 
            END
         FROM click_sessions WHERE started_at::date BETWEEN start_date AND end_date AND duration IS NOT NULL) as avg_session_duration,
        (SELECT jsonb_agg(jsonb_build_object('source', source, 'clicks', click_count))
         FROM (
             SELECT source, COUNT(*) as click_count
             FROM click_events 
             WHERE clicked_at::date BETWEEN start_date AND end_date
             GROUP BY source
             ORDER BY click_count DESC
             LIMIT 5
         ) top_sources_data) as top_sources,
        (SELECT jsonb_agg(jsonb_build_object('store', store_name, 'clicks', click_count))
         FROM (
             SELECT store_name, COUNT(*) as click_count
             FROM click_events 
             WHERE clicked_at::date BETWEEN start_date AND end_date
             GROUP BY store_name
             ORDER BY click_count DESC
             LIMIT 5
         ) top_stores_data) as top_stores;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для агрегации аналитики кликов
CREATE OR REPLACE FUNCTION aggregate_click_analytics(target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS void AS $$
BEGIN
    INSERT INTO click_analytics (
        date, hour, source_type, source_id, store_id,
        total_clicks, unique_users, new_users, returning_users
    )
    SELECT 
        target_date,
        EXTRACT(HOUR FROM clicked_at) as hour,
        source as source_type,
        COALESCE(source_details->>'channelId', source_details->>'groupId', source) as source_id,
        store_id,
        COUNT(*) as total_clicks,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT CASE 
            WHEN NOT EXISTS (
                SELECT 1 FROM click_events ce2 
                WHERE ce2.user_id = click_events.user_id 
                AND ce2.clicked_at::date < target_date
            ) THEN user_id 
        END) as new_users,
        COUNT(DISTINCT CASE 
            WHEN EXISTS (
                SELECT 1 FROM click_events ce2 
                WHERE ce2.user_id = click_events.user_id 
                AND ce2.clicked_at::date < target_date
            ) THEN user_id 
        END) as returning_users
    FROM click_events
    WHERE clicked_at::date = target_date
    GROUP BY target_date, EXTRACT(HOUR FROM clicked_at), source, 
             COALESCE(source_details->>'channelId', source_details->>'groupId', source), store_id
    ON CONFLICT (date, hour, source_type, source_id, store_id) DO UPDATE SET
        total_clicks = EXCLUDED.total_clicks,
        unique_users = EXCLUDED.unique_users,
        new_users = EXCLUDED.new_users,
        returning_users = EXCLUDED.returning_users,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Создание функции для очистки старых данных
CREATE OR REPLACE FUNCTION cleanup_old_traffic_data()
RETURNS void AS $$
BEGIN
    -- Удаляем старые события кликов (старше года)
    DELETE FROM click_events 
    WHERE clicked_at < NOW() - INTERVAL '1 year';
    
    -- Удаляем старые сессии (старше года)
    DELETE FROM click_sessions 
    WHERE started_at < NOW() - INTERVAL '1 year';
    
    -- Удаляем старые события конверсии (старше 2 лет)
    DELETE FROM conversion_events 
    WHERE conversion_time < NOW() - INTERVAL '2 years';
    
    -- Удаляем старую аналитику (старше 2 лет)
    DELETE FROM click_analytics 
    WHERE date < CURRENT_DATE - INTERVAL '2 years';
    
    -- Удаляем старые пользовательские путешествия (старше года)
    DELETE FROM user_journeys 
    WHERE started_at < NOW() - INTERVAL '1 year';
    
    -- Обновляем статистику таблиц
    ANALYZE click_events;
    ANALYZE click_sessions;
    ANALYZE conversion_events;
    ANALYZE click_analytics;
    ANALYZE user_journeys;
END;
$$ LANGUAGE plpgsql;
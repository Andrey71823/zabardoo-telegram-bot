-- Создание таблицы для магазинов-партнеров
CREATE TABLE IF NOT EXISTS affiliate_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL UNIQUE,
    affiliate_network VARCHAR(100) NOT NULL,
    tracking_template TEXT NOT NULL,
    sub_id_parameter VARCHAR(50) NOT NULL DEFAULT 'subid',
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    cookie_duration INTEGER NOT NULL DEFAULT 30, -- в днях
    is_active BOOLEAN NOT NULL DEFAULT true,
    supported_countries JSONB DEFAULT '["IN"]',
    link_formats JSONB DEFAULT '{}',
    custom_parameters JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создание таблицы для аффилейтских ссылок
CREATE TABLE IF NOT EXISTS affiliate_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_url TEXT NOT NULL,
    affiliate_url TEXT NOT NULL,
    short_url TEXT,
    telegram_sub_id VARCHAR(100) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    coupon_id UUID,
    store_id UUID NOT NULL REFERENCES affiliate_stores(id),
    store_name VARCHAR(255) NOT NULL,
    link_type VARCHAR(20) NOT NULL CHECK (link_type IN ('coupon', 'offer', 'direct')),
    source VARCHAR(50) NOT NULL CHECK (source IN ('personal_channel', 'group', 'ai_recommendation', 'search')),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создание таблицы для отслеживания кликов
CREATE TABLE IF NOT EXISTS link_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_link_id UUID NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    telegram_sub_id VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    session_id VARCHAR(100),
    device_info JSONB DEFAULT '{}',
    conversion_data JSONB DEFAULT '{}'
);

-- Создание таблицы для маппинга SubID
CREATE TABLE IF NOT EXISTS sub_id_mappings (
    telegram_sub_id VARCHAR(100) PRIMARY KEY,
    user_id UUID NOT NULL,
    channel_id VARCHAR(100),
    source VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Создание таблицы для атрибуции трафика
CREATE TABLE IF NOT EXISTS traffic_attribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_sub_id VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL,
    affiliate_link_id UUID NOT NULL REFERENCES affiliate_links(id),
    click_id UUID NOT NULL REFERENCES link_clicks(id),
    source VARCHAR(50) NOT NULL,
    medium VARCHAR(50) NOT NULL,
    campaign VARCHAR(100),
    content VARCHAR(100),
    term VARCHAR(100),
    first_click TIMESTAMP WITH TIME ZONE NOT NULL,
    last_click TIMESTAMP WITH TIME ZONE NOT NULL,
    click_count INTEGER NOT NULL DEFAULT 1,
    conversion_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_affiliate_stores_domain ON affiliate_stores(domain);
CREATE INDEX IF NOT EXISTS idx_affiliate_stores_active ON affiliate_stores(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_affiliate_links_sub_id ON affiliate_links(telegram_sub_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_user_id ON affiliate_links(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_store_id ON affiliate_links(store_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_active ON affiliate_links(is_active, expires_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_affiliate_links_created ON affiliate_links(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_link_clicks_affiliate_link ON link_clicks(affiliate_link_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_user_id ON link_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_sub_id ON link_clicks(telegram_sub_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON link_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_link_clicks_conversion ON link_clicks((conversion_data->>'converted')) WHERE conversion_data->>'converted' = 'true';

CREATE INDEX IF NOT EXISTS idx_sub_id_mappings_user_id ON sub_id_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_id_mappings_active ON sub_id_mappings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sub_id_mappings_last_used ON sub_id_mappings(last_used_at DESC);

CREATE INDEX IF NOT EXISTS idx_traffic_attribution_sub_id ON traffic_attribution(telegram_sub_id);
CREATE INDEX IF NOT EXISTS idx_traffic_attribution_user_id ON traffic_attribution(user_id);
CREATE INDEX IF NOT EXISTS idx_traffic_attribution_link_id ON traffic_attribution(affiliate_link_id);
CREATE INDEX IF NOT EXISTS idx_traffic_attribution_last_click ON traffic_attribution(last_click DESC);

-- Создание триггеров для автоматического обновления updated_at
CREATE TRIGGER update_affiliate_stores_updated_at 
    BEFORE UPDATE ON affiliate_stores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_links_updated_at 
    BEFORE UPDATE ON affiliate_links 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_traffic_attribution_updated_at 
    BEFORE UPDATE ON traffic_attribution 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Вставка примеров магазинов-партнеров
INSERT INTO affiliate_stores (name, domain, affiliate_network, tracking_template, sub_id_parameter, commission_rate, cookie_duration, supported_countries, link_formats, custom_parameters) VALUES
('Flipkart', 'flipkart.com', 'Commission Junction', 'https://www.flipkart.com/affiliate-link?url={original_url}&subid={sub_id}', 'subid', 3.50, 30, '["IN"]', 
 '{"coupon": "https://www.flipkart.com/coupon/{coupon_id}?subid={sub_id}", "offer": "https://www.flipkart.com/offer/{offer_id}?subid={sub_id}", "direct": "{original_url}?subid={sub_id}"}',
 '{"affid": "bazaarGuru", "source": "telegram"}'),

('Amazon India', 'amazon.in', 'Amazon Associates', 'https://www.amazon.in/gp/product/{product_id}?tag=bazaarGuru-21&linkCode=as2&subid={sub_id}', 'subid', 4.00, 24, '["IN"]',
 '{"coupon": "https://www.amazon.in/coupon/{coupon_id}?tag=bazaarGuru-21&subid={sub_id}", "offer": "https://www.amazon.in/deal/{deal_id}?tag=bazaarGuru-21&subid={sub_id}", "direct": "{original_url}?tag=bazaarGuru-21&subid={sub_id}"}',
 '{"tag": "bazaarGuru-21", "linkCode": "as2"}'),

('Myntra', 'myntra.com', 'Myntra Affiliate', 'https://www.myntra.com/affiliate?url={original_url}&partner=bazaarGuru&subid={sub_id}', 'subid', 5.50, 15, '["IN"]',
 '{"coupon": "https://www.myntra.com/coupon/{coupon_id}?partner=bazaarGuru&subid={sub_id}", "offer": "https://www.myntra.com/offer/{offer_id}?partner=bazaarGuru&subid={sub_id}", "direct": "{original_url}?partner=bazaarGuru&subid={sub_id}"}',
 '{"partner": "bazaarGuru", "source": "telegram"}'),

('Nykaa', 'nykaa.com', 'Nykaa Affiliate', 'https://www.nykaa.com/affiliate-link?url={original_url}&affiliate=bazaarGuru&subid={sub_id}', 'subid', 6.00, 20, '["IN"]',
 '{"coupon": "https://www.nykaa.com/coupon/{coupon_id}?affiliate=bazaarGuru&subid={sub_id}", "offer": "https://www.nykaa.com/offer/{offer_id}?affiliate=bazaarGuru&subid={sub_id}", "direct": "{original_url}?affiliate=bazaarGuru&subid={sub_id}"}',
 '{"affiliate": "bazaarGuru", "source": "telegram"}'),

('Swiggy', 'swiggy.com', 'Swiggy Partners', 'https://www.swiggy.com/partner-link?url={original_url}&partner_id=bazaarGuru&subid={sub_id}', 'subid', 3.00, 7, '["IN"]',
 '{"coupon": "https://www.swiggy.com/coupon/{coupon_id}?partner_id=bazaarGuru&subid={sub_id}", "offer": "https://www.swiggy.com/offer/{offer_id}?partner_id=bazaarGuru&subid={sub_id}", "direct": "{original_url}?partner_id=bazaarGuru&subid={sub_id}"}',
 '{"partner_id": "bazaarGuru", "source": "telegram"}'),

('MakeMyTrip', 'makemytrip.com', 'MakeMyTrip Affiliate', 'https://www.makemytrip.com/affiliate?url={original_url}&affid=bazaarGuru&subid={sub_id}', 'subid', 5.00, 45, '["IN"]',
 '{"coupon": "https://www.makemytrip.com/coupon/{coupon_id}?affid=bazaarGuru&subid={sub_id}", "offer": "https://www.makemytrip.com/offer/{offer_id}?affid=bazaarGuru&subid={sub_id}", "direct": "{original_url}?affid=bazaarGuru&subid={sub_id}"}',
 '{"affid": "bazaarGuru", "source": "telegram"}')

ON CONFLICT (domain) DO NOTHING;

-- Создание функции для получения статистики по аффилейтским ссылкам
CREATE OR REPLACE FUNCTION get_affiliate_stats(user_id_param UUID DEFAULT NULL, days_param INTEGER DEFAULT 30)
RETURNS TABLE (
    total_links BIGINT,
    active_links BIGINT,
    total_clicks BIGINT,
    unique_clickers BIGINT,
    total_conversions BIGINT,
    total_commission NUMERIC,
    conversion_rate NUMERIC,
    avg_order_value NUMERIC,
    top_performing_store VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM affiliate_links al 
         WHERE (user_id_param IS NULL OR al.user_id = user_id_param)
         AND al.created_at >= NOW() - INTERVAL '1 day' * days_param) as total_links,
        
        (SELECT COUNT(*) FROM affiliate_links al 
         WHERE (user_id_param IS NULL OR al.user_id = user_id_param)
         AND al.is_active = true 
         AND (al.expires_at IS NULL OR al.expires_at > NOW())
         AND al.created_at >= NOW() - INTERVAL '1 day' * days_param) as active_links,
        
        (SELECT COUNT(*) FROM link_clicks lc
         JOIN affiliate_links al ON lc.affiliate_link_id = al.id
         WHERE (user_id_param IS NULL OR al.user_id = user_id_param)
         AND lc.clicked_at >= NOW() - INTERVAL '1 day' * days_param) as total_clicks,
        
        (SELECT COUNT(DISTINCT lc.user_id) FROM link_clicks lc
         JOIN affiliate_links al ON lc.affiliate_link_id = al.id
         WHERE (user_id_param IS NULL OR al.user_id = user_id_param)
         AND lc.clicked_at >= NOW() - INTERVAL '1 day' * days_param) as unique_clickers,
        
        (SELECT COUNT(*) FROM link_clicks lc
         JOIN affiliate_links al ON lc.affiliate_link_id = al.id
         WHERE (user_id_param IS NULL OR al.user_id = user_id_param)
         AND lc.conversion_data->>'converted' = 'true'
         AND lc.clicked_at >= NOW() - INTERVAL '1 day' * days_param) as total_conversions,
        
        (SELECT COALESCE(SUM((lc.conversion_data->>'commission')::numeric), 0) FROM link_clicks lc
         JOIN affiliate_links al ON lc.affiliate_link_id = al.id
         WHERE (user_id_param IS NULL OR al.user_id = user_id_param)
         AND lc.conversion_data->>'converted' = 'true'
         AND lc.clicked_at >= NOW() - INTERVAL '1 day' * days_param) as total_commission,
        
        (SELECT CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(CASE WHEN lc.conversion_data->>'converted' = 'true' THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 2)
            ELSE 0 
         END
         FROM link_clicks lc
         JOIN affiliate_links al ON lc.affiliate_link_id = al.id
         WHERE (user_id_param IS NULL OR al.user_id = user_id_param)
         AND lc.clicked_at >= NOW() - INTERVAL '1 day' * days_param) as conversion_rate,
        
        (SELECT COALESCE(AVG((lc.conversion_data->>'orderValue')::numeric), 0) FROM link_clicks lc
         JOIN affiliate_links al ON lc.affiliate_link_id = al.id
         WHERE (user_id_param IS NULL OR al.user_id = user_id_param)
         AND lc.conversion_data->>'converted' = 'true'
         AND lc.clicked_at >= NOW() - INTERVAL '1 day' * days_param) as avg_order_value,
        
        (SELECT al.store_name FROM link_clicks lc
         JOIN affiliate_links al ON lc.affiliate_link_id = al.id
         WHERE (user_id_param IS NULL OR al.user_id = user_id_param)
         AND lc.clicked_at >= NOW() - INTERVAL '1 day' * days_param
         GROUP BY al.store_name
         ORDER BY COUNT(*) DESC
         LIMIT 1) as top_performing_store;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для очистки старых данных
CREATE OR REPLACE FUNCTION cleanup_old_affiliate_data()
RETURNS void AS $$
BEGIN
    -- Удаляем клики старше 90 дней без конверсий
    DELETE FROM link_clicks 
    WHERE clicked_at < NOW() - INTERVAL '90 days'
    AND conversion_data->>'converted' != 'true';
    
    -- Удаляем неактивные ссылки старше 30 дней
    DELETE FROM affiliate_links 
    WHERE is_active = false 
    AND updated_at < NOW() - INTERVAL '30 days';
    
    -- Удаляем неиспользуемые SubID маппинги старше 60 дней
    DELETE FROM sub_id_mappings 
    WHERE is_active = false 
    AND (last_used_at IS NULL OR last_used_at < NOW() - INTERVAL '60 days')
    AND created_at < NOW() - INTERVAL '60 days';
    
    -- Обновляем статистику таблиц
    ANALYZE affiliate_links;
    ANALYZE link_clicks;
    ANALYZE sub_id_mappings;
    ANALYZE traffic_attribution;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для генерации отчета по конверсиям
CREATE OR REPLACE FUNCTION get_conversion_report(
    user_id_param UUID DEFAULT NULL,
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    date_period DATE,
    store_name VARCHAR,
    total_clicks BIGINT,
    conversions BIGINT,
    conversion_rate NUMERIC,
    total_commission NUMERIC,
    avg_order_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lc.clicked_at::date as date_period,
        al.store_name,
        COUNT(*) as total_clicks,
        COUNT(CASE WHEN lc.conversion_data->>'converted' = 'true' THEN 1 END) as conversions,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(CASE WHEN lc.conversion_data->>'converted' = 'true' THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 2)
            ELSE 0 
        END as conversion_rate,
        COALESCE(SUM((lc.conversion_data->>'commission')::numeric), 0) as total_commission,
        COALESCE(AVG((lc.conversion_data->>'orderValue')::numeric), 0) as avg_order_value
    FROM link_clicks lc
    JOIN affiliate_links al ON lc.affiliate_link_id = al.id
    WHERE (user_id_param IS NULL OR al.user_id = user_id_param)
    AND lc.clicked_at::date BETWEEN start_date AND end_date
    GROUP BY lc.clicked_at::date, al.store_name
    ORDER BY date_period DESC, total_clicks DESC;
END;
$$ LANGUAGE plpgsql;
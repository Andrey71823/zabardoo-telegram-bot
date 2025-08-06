-- Расширение таблицы indian_stores для поддержки дополнительных функций
ALTER TABLE indian_stores 
ADD COLUMN IF NOT EXISTS logo TEXT,
ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 999,
ADD COLUMN IF NOT EXISTS api_endpoint TEXT,
ADD COLUMN IF NOT EXISTS affiliate_network VARCHAR(100),
ADD COLUMN IF NOT EXISTS tracking_params JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS supported_regions JSONB DEFAULT '["IN"]',
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS special_features JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS seasonal_trends JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_audience JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_error_message TEXT;

-- Создание таблицы для интеграций магазинов
CREATE TABLE IF NOT EXISTS store_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES indian_stores(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL, -- 'api', 'scraping', 'manual', 'webhook'
    endpoint_url TEXT,
    api_key_encrypted TEXT,
    auth_method VARCHAR(50), -- 'bearer', 'basic', 'oauth', 'api_key'
    headers JSONB DEFAULT '{}',
    request_params JSONB DEFAULT '{}',
    rate_limit_per_hour INTEGER DEFAULT 1000,
    timeout_seconds INTEGER DEFAULT 30,
    retry_attempts INTEGER DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_request_at TIMESTAMP WITH TIME ZONE,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_response_time INTEGER DEFAULT 0, -- в миллисекундах
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создание таблицы для купонов магазинов
CREATE TABLE IF NOT EXISTS store_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES indian_stores(id) ON DELETE CASCADE,
    external_coupon_id VARCHAR(255),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    coupon_code VARCHAR(100),
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'bogo', 'free_shipping')),
    discount_value DECIMAL(10,2),
    min_order_value DECIMAL(10,2),
    max_discount DECIMAL(10,2),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_exclusive BOOLEAN NOT NULL DEFAULT false,
    popularity_score INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    terms_conditions TEXT,
    applicable_products JSONB DEFAULT '[]',
    excluded_products JSONB DEFAULT '[]',
    user_restrictions JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    source VARCHAR(50) DEFAULT 'api',
    last_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создание таблицы для категорий магазинов
CREATE TABLE IF NOT EXISTS store_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- HEX color code
    priority INTEGER DEFAULT 999,
    is_popular BOOLEAN NOT NULL DEFAULT false,
    parent_category_id UUID REFERENCES store_categories(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создание таблицы связи магазинов и категорий
CREATE TABLE IF NOT EXISTS store_category_mapping (
    store_id UUID NOT NULL REFERENCES indian_stores(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES store_categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    priority INTEGER DEFAULT 999,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (store_id, category_id)
);

-- Создание таблицы для отслеживания производительности магазинов
CREATE TABLE IF NOT EXISTS store_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES indian_stores(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_clicks INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.0,
    total_commission DECIMAL(12,2) DEFAULT 0.0,
    avg_order_value DECIMAL(10,2) DEFAULT 0.0,
    conversion_rate DECIMAL(5,4) DEFAULT 0.0,
    bounce_rate DECIMAL(5,4) DEFAULT 0.0,
    avg_session_duration INTEGER DEFAULT 0, -- в секундах
    top_categories JSONB DEFAULT '[]',
    top_products JSONB DEFAULT '[]',
    user_demographics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, date)
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_indian_stores_priority ON indian_stores(priority ASC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_indian_stores_popular ON indian_stores(is_popular DESC, priority ASC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_indian_stores_categories ON indian_stores USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_indian_stores_commission ON indian_stores(commission_rate DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_indian_stores_conversion ON indian_stores(conversion_rate DESC) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_store_integrations_store_id ON store_integrations(store_id);
CREATE INDEX IF NOT EXISTS idx_store_integrations_active ON store_integrations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_store_integrations_type ON store_integrations(integration_type);

CREATE INDEX IF NOT EXISTS idx_store_coupons_store_id ON store_coupons(store_id);
CREATE INDEX IF NOT EXISTS idx_store_coupons_active ON store_coupons(is_active, end_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_store_coupons_category ON store_coupons(category);
CREATE INDEX IF NOT EXISTS idx_store_coupons_popularity ON store_coupons(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_store_coupons_end_date ON store_coupons(end_date);

CREATE INDEX IF NOT EXISTS idx_store_categories_popular ON store_categories(is_popular DESC, priority ASC);
CREATE INDEX IF NOT EXISTS idx_store_categories_parent ON store_categories(parent_category_id);

CREATE INDEX IF NOT EXISTS idx_store_performance_store_date ON store_performance(store_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_store_performance_date ON store_performance(date DESC);
CREATE INDEX IF NOT EXISTS idx_store_performance_conversion ON store_performance(conversion_rate DESC);

-- Создание триггеров для автоматического обновления updated_at
CREATE TRIGGER update_store_integrations_updated_at 
    BEFORE UPDATE ON store_integrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_coupons_updated_at 
    BEFORE UPDATE ON store_coupons 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_categories_updated_at 
    BEFORE UPDATE ON store_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_performance_updated_at 
    BEFORE UPDATE ON store_performance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Вставка популярных категорий
INSERT INTO store_categories (name, display_name, description, icon, color, priority, is_popular) VALUES
('electronics', 'Electronics', 'Smartphones, Laptops, Gadgets', '📱', '#3498db', 1, true),
('fashion', 'Fashion', 'Clothing, Shoes, Accessories', '👗', '#e74c3c', 2, true),
('beauty', 'Beauty', 'Cosmetics, Skincare, Personal Care', '💄', '#f39c12', 3, true),
('home', 'Home & Living', 'Furniture, Decor, Kitchen', '🏠', '#27ae60', 4, true),
('food', 'Food & Dining', 'Restaurants, Groceries, Delivery', '🍔', '#e67e22', 5, true),
('travel', 'Travel', 'Flights, Hotels, Packages', '✈️', '#9b59b6', 6, true),
('books', 'Books', 'Books, eBooks, Stationery', '📚', '#34495e', 7, true),
('sports', 'Sports & Fitness', 'Sports Equipment, Fitness Gear', '⚽', '#1abc9c', 8, true),
('health', 'Health & Wellness', 'Medicines, Supplements, Healthcare', '🏥', '#2ecc71', 9, true),
('automotive', 'Automotive', 'Car Accessories, Bike Parts', '🚗', '#95a5a6', 10, false)
ON CONFLICT (name) DO NOTHING;

-- Создание функции для получения статистики магазинов
CREATE OR REPLACE FUNCTION get_indian_store_stats()
RETURNS TABLE (
    total_stores BIGINT,
    active_stores BIGINT,
    popular_stores BIGINT,
    categories_count BIGINT,
    average_commission NUMERIC,
    average_conversion NUMERIC,
    top_categories JSONB,
    region_coverage JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM indian_stores) as total_stores,
        (SELECT COUNT(*) FROM indian_stores WHERE is_active = true) as active_stores,
        (SELECT COUNT(*) FROM indian_stores WHERE is_popular = true AND is_active = true) as popular_stores,
        (SELECT COUNT(*) FROM store_categories WHERE is_popular = true) as categories_count,
        (SELECT ROUND(AVG(commission_rate), 2) FROM indian_stores WHERE is_active = true) as average_commission,
        (SELECT ROUND(AVG(conversion_rate), 4) FROM indian_stores WHERE is_active = true) as average_conversion,
        (SELECT jsonb_agg(jsonb_build_object('category', name, 'count', store_count))
         FROM (
             SELECT sc.name, COUNT(scm.store_id) as store_count
             FROM store_categories sc
             LEFT JOIN store_category_mapping scm ON sc.id = scm.category_id
             GROUP BY sc.name
             ORDER BY store_count DESC
             LIMIT 5
         ) top_cats) as top_categories,
        (SELECT jsonb_agg(DISTINCT supported_regions)
         FROM indian_stores 
         WHERE is_active = true) as region_coverage;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для получения рекомендованных магазинов
CREATE OR REPLACE FUNCTION get_recommended_stores(
    user_preferences TEXT[] DEFAULT NULL,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    store_id UUID,
    store_name VARCHAR,
    domain VARCHAR,
    logo TEXT,
    categories JSONB,
    commission_rate DECIMAL,
    conversion_rate DECIMAL,
    priority INTEGER,
    recommendation_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as store_id,
        s.name as store_name,
        s.domain,
        s.logo,
        s.categories,
        s.commission_rate,
        s.conversion_rate,
        s.priority,
        -- Расчет рекомендательного скора
        (
            (s.conversion_rate * 100) + 
            (s.commission_rate * 10) + 
            (CASE WHEN s.is_popular THEN 20 ELSE 0 END) +
            (1000 - s.priority) / 100.0 +
            -- Бонус за совпадение с предпочтениями пользователя
            (CASE 
                WHEN user_preferences IS NOT NULL THEN
                    (SELECT COUNT(*) * 15 
                     FROM unnest(user_preferences) as pref
                     WHERE s.categories::text ILIKE '%' || pref || '%')
                ELSE 0 
            END)
        ) as recommendation_score
    FROM indian_stores s
    WHERE s.is_active = true
    ORDER BY recommendation_score DESC, s.priority ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для обновления производительности магазина
CREATE OR REPLACE FUNCTION update_store_performance(
    store_id_param UUID,
    date_param DATE,
    clicks_param INTEGER DEFAULT 0,
    users_param INTEGER DEFAULT 0,
    conversions_param INTEGER DEFAULT 0,
    revenue_param DECIMAL DEFAULT 0.0,
    commission_param DECIMAL DEFAULT 0.0
)
RETURNS void AS $$
BEGIN
    INSERT INTO store_performance (
        store_id, date, total_clicks, unique_users, conversions, 
        total_revenue, total_commission, conversion_rate, avg_order_value
    ) VALUES (
        store_id_param, date_param, clicks_param, users_param, conversions_param,
        revenue_param, commission_param,
        CASE WHEN clicks_param > 0 THEN conversions_param::decimal / clicks_param ELSE 0 END,
        CASE WHEN conversions_param > 0 THEN revenue_param / conversions_param ELSE 0 END
    )
    ON CONFLICT (store_id, date) DO UPDATE SET
        total_clicks = store_performance.total_clicks + clicks_param,
        unique_users = GREATEST(store_performance.unique_users, users_param),
        conversions = store_performance.conversions + conversions_param,
        total_revenue = store_performance.total_revenue + revenue_param,
        total_commission = store_performance.total_commission + commission_param,
        conversion_rate = CASE 
            WHEN (store_performance.total_clicks + clicks_param) > 0 
            THEN (store_performance.conversions + conversions_param)::decimal / (store_performance.total_clicks + clicks_param)
            ELSE 0 
        END,
        avg_order_value = CASE 
            WHEN (store_performance.conversions + conversions_param) > 0 
            THEN (store_performance.total_revenue + revenue_param) / (store_performance.conversions + conversions_param)
            ELSE 0 
        END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Создание функции для очистки старых данных
CREATE OR REPLACE FUNCTION cleanup_old_store_data()
RETURNS void AS $$
BEGIN
    -- Удаляем старые записи производительности (старше 1 года)
    DELETE FROM store_performance 
    WHERE date < CURRENT_DATE - INTERVAL '1 year';
    
    -- Удаляем истекшие купоны (старше 30 дней после истечения)
    DELETE FROM store_coupons 
    WHERE end_date < NOW() - INTERVAL '30 days';
    
    -- Обновляем статистику таблиц
    ANALYZE indian_stores;
    ANALYZE store_integrations;
    ANALYZE store_coupons;
    ANALYZE store_performance;
END;
$$ LANGUAGE plpgsql;
-- Создание таблицы для синхронизированных купонов
CREATE TABLE IF NOT EXISTS coupon_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    code VARCHAR(100),
    discount VARCHAR(100) NOT NULL,
    discount_type VARCHAR(50) NOT NULL DEFAULT 'percentage',
    discount_value DECIMAL(10,2),
    store VARCHAR(255) NOT NULL,
    store_id VARCHAR(100) NOT NULL,
    category VARCHAR(255) NOT NULL,
    category_id VARCHAR(100) NOT NULL,
    image_url TEXT,
    affiliate_url TEXT NOT NULL,
    original_url TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    popularity INTEGER NOT NULL DEFAULT 0,
    success_rate DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    tags JSONB DEFAULT '[]',
    conditions TEXT,
    min_order_value DECIMAL(10,2),
    max_discount DECIMAL(10,2),
    usage_limit INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    source VARCHAR(50) NOT NULL DEFAULT 'api',
    last_sync_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создание таблицы для статусов синхронизации
CREATE TABLE IF NOT EXISTS coupon_sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id VARCHAR(255) NOT NULL, -- Может быть UUID или external_id
    sync_type VARCHAR(50) NOT NULL, -- create, update, delete, status_change
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создание таблицы для конфигураций синхронизации
CREATE TABLE IF NOT EXISTS sync_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    endpoint TEXT NOT NULL,
    api_key TEXT,
    sync_interval INTEGER NOT NULL DEFAULT 60, -- в минутах
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    next_sync_at TIMESTAMP WITH TIME ZONE,
    sync_filters JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_coupon_sync_external_id ON coupon_sync(external_id);
CREATE INDEX IF NOT EXISTS idx_coupon_sync_store_id ON coupon_sync(store_id);
CREATE INDEX IF NOT EXISTS idx_coupon_sync_category_id ON coupon_sync(category_id);
CREATE INDEX IF NOT EXISTS idx_coupon_sync_active ON coupon_sync(is_active, end_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupon_sync_popularity ON coupon_sync(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_coupon_sync_created_at ON coupon_sync(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupon_sync_last_sync ON coupon_sync(last_sync_at);

CREATE INDEX IF NOT EXISTS idx_coupon_sync_status_coupon_id ON coupon_sync_status(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_sync_status_status ON coupon_sync_status(status);
CREATE INDEX IF NOT EXISTS idx_coupon_sync_status_retry ON coupon_sync_status(next_retry_at) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_coupon_sync_status_created ON coupon_sync_status(created_at);

CREATE INDEX IF NOT EXISTS idx_sync_config_enabled ON sync_configuration(is_enabled, next_sync_at) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_sync_config_next_sync ON sync_configuration(next_sync_at);

-- Создание триггеров для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_coupon_sync_updated_at 
    BEFORE UPDATE ON coupon_sync 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupon_sync_status_updated_at 
    BEFORE UPDATE ON coupon_sync_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_configuration_updated_at 
    BEFORE UPDATE ON sync_configuration 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Вставка примера конфигурации синхронизации
INSERT INTO sync_configuration (name, endpoint, sync_interval, sync_filters) 
VALUES (
    'Main Website API',
    'https://api.zabardoo.com/v1/coupons',
    30, -- синхронизация каждые 30 минут
    '{
        "categories": ["electronics", "fashion", "beauty", "food"],
        "onlyActive": true,
        "minDiscount": 5
    }'::jsonb
) ON CONFLICT (name) DO NOTHING;

-- Создание функции для очистки старых записей синхронизации
CREATE OR REPLACE FUNCTION cleanup_old_sync_records()
RETURNS void AS $$
BEGIN
    -- Удаляем завершенные записи синхронизации старше 7 дней
    DELETE FROM coupon_sync_status 
    WHERE status = 'completed' 
    AND created_at < NOW() - INTERVAL '7 days';
    
    -- Удаляем неактивные купоны старше 30 дней
    DELETE FROM coupon_sync 
    WHERE is_active = false 
    AND end_date < NOW() - INTERVAL '30 days';
    
    -- Обновляем статистику таблиц
    ANALYZE coupon_sync;
    ANALYZE coupon_sync_status;
    ANALYZE sync_configuration;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для получения статистики синхронизации
CREATE OR REPLACE FUNCTION get_sync_stats()
RETURNS TABLE (
    total_coupons BIGINT,
    active_coupons BIGINT,
    expired_coupons BIGINT,
    pending_syncs BIGINT,
    failed_syncs BIGINT,
    last_sync_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM coupon_sync) as total_coupons,
        (SELECT COUNT(*) FROM coupon_sync WHERE is_active = true AND end_date > NOW()) as active_coupons,
        (SELECT COUNT(*) FROM coupon_sync WHERE end_date <= NOW()) as expired_coupons,
        (SELECT COUNT(*) FROM coupon_sync_status WHERE status = 'pending') as pending_syncs,
        (SELECT COUNT(*) FROM coupon_sync_status WHERE status = 'failed') as failed_syncs,
        (SELECT MAX(last_sync_at) FROM sync_configuration) as last_sync_time;
END;
$$ LANGUAGE plpgsql;
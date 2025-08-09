-- Migration: Create Coupon Management Tables
-- Description: Tables for comprehensive coupon management system

-- Create coupons table if it doesn't exist
CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    code VARCHAR(100) NOT NULL,
    discount DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'freeShipping')),
    store VARCHAR(255) NOT NULL,
    store_id VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    valid_from TIMESTAMP,
    valid_to TIMESTAMP,
    usage_limit INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'expired', 'pending', 'rejected')),
    priority INTEGER DEFAULT 0,
    tags TEXT[], -- Array of tags
    affiliate_link TEXT NOT NULL,
    image_url TEXT,
    terms_and_conditions TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    moderated_by VARCHAR(255),
    moderated_at TIMESTAMP,
    moderation_notes TEXT,
    source VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'group', 'api', 'sync')),
    is_exclusive BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    click_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    revenue DECIMAL(15,2) DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status);
CREATE INDEX IF NOT EXISTS idx_coupons_store ON coupons(store);
CREATE INDEX IF NOT EXISTS idx_coupons_category ON coupons(category);
CREATE INDEX IF NOT EXISTS idx_coupons_created_at ON coupons(created_at);
CREATE INDEX IF NOT EXISTS idx_coupons_valid_to ON coupons(valid_to);
CREATE INDEX IF NOT EXISTS idx_coupons_priority ON coupons(priority);
CREATE INDEX IF NOT EXISTS idx_coupons_source ON coupons(source);
CREATE INDEX IF NOT EXISTS idx_coupons_is_featured ON coupons(is_featured);
CREATE INDEX IF NOT EXISTS idx_coupons_is_exclusive ON coupons(is_exclusive);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_created_by ON coupons(created_by);
CREATE INDEX IF NOT EXISTS idx_coupons_moderated_by ON coupons(moderated_by);

-- Create full-text search index for title and description
CREATE INDEX IF NOT EXISTS idx_coupons_search ON coupons USING gin(to_tsvector('english', title || ' ' || description));

-- Create coupon_templates table for reusable templates
CREATE TABLE IF NOT EXISTS coupon_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL, -- Store template as JSON
    is_default BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for templates
CREATE INDEX IF NOT EXISTS idx_coupon_templates_created_by ON coupon_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_coupon_templates_is_default ON coupon_templates(is_default);

-- Create coupon_imports table for tracking import operations
CREATE TABLE IF NOT EXISTS coupon_imports (
    id VARCHAR(255) PRIMARY KEY,
    filename VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    errors JSONB, -- Store errors as JSON array
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for imports
CREATE INDEX IF NOT EXISTS idx_coupon_imports_status ON coupon_imports(status);
CREATE INDEX IF NOT EXISTS idx_coupon_imports_created_by ON coupon_imports(created_by);
CREATE INDEX IF NOT EXISTS idx_coupon_imports_created_at ON coupon_imports(created_at);

-- Create coupon_exports table for tracking export operations
CREATE TABLE IF NOT EXISTS coupon_exports (
    id VARCHAR(255) PRIMARY KEY,
    format VARCHAR(10) NOT NULL CHECK (format IN ('csv', 'excel', 'json')),
    filters JSONB, -- Store filter criteria as JSON
    status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    filename VARCHAR(500),
    download_url TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- Create indexes for exports
CREATE INDEX IF NOT EXISTS idx_coupon_exports_status ON coupon_exports(status);
CREATE INDEX IF NOT EXISTS idx_coupon_exports_created_by ON coupon_exports(created_by);
CREATE INDEX IF NOT EXISTS idx_coupon_exports_created_at ON coupon_exports(created_at);
CREATE INDEX IF NOT EXISTS idx_coupon_exports_expires_at ON coupon_exports(expires_at);

-- Create coupon_moderation_history table for audit trail
CREATE TABLE IF NOT EXISTS coupon_moderation_history (
    id VARCHAR(255) PRIMARY KEY,
    coupon_id VARCHAR(255) NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('approve', 'reject', 'requestChanges')),
    moderator_id VARCHAR(255) NOT NULL,
    notes TEXT,
    changes JSONB, -- Store what was changed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for moderation history
CREATE INDEX IF NOT EXISTS idx_coupon_moderation_history_coupon_id ON coupon_moderation_history(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_moderation_history_moderator_id ON coupon_moderation_history(moderator_id);
CREATE INDEX IF NOT EXISTS idx_coupon_moderation_history_created_at ON coupon_moderation_history(created_at);

-- Create coupon_bulk_operations table for tracking bulk operations
CREATE TABLE IF NOT EXISTS coupon_bulk_operations (
    id VARCHAR(255) PRIMARY KEY,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('activate', 'deactivate', 'delete', 'updateCategory', 'updatePriority', 'feature', 'unfeature')),
    coupon_ids TEXT[] NOT NULL, -- Array of coupon IDs
    parameters JSONB, -- Operation parameters
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    errors JSONB, -- Store errors as JSON array
    operator_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for bulk operations
CREATE INDEX IF NOT EXISTS idx_coupon_bulk_operations_operator_id ON coupon_bulk_operations(operator_id);
CREATE INDEX IF NOT EXISTS idx_coupon_bulk_operations_created_at ON coupon_bulk_operations(created_at);
CREATE INDEX IF NOT EXISTS idx_coupon_bulk_operations_operation ON coupon_bulk_operations(operation);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;
CREATE TRIGGER update_coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_coupon_templates_updated_at ON coupon_templates;
CREATE TRIGGER update_coupon_templates_updated_at
    BEFORE UPDATE ON coupon_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically update coupon stats
CREATE OR REPLACE FUNCTION update_coupon_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- This function can be extended to update aggregated statistics
    -- For now, it's a placeholder for future enhancements
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for coupon stats updates
DROP TRIGGER IF EXISTS update_coupon_stats_trigger ON coupons;
CREATE TRIGGER update_coupon_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_coupon_stats();

-- Insert some default coupon templates
INSERT INTO coupon_templates (id, name, description, template_data, is_default, created_by) VALUES
('percentage-discount', 'Percentage Discount', 'Standard percentage discount coupon', 
 '{"discountType": "percentage", "usageLimit": 1000, "priority": 5, "isExclusive": false, "isFeatured": false, "status": "pending"}', 
 true, 'system'),
('fixed-discount', 'Fixed Amount Discount', 'Fixed amount discount coupon', 
 '{"discountType": "fixed", "usageLimit": 500, "priority": 5, "isExclusive": false, "isFeatured": false, "status": "pending"}', 
 false, 'system'),
('free-shipping', 'Free Shipping', 'Free shipping offer', 
 '{"discountType": "freeShipping", "discount": 0, "usageLimit": 2000, "priority": 3, "isExclusive": false, "isFeatured": false, "status": "pending"}', 
 false, 'system')
ON CONFLICT (id) DO NOTHING;

-- Create view for coupon statistics
CREATE OR REPLACE VIEW coupon_stats_view AS
SELECT 
    COUNT(*) as total_coupons,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_coupons,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_coupons,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_coupons,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_coupons,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_coupons,
    COALESCE(SUM(click_count), 0) as total_clicks,
    COALESCE(SUM(conversion_count), 0) as total_conversions,
    COALESCE(SUM(revenue), 0) as total_revenue,
    CASE 
        WHEN SUM(click_count) > 0 THEN (SUM(conversion_count)::DECIMAL / SUM(click_count)) * 100 
        ELSE 0 
    END as conversion_rate,
    COALESCE(AVG(discount), 0) as average_discount
FROM coupons;

-- Create view for top performing stores
CREATE OR REPLACE VIEW top_stores_view AS
SELECT 
    store,
    COUNT(*) as coupon_count,
    COALESCE(SUM(revenue), 0) as total_revenue,
    COALESCE(SUM(click_count), 0) as total_clicks,
    COALESCE(SUM(conversion_count), 0) as total_conversions,
    CASE 
        WHEN SUM(click_count) > 0 THEN (SUM(conversion_count)::DECIMAL / SUM(click_count)) * 100 
        ELSE 0 
    END as conversion_rate
FROM coupons
GROUP BY store
ORDER BY total_revenue DESC;

-- Create view for top performing categories
CREATE OR REPLACE VIEW top_categories_view AS
SELECT 
    category,
    COUNT(*) as coupon_count,
    COALESCE(SUM(revenue), 0) as total_revenue,
    COALESCE(SUM(click_count), 0) as total_clicks,
    COALESCE(SUM(conversion_count), 0) as total_conversions,
    CASE 
        WHEN SUM(click_count) > 0 THEN (SUM(conversion_count)::DECIMAL / SUM(click_count)) * 100 
        ELSE 0 
    END as conversion_rate
FROM coupons
GROUP BY category
ORDER BY total_revenue DESC;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
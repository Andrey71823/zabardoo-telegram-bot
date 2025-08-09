-- Seed data for Zabardoo Telegram Bot

-- Insert popular Indian stores
INSERT INTO indian_stores (name, domain, is_popular, average_commission, conversion_rate) VALUES
('Flipkart', 'flipkart.com', true, 3.50, 0.0850),
('Amazon India', 'amazon.in', true, 4.00, 0.0920),
('Myntra', 'myntra.com', true, 5.50, 0.0780),
('Ajio', 'ajio.com', true, 4.50, 0.0650),
('Nykaa', 'nykaa.com', true, 6.00, 0.0890),
('BigBasket', 'bigbasket.com', true, 2.50, 0.1200),
('Swiggy', 'swiggy.com', true, 3.00, 0.1500),
('Zomato', 'zomato.com', true, 2.80, 0.1400),
('BookMyShow', 'bookmyshow.com', true, 4.20, 0.0950),
('MakeMyTrip', 'makemytrip.com', true, 5.00, 0.0720),
('Paytm Mall', 'paytmmall.com', true, 3.80, 0.0680),
('Snapdeal', 'snapdeal.com', true, 4.20, 0.0590),
('FirstCry', 'firstcry.com', true, 5.20, 0.0820),
('Lenskart', 'lenskart.com', true, 6.50, 0.0750),
('Urban Company', 'urbancompany.com', true, 4.80, 0.1100);

-- Insert sample coupons for popular Indian stores
INSERT INTO coupons (title, description, store_id, category, discount_type, discount_value, coupon_code, site_page_url, is_text_coupon, is_popular_in_india) VALUES
('Flipkart Big Billion Days - Up to 80% Off', 'Massive discounts on electronics, fashion, and home appliances during Big Billion Days sale', 
 (SELECT id FROM indian_stores WHERE name = 'Flipkart'), 'Electronics', 'percentage', 80.00, 'BIGBILLION80', 
 'https://zabardoo.com/coupons/flipkart-big-billion-days', true, true),

('Amazon India Great Indian Festival - Extra 10% Off', 'Additional 10% discount on already discounted items during Great Indian Festival', 
 (SELECT id FROM indian_stores WHERE name = 'Amazon India'), 'Electronics', 'percentage', 10.00, 'FESTIVAL10', 
 'https://zabardoo.com/coupons/amazon-great-indian-festival', true, true),

('Myntra End of Reason Sale - Flat 70% Off', 'Flat 70% discount on fashion and lifestyle products', 
 (SELECT id FROM indian_stores WHERE name = 'Myntra'), 'Fashion', 'percentage', 70.00, 'EORS70', 
 'https://zabardoo.com/coupons/myntra-end-of-reason-sale', true, true),

('Nykaa Beauty Bonanza - Buy 2 Get 1 Free', 'Buy any 2 beauty products and get 1 free on Nykaa', 
 (SELECT id FROM indian_stores WHERE name = 'Nykaa'), 'Beauty', 'offer', NULL, 'BEAUTY2GET1', 
 'https://zabardoo.com/coupons/nykaa-beauty-bonanza', true, true),

('BigBasket Fresh Deals - ₹200 Off on ₹1000', 'Get ₹200 off on grocery orders above ₹1000', 
 (SELECT id FROM indian_stores WHERE name = 'BigBasket'), 'Grocery', 'fixed', 200.00, 'FRESH200', 
 'https://zabardoo.com/coupons/bigbasket-fresh-deals', true, true),

('Swiggy Super Saver - 60% Off + Free Delivery', 'Get 60% off on food orders with free delivery', 
 (SELECT id FROM indian_stores WHERE name = 'Swiggy'), 'Food', 'percentage', 60.00, 'SUPERSAVER60', 
 'https://zabardoo.com/coupons/swiggy-super-saver', true, true),

('MakeMyTrip Travel Sale - Up to ₹5000 Off', 'Save up to ₹5000 on domestic flight bookings', 
 (SELECT id FROM indian_stores WHERE name = 'MakeMyTrip'), 'Travel', 'fixed', 5000.00, 'TRAVEL5000', 
 'https://zabardoo.com/coupons/makemytrip-travel-sale', true, true),

('Lenskart Eyewear Festival - Buy 1 Get 1 Free', 'Buy any eyewear and get another one absolutely free', 
 (SELECT id FROM indian_stores WHERE name = 'Lenskart'), 'Eyewear', 'offer', NULL, 'EYEWEAR1GET1', 
 'https://zabardoo.com/coupons/lenskart-eyewear-festival', true, true);

-- Insert sample users (for testing purposes)
INSERT INTO users (telegram_id, username, first_name, last_name, language_code, personal_channel_id) VALUES
(123456789, 'testuser1', 'Raj', 'Sharma', 'en', 'channel_raj_123456789'),
(987654321, 'testuser2', 'Priya', 'Patel', 'hi', 'channel_priya_987654321'),
(456789123, 'testuser3', 'Amit', 'Kumar', 'en', 'channel_amit_456789123');

-- Insert personal channels for test users
INSERT INTO personal_channels (user_id, channel_id, is_active, engagement_score) VALUES
((SELECT id FROM users WHERE telegram_id = 123456789), 'channel_raj_123456789', true, 85.50),
((SELECT id FROM users WHERE telegram_id = 987654321), 'channel_priya_987654321', true, 92.30),
((SELECT id FROM users WHERE telegram_id = 456789123), 'channel_amit_456789123', true, 78.20);

-- Insert user preferences for test users
INSERT INTO user_preferences (user_id, preferred_categories, preferred_stores, payment_methods, region) VALUES
((SELECT id FROM users WHERE telegram_id = 123456789), 
 ARRAY['Electronics', 'Fashion'], 
 ARRAY[(SELECT id FROM indian_stores WHERE name = 'Flipkart'), (SELECT id FROM indian_stores WHERE name = 'Amazon India')],
 ARRAY['UPI', 'PayTM'], 'North'),
 
((SELECT id FROM users WHERE telegram_id = 987654321), 
 ARRAY['Beauty', 'Fashion'], 
 ARRAY[(SELECT id FROM indian_stores WHERE name = 'Myntra'), (SELECT id FROM indian_stores WHERE name = 'Nykaa')],
 ARRAY['PhonePe', 'GooglePay'], 'West'),
 
((SELECT id FROM users WHERE telegram_id = 456789123), 
 ARRAY['Food', 'Travel'], 
 ARRAY[(SELECT id FROM indian_stores WHERE name = 'Swiggy'), (SELECT id FROM indian_stores WHERE name = 'MakeMyTrip')],
 ARRAY['UPI', 'NetBanking'], 'South');

-- Insert sample traffic events
INSERT INTO traffic_events (user_id, coupon_id, source_type, source_channel_id, order_value, commission, status) VALUES
((SELECT id FROM users WHERE telegram_id = 123456789), 
 (SELECT id FROM coupons WHERE title LIKE 'Flipkart Big Billion Days%'), 
 'personal_channel', 'channel_raj_123456789', 2500.00, 87.50, 'converted'),
 
((SELECT id FROM users WHERE telegram_id = 987654321), 
 (SELECT id FROM coupons WHERE title LIKE 'Myntra End of Reason Sale%'), 
 'personal_channel', 'channel_priya_987654321', 1800.00, 99.00, 'converted'),
 
((SELECT id FROM users WHERE telegram_id = 456789123), 
 (SELECT id FROM coupons WHERE title LIKE 'Swiggy Super Saver%'), 
 'ai_recommendation', NULL, 450.00, 13.50, 'converted');

-- Insert sample purchase history
INSERT INTO purchase_history (user_id, coupon_id, traffic_event_id, order_id, order_value, commission, cashback_amount, status) VALUES
((SELECT id FROM users WHERE telegram_id = 123456789), 
 (SELECT id FROM coupons WHERE title LIKE 'Flipkart Big Billion Days%'),
 (SELECT id FROM traffic_events WHERE user_id = (SELECT id FROM users WHERE telegram_id = 123456789) LIMIT 1),
 'FLP_ORD_001', 2500.00, 87.50, 43.75, 'confirmed'),
 
((SELECT id FROM users WHERE telegram_id = 987654321), 
 (SELECT id FROM coupons WHERE title LIKE 'Myntra End of Reason Sale%'),
 (SELECT id FROM traffic_events WHERE user_id = (SELECT id FROM users WHERE telegram_id = 987654321) LIMIT 1),
 'MYN_ORD_002', 1800.00, 99.00, 49.50, 'confirmed'),
 
((SELECT id FROM users WHERE telegram_id = 456789123), 
 (SELECT id FROM coupons WHERE title LIKE 'Swiggy Super Saver%'),
 (SELECT id FROM traffic_events WHERE user_id = (SELECT id FROM users WHERE telegram_id = 456789123) LIMIT 1),
 'SWG_ORD_003', 450.00, 13.50, 6.75, 'confirmed');

-- Insert sample cashback transactions
INSERT INTO cashback_transactions (user_id, purchase_id, amount, status, confirmed_at) VALUES
((SELECT id FROM users WHERE telegram_id = 123456789), 
 (SELECT id FROM purchase_history WHERE order_id = 'FLP_ORD_001'), 
 43.75, 'confirmed', CURRENT_TIMESTAMP - INTERVAL '1 day'),
 
((SELECT id FROM users WHERE telegram_id = 987654321), 
 (SELECT id FROM purchase_history WHERE order_id = 'MYN_ORD_002'), 
 49.50, 'confirmed', CURRENT_TIMESTAMP - INTERVAL '2 days'),
 
((SELECT id FROM users WHERE telegram_id = 456789123), 
 (SELECT id FROM purchase_history WHERE order_id = 'SWG_ORD_003'), 
 6.75, 'pending', NULL);

-- Insert test group
INSERT INTO groups (id, telegram_group_id, name, description, member_count, moderation_level, allow_coupon_creation) VALUES
(uuid_generate_v4(), '-1001234567890', 'Zabardoo Deals Group', 'Main group for sharing and creating coupon deals', 3, 'medium', true);

-- Insert group members
INSERT INTO group_members (group_id, user_id, role, status, contribution_score) VALUES
((SELECT id FROM groups WHERE telegram_group_id = '-1001234567890'), 
 (SELECT id FROM users WHERE telegram_id = 123456789), 'admin', 'active', 95.5),
((SELECT id FROM groups WHERE telegram_group_id = '-1001234567890'), 
 (SELECT id FROM users WHERE telegram_id = 987654321), 'moderator', 'active', 87.2),
((SELECT id FROM groups WHERE telegram_group_id = '-1001234567890'), 
 (SELECT id FROM users WHERE telegram_id = 456789123), 'member', 'active', 72.8);

-- Insert moderation rules for the test group
INSERT INTO moderation_rules (group_id, rule_type, parameters, action, severity) VALUES
((SELECT id FROM groups WHERE telegram_group_id = '-1001234567890'), 
 'spam_detection', '{"maxCapsRatio": 0.7, "maxEmojis": 10}', 'warn', 'medium'),
((SELECT id FROM groups WHERE telegram_group_id = '-1001234567890'), 
 'keyword_filter', '{"bannedWords": ["spam", "scam", "fake"]}', 'delete', 'high'),
((SELECT id FROM groups WHERE telegram_group_id = '-1001234567890'), 
 'rate_limit', '{"maxMessagesPerMinute": 5}', 'mute', 'medium'),
((SELECT id FROM groups WHERE telegram_group_id = '-1001234567890'), 
 'link_filter', '{"allowedDomains": ["flipkart.com", "amazon.in", "myntra.com", "zabardoo.com"]}', 'warn', 'low');

-- Insert sample group messages
INSERT INTO group_messages (group_id, user_id, message_id, content, message_type, is_moderated, moderation_action) VALUES
((SELECT id FROM groups WHERE telegram_group_id = '-1001234567890'),
 (SELECT id FROM users WHERE telegram_id = 123456789),
 'msg_001', 'Welcome to Zabardoo Deals Group! Share your best coupon finds here.', 'text', true, 'approved'),
((SELECT id FROM groups WHERE telegram_group_id = '-1001234567890'),
 (SELECT id FROM users WHERE telegram_id = 987654321),
 'msg_002', 'Flipkart Big Sale - 70% OFF on Electronics! Code: BIGSALE70 https://flipkart.com/deals', 'coupon', true, 'approved'),
((SELECT id FROM groups WHERE telegram_group_id = '-1001234567890'),
 (SELECT id FROM users WHERE telegram_id = 456789123),
 'msg_003', 'Thanks for sharing! This is a great deal.', 'text', true, 'approved');

-- Insert sample coupon creation request
INSERT INTO coupon_creation_requests (group_id, user_id, message_id, title, description, store, discount_type, discount_value, coupon_code, link, status) VALUES
((SELECT id FROM groups WHERE telegram_group_id = '-1001234567890'),
 (SELECT id FROM users WHERE telegram_id = 987654321),
 'msg_002',
 'Flipkart Big Sale - 70% OFF on Electronics',
 'Huge discounts on smartphones, laptops, and accessories during the Big Sale event',
 'Flipkart',
 'percentage',
 70.00,
 'BIGSALE70',
 'https://flipkart.com/deals',
 'approved');

-- Insert content sync rules
INSERT INTO content_sync_rules (source_type, source_id, target_type, target_filters, content_filters, sync_timing, priority) VALUES
('group', '-1001234567890', 'personal_channels', 
 '{"minEngagement": 50, "maxChurnRisk": 0.3}', 
 '{"messageTypes": ["coupon"], "minPopularityScore": 70}',
 '{"immediate": false, "scheduled": {"hours": [9, 12, 18, 21], "timezone": "Asia/Kolkata"}}',
 1),
('group', '-1001234567890', 'personal_channels', 
 '{"userSegments": ["high_value"], "categories": ["Electronics", "Fashion"]}', 
 '{"messageTypes": ["coupon", "text"], "minPopularityScore": 50}',
 '{"immediate": true}',
 2);

-- Insert popular content
INSERT INTO popular_content (source_id, source_type, content_type, title, content, metadata, popularity_score, engagement_metrics, sync_count) VALUES
('msg_002', 'group', 'coupon', 
 'Flipkart Big Sale - 70% OFF on Electronics',
 'Flipkart Big Sale - 70% OFF on Electronics! Code: BIGSALE70 https://flipkart.com/deals',
 '{"store": "Flipkart", "category": "Electronics", "discountType": "percentage", "discountValue": 70, "couponCode": "BIGSALE70", "link": "https://flipkart.com/deals"}',
 85.5,
 '{"views": 1250, "clicks": 89, "shares": 23, "reactions": 156, "comments": 12}',
 3),
('msg_popular_001', 'group', 'coupon',
 'Amazon Great Sale - 50% OFF',
 'Amazon Great Sale - 50% OFF on Electronics! Code: GREAT50 https://amazon.in/deals Valid till 31st Dec',
 '{"store": "Amazon", "category": "Electronics", "discountType": "percentage", "discountValue": 50, "couponCode": "GREAT50", "link": "https://amazon.in/deals"}',
 78.2,
 '{"views": 980, "clicks": 67, "shares": 18, "reactions": 134, "comments": 8}',
 2);

-- Insert user content preferences
INSERT INTO user_content_preferences (user_id, preferred_categories, preferred_stores, max_messages_per_day, preferred_times, content_types, min_discount_threshold, only_popular_content) VALUES
((SELECT id FROM users WHERE telegram_id = 123456789),
 '["Electronics", "Fashion"]', '["Flipkart", "Amazon"]', 15, '[9, 12, 18, 21]', '["coupon", "text"]', 20.0, false),
((SELECT id FROM users WHERE telegram_id = 987654321),
 '["Beauty", "Fashion"]', '["Myntra", "Nykaa"]', 10, '[10, 14, 19]', '["coupon"]', 15.0, true),
((SELECT id FROM users WHERE telegram_id = 456789123),
 '["Food", "Travel"]', '["Swiggy", "MakeMyTrip"]', 8, '[12, 18, 20]', '["coupon", "text"]', 10.0, false);

-- Insert sample sync jobs
INSERT INTO content_sync_jobs (rule_id, source_content, target_channels, status, results) VALUES
((SELECT id FROM content_sync_rules WHERE source_id = '-1001234567890' LIMIT 1),
 '{"id": "msg_002", "type": "coupon", "content": "Flipkart Big Sale - 70% OFF!", "metadata": {"store": "Flipkart", "discountValue": 70}}',
 '["channel_raj_123456789", "channel_priya_987654321"]',
 'completed',
 '{"totalTargets": 2, "successful": 2, "failed": 0}'),
((SELECT id FROM content_sync_rules WHERE source_id = '-1001234567890' LIMIT 1),
 '{"id": "msg_popular_001", "type": "coupon", "content": "Amazon Great Sale - 50% OFF!", "metadata": {"store": "Amazon", "discountValue": 50}}',
 '["channel_raj_123456789", "channel_amit_456789123"]',
 'completed',
 '{"totalTargets": 2, "successful": 1, "failed": 1}');

-- Insert AI prompt templates
INSERT INTO ai_prompt_templates (name, category, template, variables, priority) VALUES
('Greeting Template', 'greeting', 
 'Привет, {{userName}}! 👋 Рад видеть вас снова в Zabardoo. Готов помочь найти лучшие купоны и скидки! Что вас интересует сегодня?',
 '["userName"]', 1),
('Coupon Recommendation Template', 'coupon_recommendation',
 'Специально для вас я нашел отличное предложение! 🎯\n\n{{couponTitle}}\n💰 Скидка: {{discount}}\n🏪 Магазин: {{store}}\n\n{{personalizedReason}}',
 '["couponTitle", "discount", "store", "personalizedReason"]', 1),
('Product Inquiry Template', 'product_inquiry',
 'Отличный выбор! По запросу "{{productQuery}}" я могу предложить следующие варианты:\n\n{{recommendations}}\n\nХотите узнать больше о каком-то из предложений?',
 '["productQuery", "recommendations"]', 1),
('Support Template', 'support',
 'Я готов помочь! 🤝 По вашему вопросу "{{userQuestion}}" могу сказать следующее:\n\n{{supportAnswer}}\n\nЕсли нужна дополнительная помощь, обращайтесь!',
 '["userQuestion", "supportAnswer"]', 1);

-- Insert sample AI conversations
INSERT INTO ai_conversations (user_id, channel_id, status, context) VALUES
((SELECT id FROM users WHERE telegram_id = 123456789),
 'channel_raj_123456789', 'active',
 '{"userProfile": {"name": "Raj", "preferences": ["Electronics", "Fashion"], "purchaseHistory": [], "lifetimeValue": 2500, "churnRisk": 0.2}, "conversationHistory": [], "currentIntent": "greeting", "lastInteraction": "2024-01-01T10:00:00Z"}'),
((SELECT id FROM users WHERE telegram_id = 987654321),
 'channel_priya_987654321', 'active',
 '{"userProfile": {"name": "Priya", "preferences": ["Beauty", "Fashion"], "purchaseHistory": [], "lifetimeValue": 1800, "churnRisk": 0.15}, "conversationHistory": [], "currentIntent": "coupon_search", "lastInteraction": "2024-01-01T11:00:00Z"}');

-- Insert sample AI messages
INSERT INTO ai_messages (conversation_id, role, content, message_type, metadata) VALUES
((SELECT id FROM ai_conversations WHERE channel_id = 'channel_raj_123456789'),
 'user', 'Привет! Ищу скидки на электронику', 'text',
 '{"intent": "coupon_search", "entities": [{"type": "category", "value": "электроника", "confidence": 0.95}]}'),
((SELECT id FROM ai_conversations WHERE channel_id = 'channel_raj_123456789'),
 'assistant', 'Привет, Raj! 👋 Отлично, что ищете скидки на электронику! У меня есть несколько отличных предложений для вас...', 'coupon_recommendation',
 '{"intent": "coupon_recommendation", "confidence": 0.9, "recommendations": ["coupon_1", "coupon_2"]}'),
((SELECT id FROM ai_conversations WHERE channel_id = 'channel_priya_987654321'),
 'user', 'Покажи купоны на косметику', 'text',
 '{"intent": "coupon_search", "entities": [{"type": "category", "value": "косметика", "confidence": 0.9}]}'),
((SELECT id FROM ai_conversations WHERE channel_id = 'channel_priya_987654321'),
 'assistant', 'Priya, у меня есть замечательные предложения по косметике! 💄 Специально подобрала для вас...', 'coupon_recommendation',
 '{"intent": "coupon_recommendation", "confidence": 0.85, "recommendations": ["coupon_3"]}');

-- Insert sample coupon recommendations
INSERT INTO coupon_recommendations (user_id, coupon_id, recommendation_reason, confidence, personalized_message, metadata, was_accepted) VALUES
((SELECT id FROM users WHERE telegram_id = 123456789),
 (SELECT id FROM coupons WHERE title LIKE 'Flipkart Big Billion Days%'),
 'AI рекомендация на основе предпочтений пользователя в категории Электроника',
 0.92,
 'Raj, этот купон идеально подходит для вас! Вы часто покупаете электронику, а здесь скидка 80% на смартфоны и ноутбуки.',
 '{"userPreferences": ["Electronics"], "matchingFactors": ["category_match", "high_discount", "popular_store"], "discountValue": 80, "store": "Flipkart", "category": "Electronics"}',
 true),
((SELECT id FROM users WHERE telegram_id = 987654321),
 (SELECT id FROM coupons WHERE title LIKE 'Nykaa Beauty Bonanza%'),
 'AI рекомендация на основе предпочтений пользователя в категории Красота',
 0.88,
 'Priya, специально для вас! Знаю, что вы любите косметику Nykaa, а тут акция "купи 2 - получи 1 бесплатно".',
 '{"userPreferences": ["Beauty"], "matchingFactors": ["store_preference", "category_match", "special_offer"], "discountValue": 33, "store": "Nykaa", "category": "Beauty"}',
 true),
((SELECT id FROM users WHERE telegram_id = 456789123),
 (SELECT id FROM coupons WHERE title LIKE 'Swiggy Super Saver%'),
 'AI рекомендация на основе предпочтений пользователя в категории Еда',
 0.75,
 'Amit, отличная возможность сэкономить на заказе еды! 60% скидка + бесплатная доставка в Swiggy.',
 '{"userPreferences": ["Food"], "matchingFactors": ["category_match", "free_delivery"], "discountValue": 60, "store": "Swiggy", "category": "Food"}',
 false);

-- Update user lifetime values based on purchases
UPDATE users SET 
    lifetime_value = (
        SELECT COALESCE(SUM(order_value), 0) 
        FROM purchase_history 
        WHERE purchase_history.user_id = users.id AND status = 'confirmed'
    ),
    last_active_at = CURRENT_TIMESTAMP - INTERVAL '1 hour'
WHERE id IN (
    SELECT id FROM users WHERE telegram_id IN (123456789, 987654321, 456789123)
);

-- Recommendation System Seed Data

-- Insert user profiles for recommendation system
INSERT INTO user_profiles (user_id, demographics, preferences, behavior, engagement) VALUES
((SELECT id FROM users WHERE telegram_id = 123456789),
 '{"age_range": "25-34", "gender": "male", "location": "Mumbai", "income_level": "middle", "occupation": "software_engineer"}',
 '{"categories": ["Electronics", "Fashion"], "stores": ["Amazon", "Flipkart"], "price_sensitivity": 0.7, "brand_preferences": ["Samsung", "Nike"], "discount_threshold": 20}',
 '{"avg_session_duration": 300, "purchase_frequency": "weekly", "preferred_shopping_time": "evening", "device_usage": "mobile", "social_sharing_tendency": 0.6}',
 '{"click_through_rate": 0.15, "conversion_rate": 0.08, "recommendation_acceptance_rate": 0.25, "feedback_frequency": 0.1, "last_active": "2024-01-01T18:00:00Z"}'),

((SELECT id FROM users WHERE telegram_id = 987654321),
 '{"age_range": "22-28", "gender": "female", "location": "Delhi", "income_level": "middle", "occupation": "marketing_manager"}',
 '{"categories": ["Beauty", "Fashion"], "stores": ["Myntra", "Nykaa"], "price_sensitivity": 0.6, "brand_preferences": ["Lakme", "Zara"], "discount_threshold": 15}',
 '{"avg_session_duration": 420, "purchase_frequency": "bi-weekly", "preferred_shopping_time": "afternoon", "device_usage": "mobile", "social_sharing_tendency": 0.8}',
 '{"click_through_rate": 0.18, "conversion_rate": 0.12, "recommendation_acceptance_rate": 0.35, "feedback_frequency": 0.15, "last_active": "2024-01-01T14:00:00Z"}'),

((SELECT id FROM users WHERE telegram_id = 456789123),
 '{"age_range": "30-35", "gender": "male", "location": "Bangalore", "income_level": "high", "occupation": "product_manager"}',
 '{"categories": ["Food", "Travel"], "stores": ["Swiggy", "MakeMyTrip"], "price_sensitivity": 0.4, "brand_preferences": ["Dominos", "Taj"], "discount_threshold": 10}',
 '{"avg_session_duration": 180, "purchase_frequency": "daily", "preferred_shopping_time": "evening", "device_usage": "mobile", "social_sharing_tendency": 0.3}',
 '{"click_through_rate": 0.22, "conversion_rate": 0.18, "recommendation_acceptance_rate": 0.45, "feedback_frequency": 0.05, "last_active": "2024-01-01T20:00:00Z"}');

-- Insert recommendation engines
INSERT INTO recommendation_engines (name, type, configuration, is_active, priority, performance_metrics) VALUES
('Content-Based Engine v1', 'content_based',
 '{"similarity_threshold": 0.7, "max_recommendations": 20, "feature_weights": {"category": 0.3, "store": 0.2, "discount": 0.25, "brand": 0.15, "seasonal": 0.1}, "personalization_factor": 0.8}',
 true, 1,
 '{"avg_precision": 0.75, "avg_recall": 0.68, "avg_ctr": 0.15, "avg_conversion": 0.08, "user_satisfaction": 4.2}'),

('Collaborative Filtering Engine v1', 'collaborative',
 '{"min_similarity": 0.6, "neighbor_count": 50, "rating_threshold": 3.0, "implicit_feedback_weight": 0.3, "explicit_feedback_weight": 0.7}',
 true, 2,
 '{"avg_precision": 0.72, "avg_recall": 0.71, "avg_ctr": 0.17, "avg_conversion": 0.09, "user_satisfaction": 4.1}'),

('Hybrid Engine v1', 'hybrid',
 '{"content_weight": 0.6, "collaborative_weight": 0.4, "trending_boost": 0.1, "diversity_factor": 0.2, "freshness_decay": 0.95, "popularity_boost": 0.15}',
 true, 3,
 '{"avg_precision": 0.78, "avg_recall": 0.73, "avg_ctr": 0.19, "avg_conversion": 0.11, "user_satisfaction": 4.4}'),

('Trending Engine v1', 'trending',
 '{"time_window_hours": 24, "popularity_threshold": 0.7, "engagement_weight": 0.5, "recency_weight": 0.3, "conversion_weight": 0.2}',
 true, 4,
 '{"avg_precision": 0.65, "avg_recall": 0.82, "avg_ctr": 0.21, "avg_conversion": 0.07, "user_satisfaction": 3.9}');

-- Insert user similarity data
INSERT INTO user_similarity (user_id_1, user_id_2, similarity_score, common_preferences, interaction_overlap, demographic_similarity) VALUES
((SELECT id FROM users WHERE telegram_id = 123456789),
 (SELECT id FROM users WHERE telegram_id = 987654321),
 0.65, '["Fashion"]', 0.4, 0.7),

((SELECT id FROM users WHERE telegram_id = 123456789),
 (SELECT id FROM users WHERE telegram_id = 456789123),
 0.45, '[]', 0.2, 0.8),

((SELECT id FROM users WHERE telegram_id = 987654321),
 (SELECT id FROM users WHERE telegram_id = 456789123),
 0.35, '[]', 0.1, 0.6);

-- Insert coupon features for content-based recommendations
INSERT INTO coupon_features (coupon_id, features, embedding) VALUES
((SELECT id FROM coupons WHERE title LIKE 'Flipkart Big Billion Days%'),
 '{"category_vector": [1, 0, 0, 0, 0], "store_popularity": 0.95, "discount_attractiveness": 0.8, "seasonal_relevance": 0.9, "brand_strength": 0.9, "price_competitiveness": 0.85, "user_rating": 4.5, "conversion_history": 0.12}',
 ARRAY[0.1, 0.2, 0.8, 0.1, 0.3, 0.9, 0.2, 0.7, 0.4, 0.6, 0.3, 0.8, 0.1, 0.5, 0.7, 0.2, 0.9, 0.3, 0.6, 0.4, 0.8, 0.1, 0.7, 0.5, 0.2, 0.9, 0.3, 0.6, 0.4, 0.8, 0.1, 0.7, 0.5, 0.2, 0.9, 0.3, 0.6, 0.4, 0.8, 0.1, 0.7, 0.5, 0.2, 0.9, 0.3, 0.6, 0.4, 0.8, 0.1, 0.7]),

((SELECT id FROM coupons WHERE title LIKE 'Amazon India Great Indian Festival%'),
 '{"category_vector": [1, 0, 0, 0, 0], "store_popularity": 0.92, "discount_attractiveness": 0.1, "seasonal_relevance": 0.85, "brand_strength": 0.95, "price_competitiveness": 0.9, "user_rating": 4.3, "conversion_history": 0.15}',
 ARRAY[0.2, 0.1, 0.9, 0.2, 0.4, 0.8, 0.3, 0.6, 0.5, 0.7, 0.2, 0.9, 0.1, 0.4, 0.8, 0.3, 0.7, 0.2, 0.5, 0.6, 0.9, 0.1, 0.8, 0.4, 0.3, 0.7, 0.2, 0.5, 0.6, 0.9, 0.1, 0.8, 0.4, 0.3, 0.7, 0.2, 0.5, 0.6, 0.9, 0.1, 0.8, 0.4, 0.3, 0.7, 0.2, 0.5, 0.6, 0.9, 0.1, 0.8]),

((SELECT id FROM coupons WHERE title LIKE 'Myntra End of Reason Sale%'),
 '{"category_vector": [0, 1, 0, 0, 0], "store_popularity": 0.88, "discount_attractiveness": 0.7, "seasonal_relevance": 0.75, "brand_strength": 0.85, "price_competitiveness": 0.8, "user_rating": 4.2, "conversion_history": 0.1}',
 ARRAY[0.3, 0.2, 0.7, 0.3, 0.5, 0.6, 0.4, 0.8, 0.2, 0.9, 0.1, 0.7, 0.3, 0.5, 0.6, 0.4, 0.8, 0.2, 0.9, 0.1, 0.7, 0.3, 0.5, 0.6, 0.4, 0.8, 0.2, 0.9, 0.1, 0.7, 0.3, 0.5, 0.6, 0.4, 0.8, 0.2, 0.9, 0.1, 0.7, 0.3, 0.5, 0.6, 0.4, 0.8, 0.2, 0.9, 0.1, 0.7, 0.3, 0.5]),

((SELECT id FROM coupons WHERE title LIKE 'Nykaa Beauty Bonanza%'),
 '{"category_vector": [0, 0, 1, 0, 0], "store_popularity": 0.82, "discount_attractiveness": 0.6, "seasonal_relevance": 0.7, "brand_strength": 0.8, "price_competitiveness": 0.75, "user_rating": 4.4, "conversion_history": 0.11}',
 ARRAY[0.4, 0.3, 0.6, 0.4, 0.6, 0.5, 0.5, 0.7, 0.3, 0.8, 0.2, 0.6, 0.4, 0.6, 0.5, 0.5, 0.7, 0.3, 0.8, 0.2, 0.6, 0.4, 0.6, 0.5, 0.5, 0.7, 0.3, 0.8, 0.2, 0.6, 0.4, 0.6, 0.5, 0.5, 0.7, 0.3, 0.8, 0.2, 0.6, 0.4, 0.6, 0.5, 0.5, 0.7, 0.3, 0.8, 0.2, 0.6, 0.4, 0.6]),

((SELECT id FROM coupons WHERE title LIKE 'Swiggy Super Saver%'),
 '{"category_vector": [0, 0, 0, 1, 0], "store_popularity": 0.9, "discount_attractiveness": 0.6, "seasonal_relevance": 0.5, "brand_strength": 0.85, "price_competitiveness": 0.9, "user_rating": 4.1, "conversion_history": 0.18}',
 ARRAY[0.5, 0.4, 0.5, 0.5, 0.7, 0.4, 0.6, 0.6, 0.4, 0.7, 0.3, 0.5, 0.5, 0.7, 0.4, 0.6, 0.6, 0.4, 0.7, 0.3, 0.5, 0.5, 0.7, 0.4, 0.6, 0.6, 0.4, 0.7, 0.3, 0.5, 0.5, 0.7, 0.4, 0.6, 0.6, 0.4, 0.7, 0.3, 0.5, 0.5, 0.7, 0.4, 0.6, 0.6, 0.4, 0.7, 0.3, 0.5, 0.5, 0.7]);

-- Insert sample recommendation requests
INSERT INTO recommendation_requests (user_id, context, filters) VALUES
((SELECT id FROM users WHERE telegram_id = 123456789),
 '{"time_of_day": "evening", "device": "mobile", "location": "Mumbai", "session_duration": 300}',
 '{"limit": 10, "categories": ["Electronics", "Fashion"], "min_discount": 20}'),

((SELECT id FROM users WHERE telegram_id = 987654321),
 '{"time_of_day": "afternoon", "device": "mobile", "location": "Delhi", "session_duration": 420}',
 '{"limit": 8, "categories": ["Beauty", "Fashion"], "min_discount": 15}'),

((SELECT id FROM users WHERE telegram_id = 456789123),
 '{"time_of_day": "evening", "device": "mobile", "location": "Bangalore", "session_duration": 180}',
 '{"limit": 5, "categories": ["Food", "Travel"], "min_discount": 10}');

-- Insert sample recommendation results
INSERT INTO recommendation_results (request_id, user_id, recommendations, metadata) VALUES
((SELECT id FROM recommendation_requests WHERE user_id = (SELECT id FROM users WHERE telegram_id = 123456789) LIMIT 1),
 (SELECT id FROM users WHERE telegram_id = 123456789),
 '[{"couponId": "' || (SELECT id FROM coupons WHERE title LIKE 'Flipkart Big Billion Days%') || '", "score": 0.92, "personalization_score": 0.88, "predicted_ctr": 0.18, "confidence": 0.85, "reasoning": "High match for Electronics category and Flipkart store preference", "rank": 1}, {"couponId": "' || (SELECT id FROM coupons WHERE title LIKE 'Amazon India Great Indian Festival%') || '", "score": 0.78, "personalization_score": 0.75, "predicted_ctr": 0.14, "confidence": 0.72, "reasoning": "Good match for Electronics category", "rank": 2}]',
 '{"engine_used": "Hybrid Engine v1", "processing_time": 145, "total_candidates": 8, "filtered_count": 2, "ranking_factors": ["score", "personalization", "predicted_ctr"]}'),

((SELECT id FROM recommendation_requests WHERE user_id = (SELECT id FROM users WHERE telegram_id = 987654321) LIMIT 1),
 (SELECT id FROM users WHERE telegram_id = 987654321),
 '[{"couponId": "' || (SELECT id FROM coupons WHERE title LIKE 'Nykaa Beauty Bonanza%') || '", "score": 0.89, "personalization_score": 0.91, "predicted_ctr": 0.22, "confidence": 0.88, "reasoning": "Perfect match for Beauty category and Nykaa store preference", "rank": 1}, {"couponId": "' || (SELECT id FROM coupons WHERE title LIKE 'Myntra End of Reason Sale%') || '", "score": 0.82, "personalization_score": 0.85, "predicted_ctr": 0.19, "confidence": 0.81, "reasoning": "Excellent match for Fashion category and Myntra preference", "rank": 2}]',
 '{"engine_used": "Content-Based Engine v1", "processing_time": 98, "total_candidates": 6, "filtered_count": 2, "ranking_factors": ["score", "personalization", "predicted_ctr"]}');

-- Insert sample recommendation feedback
INSERT INTO recommendation_feedback (user_id, coupon_id, recommendation_id, feedback_type, rating, comment, implicit_feedback) VALUES
((SELECT id FROM users WHERE telegram_id = 123456789),
 (SELECT id FROM coupons WHERE title LIKE 'Flipkart Big Billion Days%'),
 (SELECT id FROM recommendation_results WHERE user_id = (SELECT id FROM users WHERE telegram_id = 123456789) LIMIT 1),
 'click', 5, 'Great recommendation! Exactly what I was looking for.',
 '{"time_spent": 45, "scroll_depth": 0.9, "interaction_count": 3}'),

((SELECT id FROM users WHERE telegram_id = 987654321),
 (SELECT id FROM coupons WHERE title LIKE 'Nykaa Beauty Bonanza%'),
 (SELECT id FROM recommendation_results WHERE user_id = (SELECT id FROM users WHERE telegram_id = 987654321) LIMIT 1),
 'purchase', 5, 'Perfect! Bought 3 items with this offer.',
 '{"time_spent": 120, "scroll_depth": 1.0, "interaction_count": 8}'),

((SELECT id FROM users WHERE telegram_id = 456789123),
 (SELECT id FROM coupons WHERE title LIKE 'Swiggy Super Saver%'),
 NULL,
 'view', 3, 'Good deal but not interested right now.',
 '{"time_spent": 15, "scroll_depth": 0.3, "interaction_count": 1}');

-- Insert recommendation metrics
INSERT INTO recommendation_metrics (engine_id, date, metrics) VALUES
((SELECT id FROM recommendation_engines WHERE name = 'Content-Based Engine v1'),
 CURRENT_DATE - INTERVAL '1 day',
 '{"total_requests": 150, "total_recommendations": 1200, "click_through_rate": 0.15, "conversion_rate": 0.08, "user_satisfaction": 4.2, "avg_response_time": 120, "precision": 0.75, "recall": 0.68, "diversity_score": 0.65}'),

((SELECT id FROM recommendation_engines WHERE name = 'Collaborative Filtering Engine v1'),
 CURRENT_DATE - INTERVAL '1 day',
 '{"total_requests": 120, "total_recommendations": 960, "click_through_rate": 0.17, "conversion_rate": 0.09, "user_satisfaction": 4.1, "avg_response_time": 180, "precision": 0.72, "recall": 0.71, "diversity_score": 0.58}'),

((SELECT id FROM recommendation_engines WHERE name = 'Hybrid Engine v1'),
 CURRENT_DATE - INTERVAL '1 day',
 '{"total_requests": 200, "total_recommendations": 1600, "click_through_rate": 0.19, "conversion_rate": 0.11, "user_satisfaction": 4.4, "avg_response_time": 145, "precision": 0.78, "recall": 0.73, "diversity_score": 0.72}'),

((SELECT id FROM recommendation_engines WHERE name = 'Trending Engine v1'),
 CURRENT_DATE - INTERVAL '1 day',
 '{"total_requests": 80, "total_recommendations": 640, "click_through_rate": 0.21, "conversion_rate": 0.07, "user_satisfaction": 3.9, "avg_response_time": 95, "precision": 0.65, "recall": 0.82, "diversity_score": 0.45}');

-- Insert A/B test experiments
INSERT INTO ab_test_experiments (name, description, control_engine_id, test_engine_id, traffic_split, start_date, end_date, status, results) VALUES
('Content vs Hybrid Engine Test', 'Testing performance of Content-Based vs Hybrid recommendation engines',
 (SELECT id FROM recommendation_engines WHERE name = 'Content-Based Engine v1'),
 (SELECT id FROM recommendation_engines WHERE name = 'Hybrid Engine v1'),
 0.50, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '7 days', 'active',
 '{"control_ctr": 0.15, "test_ctr": 0.19, "control_conversion": 0.08, "test_conversion": 0.11, "statistical_significance": 0.95, "winner": "test"}'),

('Collaborative vs Trending Test', 'Comparing Collaborative Filtering with Trending recommendations',
 (SELECT id FROM recommendation_engines WHERE name = 'Collaborative Filtering Engine v1'),
 (SELECT id FROM recommendation_engines WHERE name = 'Trending Engine v1'),
 0.50, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '9 days', 'active',
 '{"control_ctr": 0.17, "test_ctr": 0.21, "control_conversion": 0.09, "test_conversion": 0.07, "statistical_significance": 0.88, "winner": "inconclusive"}');

-- Insert user experiment assignments
INSERT INTO user_experiment_assignments (user_id, experiment_id, variant) VALUES
((SELECT id FROM users WHERE telegram_id = 123456789),
 (SELECT id FROM ab_test_experiments WHERE name = 'Content vs Hybrid Engine Test'),
 'test'),

((SELECT id FROM users WHERE telegram_id = 987654321),
 (SELECT id FROM ab_test_experiments WHERE name = 'Content vs Hybrid Engine Test'),
 'control'),

((SELECT id FROM users WHERE telegram_id = 456789123),
 (SELECT id FROM ab_test_experiments WHERE name = 'Collaborative vs Trending Test'),
 'test');
-- Loa
d coupon sync tables migration
\i /docker-entrypoint-initdb.d/migrations/004-create-coupon-sync-tables.sql-- Load a
ffiliate link tables migration
\i /docker-entrypoint-initdb.d/migrations/005-create-affiliate-link-tables.sql-- 
Load Indian stores enhancement migration
\i /docker-entrypoint-initdb.d/migrations/006-enhance-indian-stores.sql-- 
Load traffic manager tables migration
\i /docker-entrypoint-initdb.d/migrations/007-create-traffic-manager-tables.sql
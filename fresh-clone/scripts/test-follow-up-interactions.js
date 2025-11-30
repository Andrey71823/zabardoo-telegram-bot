#!/usr/bin/env node

const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bazaarGuru_bot',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function testFollowUpInteractions() {
  console.log('🧪 Testing Follow-Up Interactions System...\n');

  try {
    // Test 1: Create follow-up execution record
    console.log('1️⃣ Testing follow-up execution creation...');
    const followUpExecutionResult = await pool.query(`
      INSERT INTO campaign_executions (
        campaign_id, user_id, execution_date, action_type, action_parameters,
        status, response_data, cost
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      'campaign-123',
      'test-user-456',
      new Date(),
      'send_message',
      JSON.stringify({
        channel: 'telegram',
        template: 'post_purchase_thank_you',
        content: 'Thank you for your purchase! Here are some products you might love.',
        personalization: {
          firstName: 'John',
          orderValue: 2500,
          productCategory: 'electronics'
        },
        offers: [
          {
            type: 'discount',
            value: 10,
            description: '10% off your next purchase',
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            conditions: ['minimum_order_500']
          }
        ]
      }),
      'sent',
      JSON.stringify({
        messageId: 'msg_789',
        sentAt: new Date(),
        deliveryStatus: 'delivered',
        readReceipt: false
      }),
      15.50
    ]);
    console.log('✅ Follow-up execution created:', followUpExecutionResult.rows[0].id);

    // Test 2: Create seasonal campaign
    console.log('\n2️⃣ Testing seasonal campaign creation...');
    const seasonalCampaignResult = await pool.query(`
      INSERT INTO retention_campaigns (
        name, description, campaign_type, status, target_segment, triggers,
        actions, schedule, budget, start_date, end_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      'Diwali Festival Campaign 2024',
      'Special Diwali offers and recommendations for active users',
      'proactive',
      'active',
      JSON.stringify({
        segmentType: 'engagement_level',
        criteria: [
          {
            field: 'activity_status',
            operator: 'equals',
            value: 'active',
            logicalOperator: 'AND'
          },
          {
            field: 'last_purchase_days',
            operator: 'less_than',
            value: 90,
            logicalOperator: 'AND'
          }
        ],
        estimatedSize: 500,
        refreshFrequency: 'daily'
      }),
      JSON.stringify([
        {
          triggerType: 'time_based',
          conditions: [
            {
              field: 'campaign_start_date',
              operator: 'equals',
              value: '2024-10-20',
              timeWindow: 1440
            }
          ],
          frequency: 'once'
        }
      ]),
      JSON.stringify([
        {
          actionType: 'send_message',
          parameters: {
            channel: 'telegram',
            template: 'diwali_greetings',
            content: 'Happy Diwali! 🪔 Celebrate with exclusive festival offers.',
            seasonalOffers: [
              {
                name: 'Diwali Special',
                description: '25% off on electronics and home decor',
                discountType: 'percentage',
                discountValue: 25,
                categories: ['electronics', 'home_decor'],
                validUntil: '2024-11-05',
                limitPerUser: 1
              }
            ]
          },
          delay: 0
        },
        {
          actionType: 'send_offer',
          parameters: {
            offerType: 'festival_bonus',
            value: 500,
            description: 'Festival bonus cashback on orders above ₹2000',
            validityPeriod: 15,
            conditions: ['minimum_order_2000', 'festival_items']
          },
          delay: 1440
        }
      ]),
      JSON.stringify({
        scheduleType: 'scheduled',
        startTime: '2024-10-20T09:00:00Z',
        endTime: '2024-11-05T23:59:59Z',
        timezone: 'Asia/Kolkata',
        recurrence: {
          frequency: 'daily',
          interval: 1,
          endDate: '2024-11-05'
        }
      }),
      JSON.stringify({
        totalBudget: 15000,
        currency: 'INR',
        spentAmount: 0,
        costPerAction: 30,
        budgetAllocation: [
          {
            category: 'messaging',
            allocatedAmount: 8000,
            spentAmount: 0,
            percentage: 53.3
          },
          {
            category: 'offers',
            allocatedAmount: 7000,
            spentAmount: 0,
            percentage: 46.7
          }
        ],
        alertThresholds: [50, 75, 90]
      }),
      new Date('2024-10-20'),
      new Date('2024-11-05'),
      'marketing-manager-001'
    ]);
    console.log('✅ Seasonal campaign created:', seasonalCampaignResult.rows[0].id);

    // Test 3: Create post-purchase follow-up sequence
    console.log('\n3️⃣ Testing post-purchase follow-up sequence...');
    
    // Immediate thank you message
    const thankYouExecution = await pool.query(`
      INSERT INTO campaign_executions (
        campaign_id, user_id, execution_date, action_type, action_parameters,
        status, cost, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      'post-purchase-sequence-001',
      'customer-789',
      new Date(),
      'send_message',
      JSON.stringify({
        channel: 'telegram',
        template: 'immediate_thank_you',
        content: 'Thank you for your purchase! Your order #ORD123 is being processed.',
        orderDetails: {
          orderId: 'ORD123',
          orderValue: 3500,
          items: [
            { name: 'Wireless Headphones', price: 2500, quantity: 1 },
            { name: 'Phone Case', price: 1000, quantity: 1 }
          ],
          estimatedDelivery: '2024-02-15'
        }
      }),
      'sent',
      5.00,
      JSON.stringify({
        followUpType: 'immediate_thank_you',
        sequenceStep: 1,
        orderValue: 3500,
        customerSegment: 'regular'
      })
    ]);

    // Product care tips (3 days later)
    const careTipsExecution = await pool.query(`
      INSERT INTO campaign_executions (
        campaign_id, user_id, execution_date, action_type, action_parameters,
        status, cost, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      'post-purchase-sequence-001',
      'customer-789',
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days later
      'send_message',
      JSON.stringify({
        channel: 'telegram',
        template: 'product_care_tips',
        content: 'Here are some tips to get the most out of your new wireless headphones:',
        tips: [
          'Charge fully before first use',
          'Keep away from moisture',
          'Store in the provided case',
          'Clean regularly with a soft cloth'
        ],
        supportLink: 'https://support.example.com/headphones'
      }),
      'scheduled',
      8.00,
      JSON.stringify({
        followUpType: 'product_care',
        sequenceStep: 2,
        delayDays: 3
      })
    ]);

    // Cross-sell recommendations (1 week later)
    const crossSellExecution = await pool.query(`
      INSERT INTO campaign_executions (
        campaign_id, user_id, execution_date, action_type, action_parameters,
        status, cost, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      'post-purchase-sequence-001',
      'customer-789',
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week later
      'send_offer',
      JSON.stringify({
        channel: 'telegram',
        template: 'cross_sell_recommendations',
        content: 'Complete your audio setup with these perfect companions:',
        recommendations: [
          {
            productId: 'wireless-charger-001',
            productName: 'Wireless Charging Pad',
            category: 'accessories',
            price: 1500,
            discountPrice: 1200,
            reason: 'Perfect for your wireless headphones',
            confidence: 0.9
          },
          {
            productId: 'bluetooth-speaker-002',
            productName: 'Portable Bluetooth Speaker',
            category: 'audio',
            price: 2800,
            discountPrice: 2400,
            reason: 'Customers who bought headphones also love this',
            confidence: 0.85
          }
        ],
        specialOffer: {
          type: 'discount',
          value: 15,
          description: '15% off on recommended items',
          validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          conditions: ['recommended_items_only']
        }
      }),
      'scheduled',
      20.00,
      JSON.stringify({
        followUpType: 'cross_sell',
        sequenceStep: 3,
        delayDays: 7,
        recommendationCount: 2
      })
    ]);

    console.log('✅ Post-purchase sequence created:');
    console.log(`  - Thank you: ${thankYouExecution.rows[0].id}`);
    console.log(`  - Care tips: ${careTipsExecution.rows[0].id}`);
    console.log(`  - Cross-sell: ${crossSellExecution.rows[0].id}`);

    // Test 4: Create loyalty program follow-up
    console.log('\n4️⃣ Testing loyalty program follow-up...');
    const loyaltyFollowUpResult = await pool.query(`
      INSERT INTO campaign_executions (
        campaign_id, user_id, execution_date, action_type, action_parameters,
        status, cost, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      'loyalty-program-001',
      'vip-customer-456',
      new Date(),
      'send_message',
      JSON.stringify({
        channel: 'telegram',
        template: 'loyalty_milestone',
        content: 'Congratulations! You\'ve reached VIP status in our loyalty program! 🌟',
        milestoneDetails: {
          currentTier: 'VIP',
          previousTier: 'Gold',
          totalSpent: 25000,
          pointsEarned: 2500,
          pointsBalance: 3200,
          nextTierRequirement: 50000
        },
        vipBenefits: [
          'Free shipping on all orders',
          'Early access to sales',
          'Dedicated customer support',
          'Exclusive VIP-only deals',
          'Birthday month special offers'
        ],
        exclusiveOffer: {
          type: 'cashback',
          value: 1000,
          description: 'VIP Welcome Bonus - ₹1000 cashback',
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          conditions: ['vip_members_only', 'minimum_order_2000']
        }
      }),
      'sent',
      25.00,
      JSON.stringify({
        followUpType: 'loyalty_milestone',
        customerTier: 'VIP',
        milestoneType: 'tier_upgrade',
        lifetimeValue: 25000
      })
    ]);
    console.log('✅ Loyalty program follow-up created:', loyaltyFollowUpResult.rows[0].id);

    // Test 5: Create win-back campaign execution
    console.log('\n5️⃣ Testing win-back campaign execution...');
    const winBackExecutionResult = await pool.query(`
      INSERT INTO campaign_executions (
        campaign_id, user_id, execution_date, action_type, action_parameters,
        status, cost, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      'winback-campaign-002',
      'inactive-user-789',
      new Date(),
      'send_offer',
      JSON.stringify({
        channel: 'telegram',
        template: 'winback_aggressive',
        content: 'We miss you! Come back with this exclusive offer just for you.',
        personalizedMessage: {
          lastPurchaseDate: '2023-11-15',
          daysSinceLastPurchase: 90,
          favoriteCategory: 'electronics',
          previousOrderValue: 4500
        },
        winbackOffer: {
          type: 'percentage_discount',
          value: 35,
          description: 'Exclusive 35% discount on your next purchase',
          validityPeriod: 14,
          usageLimit: 1,
          conditions: ['minimum_order_1000', 'inactive_users_only'],
          personalizedElements: [
            {
              elementType: 'product_recommendation',
              personalizationLogic: 'previous_purchases',
              fallbackValue: 'bestsellers'
            },
            {
              elementType: 'discount_amount',
              personalizationLogic: 'lifetime_value_based',
              fallbackValue: 25
            }
          ]
        },
        urgencyIndicators: {
          countdown: true,
          limitedTime: true,
          exclusivity: 'personal_invitation'
        }
      }),
      'sent',
      35.00,
      JSON.stringify({
        followUpType: 'winback',
        campaignPhase: 1,
        churnRisk: 'high',
        daysSinceLastActivity: 90,
        escalationLevel: 'aggressive'
      })
    ]);
    console.log('✅ Win-back campaign execution created:', winBackExecutionResult.rows[0].id);

    // Test 6: Create seasonal reminder execution
    console.log('\n6️⃣ Testing seasonal reminder execution...');
    const seasonalReminderResult = await pool.query(`
      INSERT INTO campaign_executions (
        campaign_id, user_id, execution_date, action_type, action_parameters,
        status, cost, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      'seasonal-reminders-winter-2024',
      'active-user-123',
      new Date(),
      'send_message',
      JSON.stringify({
        channel: 'telegram',
        template: 'seasonal_reminder',
        content: 'Winter is here! ❄️ Stay warm with our cozy collection.',
        seasonalTheme: {
          season: 'winter',
          colors: ['#1E3A8A', '#FFFFFF', '#94A3B8'],
          mood: 'cozy_warm',
          keywords: ['warm', 'cozy', 'comfort', 'winter essentials']
        },
        seasonalOffers: [
          {
            name: 'Winter Warmth Sale',
            description: '40% off on winter clothing and accessories',
            discountType: 'percentage',
            discountValue: 40,
            categories: ['winter_clothing', 'accessories', 'home_heating'],
            validUntil: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
            limitPerUser: 2
          }
        ],
        productRecommendations: [
          {
            productId: 'winter-jacket-001',
            productName: 'Premium Winter Jacket',
            category: 'winter_clothing',
            price: 3500,
            discountPrice: 2100,
            reason: 'Perfect for the winter season',
            confidence: 0.95,
            seasonalRelevance: 'high'
          },
          {
            productId: 'room-heater-002',
            productName: 'Energy Efficient Room Heater',
            category: 'home_heating',
            price: 4500,
            discountPrice: 2700,
            reason: 'Stay warm at home',
            confidence: 0.88,
            seasonalRelevance: 'high'
          }
        ]
      }),
      'sent',
      12.00,
      JSON.stringify({
        followUpType: 'seasonal_reminder',
        season: 'winter',
        targetSegment: 'active_users',
        recommendationCount: 2
      })
    ]);
    console.log('✅ Seasonal reminder execution created:', seasonalReminderResult.rows[0].id);

    // Test 7: Test follow-up response tracking
    console.log('\n7️⃣ Testing follow-up response tracking...');
    const responseTrackingResult = await pool.query(`
      UPDATE campaign_executions 
      SET 
        status = $1,
        response_data = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [
      'converted',
      JSON.stringify({
        messageId: 'msg_789',
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        deliveryStatus: 'delivered',
        opened: true,
        openedAt: new Date(Date.now() - 90 * 60 * 1000), // 90 minutes ago
        clicked: true,
        clickedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        converted: true,
        convertedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        conversionValue: 2500,
        conversionDetails: {
          orderId: 'ORD456',
          products: [
            { id: 'prod-123', name: 'Smartphone', price: 2500 }
          ],
          paymentMethod: 'UPI',
          deliveryAddress: 'Mumbai, India'
        },
        engagementMetrics: {
          timeToOpen: 30, // minutes
          timeToClick: 60, // minutes
          timeToConvert: 90, // minutes
          clickThroughRate: 100,
          conversionRate: 100
        }
      }),
      followUpExecutionResult.rows[0].id
    ]);
    console.log('✅ Follow-up response tracked:', responseTrackingResult.rows[0].id);

    // Test 8: Analytics queries for follow-up performance
    console.log('\n8️⃣ Testing follow-up analytics queries...');
    
    // Follow-up performance by type
    const performanceByType = await pool.query(`
      SELECT 
        (metadata->>'followUpType') as follow_up_type,
        COUNT(*) as total_executions,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
        COUNT(CASE WHEN status = 'opened' THEN 1 END) as opened_count,
        COUNT(CASE WHEN status = 'clicked' THEN 1 END) as clicked_count,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_count,
        ROUND(AVG(cost), 2) as average_cost,
        SUM(cost) as total_cost,
        CASE 
          WHEN COUNT(CASE WHEN status = 'sent' THEN 1 END) > 0 
          THEN ROUND((COUNT(CASE WHEN status = 'opened' THEN 1 END)::decimal / COUNT(CASE WHEN status = 'sent' THEN 1 END) * 100), 2)
          ELSE 0 
        END as open_rate,
        CASE 
          WHEN COUNT(CASE WHEN status = 'opened' THEN 1 END) > 0 
          THEN ROUND((COUNT(CASE WHEN status = 'clicked' THEN 1 END)::decimal / COUNT(CASE WHEN status = 'opened' THEN 1 END) * 100), 2)
          ELSE 0 
        END as click_through_rate,
        CASE 
          WHEN COUNT(CASE WHEN status = 'clicked' THEN 1 END) > 0 
          THEN ROUND((COUNT(CASE WHEN status = 'converted' THEN 1 END)::decimal / COUNT(CASE WHEN status = 'clicked' THEN 1 END) * 100), 2)
          ELSE 0 
        END as conversion_rate
      FROM campaign_executions
      WHERE metadata->>'followUpType' IS NOT NULL
      GROUP BY (metadata->>'followUpType')
      ORDER BY total_executions DESC
    `);
    console.log('📊 Follow-up performance by type:', performanceByType.rows);

    // Campaign execution timeline
    const executionTimeline = await pool.query(`
      SELECT 
        DATE(execution_date) as execution_date,
        action_type,
        COUNT(*) as execution_count,
        COUNT(CASE WHEN status IN ('sent', 'delivered', 'opened', 'clicked', 'converted') THEN 1 END) as successful_count,
        SUM(cost) as daily_cost,
        ROUND(AVG(cost), 2) as average_cost_per_execution
      FROM campaign_executions
      WHERE execution_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(execution_date), action_type
      ORDER BY execution_date DESC, execution_count DESC
    `);
    console.log('📅 Campaign execution timeline:', executionTimeline.rows);

    // User engagement analysis
    const userEngagement = await pool.query(`
      SELECT 
        user_id,
        COUNT(*) as total_follow_ups,
        COUNT(CASE WHEN status = 'opened' THEN 1 END) as opened_count,
        COUNT(CASE WHEN status = 'clicked' THEN 1 END) as clicked_count,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_count,
        SUM(cost) as total_cost,
        CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND((COUNT(CASE WHEN status = 'converted' THEN 1 END)::decimal / COUNT(*) * 100), 2)
          ELSE 0 
        END as overall_conversion_rate,
        MAX(execution_date) as last_follow_up,
        COUNT(DISTINCT (metadata->>'followUpType')) as follow_up_types_received
      FROM campaign_executions
      GROUP BY user_id
      HAVING COUNT(*) > 1
      ORDER BY overall_conversion_rate DESC, total_follow_ups DESC
      LIMIT 10
    `);
    console.log('👥 Top user engagement:', userEngagement.rows);

    console.log('\n🎉 All follow-up interactions tests completed successfully!');
    console.log('\n📈 Summary:');
    console.log('- ✅ Follow-up execution tracking: Working');
    console.log('- ✅ Seasonal campaigns: Working');
    console.log('- ✅ Post-purchase sequences: Working');
    console.log('- ✅ Loyalty program follow-ups: Working');
    console.log('- ✅ Win-back campaigns: Working');
    console.log('- ✅ Seasonal reminders: Working');
    console.log('- ✅ Response tracking: Working');
    console.log('- ✅ Analytics queries: Working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run tests if called directly
if (require.main === module) {
  testFollowUpInteractions();
}

module.exports = { testFollowUpInteractions };
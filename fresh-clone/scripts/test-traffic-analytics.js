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

async function testTrafficAnalytics() {
  console.log('🧪 Testing Traffic Analytics System...\n');

  try {
    // Test 1: Create traffic dashboard
    console.log('1️⃣ Testing traffic dashboard creation...');
    const dashboardResult = await pool.query(`
      INSERT INTO traffic_dashboards (
        name, description, dashboard_type, widgets, filters, date_range,
        refresh_interval, is_public, owner_id, permissions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      'Revenue Analytics Dashboard',
      'Main dashboard for revenue and conversion analytics',
      'overview',
      JSON.stringify([
        {
          id: 'widget-1',
          type: 'chart',
          title: 'Daily Revenue Trend',
          position: { x: 0, y: 0, width: 6, height: 4 },
          dataSource: 'conversions',
          query: 'SELECT DATE(conversion_time) as date, SUM(order_value) as revenue FROM conversion_events GROUP BY DATE(conversion_time)',
          chartConfig: {
            chartType: 'line',
            xAxis: 'date',
            yAxis: 'revenue',
            showLegend: true
          },
          isVisible: true,
          metadata: {}
        },
        {
          id: 'widget-2',
          type: 'metric',
          title: 'Total Conversions',
          position: { x: 6, y: 0, width: 3, height: 2 },
          dataSource: 'conversions',
          query: 'SELECT COUNT(*) as total FROM conversion_events WHERE processing_status = \'confirmed\'',
          chartConfig: {
            chartType: 'gauge',
            colors: ['#4CAF50']
          },
          isVisible: true,
          metadata: {}
        }
      ]),
      JSON.stringify([
        {
          id: 'date-filter',
          name: 'Date Range',
          type: 'date_range',
          field: 'conversion_time',
          isRequired: true,
          isVisible: true
        },
        {
          id: 'channel-filter',
          name: 'Channel',
          type: 'select',
          field: 'source',
          options: [
            { label: 'All Channels', value: 'all', isDefault: true },
            { label: 'Personal Channels', value: 'telegram_personal_channel' },
            { label: 'Group Channels', value: 'telegram_group' }
          ],
          isRequired: false,
          isVisible: true
        }
      ]),
      JSON.stringify({
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        preset: 'last_30_days'
      }),
      300, // 5 minutes refresh
      false,
      'admin-user-123',
      JSON.stringify([
        {
          userId: 'manager-456',
          role: 'viewer',
          grantedAt: new Date(),
          grantedBy: 'admin-user-123'
        }
      ])
    ]);
    console.log('✅ Traffic dashboard created:', dashboardResult.rows[0].id);

    // Test 2: Create traffic report
    console.log('\n2️⃣ Testing traffic report creation...');
    const reportResult = await pool.query(`
      INSERT INTO traffic_reports (
        name, description, report_type, parameters, schedule, format, recipients
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      'Weekly Channel Performance Report',
      'Comprehensive weekly report on channel performance metrics',
      'channel_performance',
      JSON.stringify({
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          preset: 'last_7_days'
        },
        filters: {
          channelType: 'all',
          minRevenue: 1000
        },
        metrics: [
          'total_clicks',
          'total_conversions',
          'conversion_rate',
          'total_revenue',
          'average_order_value',
          'roi'
        ],
        dimensions: ['channel', 'date', 'device_type'],
        sortBy: 'total_revenue',
        sortOrder: 'desc',
        limit: 50,
        includeCharts: true
      }),
      JSON.stringify({
        frequency: 'weekly',
        time: '09:00',
        timezone: 'Asia/Kolkata',
        dayOfWeek: 1, // Monday
        isActive: true
      }),
      'pdf',
      JSON.stringify([
        'analytics@bazaarGuru.com',
        'management@bazaarGuru.com'
      ])
    ]);
    console.log('✅ Traffic report created:', reportResult.rows[0].id);

    // Test 3: Create A/B test
    console.log('\n3️⃣ Testing A/B test creation...');
    const abTestResult = await pool.query(`
      INSERT INTO ab_tests (
        name, description, test_type, status, start_date, end_date,
        traffic_allocation, variants, target_metric, success_criteria, statistical_settings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      'CTA Button Color Test',
      'Testing the impact of button color on conversion rates',
      'ui_variation',
      'running',
      new Date(),
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      100, // 100% traffic allocation
      JSON.stringify([
        {
          id: 'control',
          name: 'Control (Blue Button)',
          description: 'Original blue CTA button',
          trafficWeight: 50,
          configuration: {
            buttonColor: '#2196F3',
            buttonText: 'Get Deals Now'
          },
          isControl: true,
          metrics: {
            visitors: 0,
            conversions: 0,
            conversionRate: 0,
            revenue: 0,
            averageOrderValue: 0,
            clickThroughRate: 0,
            bounceRate: 0,
            timeOnSite: 0,
            customMetrics: {}
          }
        },
        {
          id: 'variant-red',
          name: 'Variant (Red Button)',
          description: 'New red CTA button',
          trafficWeight: 50,
          configuration: {
            buttonColor: '#F44336',
            buttonText: 'Get Deals Now'
          },
          isControl: false,
          metrics: {
            visitors: 0,
            conversions: 0,
            conversionRate: 0,
            revenue: 0,
            averageOrderValue: 0,
            clickThroughRate: 0,
            bounceRate: 0,
            timeOnSite: 0,
            customMetrics: {}
          }
        }
      ]),
      'conversion_rate',
      JSON.stringify({
        primaryMetric: 'conversion_rate',
        minimumDetectableEffect: 10, // 10% improvement
        minimumSampleSize: 1000,
        maximumDuration: 14, // days
        significanceLevel: 0.05,
        power: 0.8
      }),
      JSON.stringify({
        confidenceLevel: 95,
        testType: 'two_tailed',
        multipleTestingCorrection: 'none',
        sequentialTesting: false
      })
    ]);
    console.log('✅ A/B test created:', abTestResult.rows[0].id);

    // Test 4: Create channel performance record
    console.log('\n4️⃣ Testing channel performance creation...');
    const channelPerfResult = await pool.query(`
      INSERT INTO channel_performance (
        channel_id, channel_name, channel_type, date_range, metrics,
        trends, segments, top_performers, calculated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      'personal-channel-001',
      'Premium Deals Channel',
      'personal_channel',
      JSON.stringify({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        preset: 'last_30_days'
      }),
      JSON.stringify({
        totalClicks: 2500,
        uniqueClicks: 2000,
        totalConversions: 125,
        uniqueConversions: 115,
        conversionRate: 5.0,
        clickThroughRate: 15.5,
        totalRevenue: 62500,
        totalCommission: 3125,
        averageOrderValue: 500,
        returnOnAdSpend: 25.0,
        costPerClick: 1.25,
        costPerConversion: 25.0,
        lifetimeValue: 2500,
        retentionRate: 70.0,
        customMetrics: {
          bounceRate: 25.0,
          timeOnSite: 240,
          pagesPerSession: 4.2,
          mobileTrafficPercent: 75.0
        }
      }),
      JSON.stringify({
        clicksTrend: [
          { date: '2024-01-01', value: 80, change: 5, changePercent: 6.7 },
          { date: '2024-01-02', value: 85, change: 5, changePercent: 6.3 },
          { date: '2024-01-03', value: 90, change: 5, changePercent: 5.9 }
        ],
        conversionsTrend: [
          { date: '2024-01-01', value: 4, change: 1, changePercent: 33.3 },
          { date: '2024-01-02', value: 5, change: 1, changePercent: 25.0 },
          { date: '2024-01-03', value: 6, change: 1, changePercent: 20.0 }
        ],
        revenueTrend: [
          { date: '2024-01-01', value: 2000, change: 200, changePercent: 11.1 },
          { date: '2024-01-02', value: 2500, change: 500, changePercent: 25.0 },
          { date: '2024-01-03', value: 3000, change: 500, changePercent: 20.0 }
        ],
        seasonality: [
          { period: 'hour', value: '19', averageMetric: 120, indexValue: 150 },
          { period: 'day_of_week', value: '6', averageMetric: 100, indexValue: 130 },
          { period: 'day_of_month', value: '15', averageMetric: 95, indexValue: 105 }
        ],
        growthRate: 18.5,
        volatility: 12.3
      }),
      JSON.stringify([
        {
          segmentName: 'Device Type',
          segmentValue: 'Mobile',
          metrics: { totalClicks: 1875, conversionRate: 4.8, totalRevenue: 46875 },
          percentage: 75
        },
        {
          segmentName: 'Device Type',
          segmentValue: 'Desktop',
          metrics: { totalClicks: 625, conversionRate: 5.6, totalRevenue: 15625 },
          percentage: 25
        },
        {
          segmentName: 'Time of Day',
          segmentValue: 'Evening (6-10 PM)',
          metrics: { totalClicks: 1000, conversionRate: 6.2, totalRevenue: 31000 },
          percentage: 40
        }
      ]),
      JSON.stringify([
        {
          type: 'product',
          id: 'iphone-15-pro',
          name: 'iPhone 15 Pro',
          metrics: { clicks: 300, conversions: 20, revenue: 15000, rank: 1 },
          rank: 1
        },
        {
          type: 'store',
          id: 'flipkart-electronics',
          name: 'Flipkart Electronics',
          metrics: { clicks: 800, conversions: 45, revenue: 22500, rank: 1 },
          rank: 1
        },
        {
          type: 'category',
          id: 'smartphones',
          name: 'Smartphones',
          metrics: { clicks: 1200, conversions: 65, revenue: 32500, rank: 1 },
          rank: 1
        }
      ]),
      new Date()
    ]);
    console.log('✅ Channel performance created:', channelPerfResult.rows[0].id);

    // Test 5: Create user journey
    console.log('\n5️⃣ Testing user journey creation...');
    const journeyResult = await pool.query(`
      INSERT INTO user_journeys (
        user_id, session_id, journey_type, start_time, end_time, duration,
        touchpoints, outcome, path_analysis
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      'user-789',
      'session-' + Date.now(),
      'conversion',
      new Date(Date.now() - 1800000), // 30 minutes ago
      new Date(),
      1800, // 30 minutes in seconds
      JSON.stringify([
        {
          id: 'tp-1',
          timestamp: new Date(Date.now() - 1800000),
          type: 'click',
          source: 'telegram_personal_channel',
          sourceDetails: { channelId: 'personal-channel-001', messageId: 'msg-123' },
          content: 'iPhone 15 Pro Deal - 20% Off',
          duration: 0,
          sequenceNumber: 1,
          metadata: { deviceType: 'mobile', location: 'Mumbai' }
        },
        {
          id: 'tp-2',
          timestamp: new Date(Date.now() - 1650000),
          type: 'view',
          source: 'product_page',
          sourceDetails: { productId: 'iphone-15-pro', storeId: 'flipkart' },
          content: 'Product Details Page',
          duration: 120,
          sequenceNumber: 2,
          metadata: { scrollDepth: 85, timeOnPage: 120 }
        },
        {
          id: 'tp-3',
          timestamp: new Date(Date.now() - 1500000),
          type: 'interaction',
          source: 'product_page',
          sourceDetails: { action: 'add_to_cart', productId: 'iphone-15-pro' },
          content: 'Add to Cart',
          duration: 5,
          sequenceNumber: 3,
          metadata: { cartValue: 75000 }
        },
        {
          id: 'tp-4',
          timestamp: new Date(Date.now() - 300000),
          type: 'conversion',
          source: 'checkout_page',
          sourceDetails: { orderId: 'FK_ORDER_789', paymentMethod: 'UPI' },
          content: 'Purchase Completed',
          duration: 180,
          sequenceNumber: 4,
          metadata: { orderValue: 75000, commission: 3750 }
        }
      ]),
      JSON.stringify({
        type: 'conversion',
        value: 75000,
        conversionId: 'conv-789',
        metadata: {
          paymentMethod: 'UPI',
          deliveryAddress: 'Mumbai, India',
          customerSatisfaction: 5
        }
      }),
      JSON.stringify({
        commonPaths: [
          'telegram_personal_channel -> product_page -> checkout_page',
          'telegram_personal_channel -> product_page -> cart -> checkout_page'
        ],
        pathFrequency: {
          'telegram_personal_channel -> product_page': 1000,
          'product_page -> cart': 300,
          'cart -> checkout_page': 250,
          'checkout_page -> conversion': 200
        },
        conversionPaths: [
          'telegram_personal_channel -> product_page -> cart -> checkout_page -> conversion'
        ],
        abandonmentPoints: [
          'product_page (70% abandon)',
          'cart (16.7% abandon)',
          'checkout_page (20% abandon)'
        ],
        pathEfficiency: 85.5,
        averagePathLength: 4.2
      })
    ]);
    console.log('✅ User journey created:', journeyResult.rows[0].id);

    // Test 6: Create ROI analysis
    console.log('\n6️⃣ Testing ROI analysis creation...');
    const roiResult = await pool.query(`
      INSERT INTO roi_analysis (
        analysis_type, entity_id, entity_name, date_range, investment,
        returns, roi_metrics, breakdown, trends, benchmarks, recommendations, calculated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      'channel',
      'personal-channel-001',
      'Premium Deals Channel',
      JSON.stringify({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        preset: 'last_30_days'
      }),
      JSON.stringify({
        totalInvestment: 25000,
        breakdown: {
          advertising: 15000,
          commissions: 6000,
          operational: 3000,
          technology: 1000,
          other: 0
        },
        currency: 'INR'
      }),
      JSON.stringify({
        totalRevenue: 125000,
        totalProfit: 37500,
        breakdown: {
          directRevenue: 100000,
          indirectRevenue: 20000,
          retentionRevenue: 5000,
          referralRevenue: 0
        },
        currency: 'INR'
      }),
      JSON.stringify({
        roi: 150, // 150% ROI
        roas: 5.0, // 5:1 return on ad spend
        cpa: 200, // ₹200 cost per acquisition
        ltv: 5000, // ₹5000 lifetime value
        paybackPeriod: 45, // 45 days
        profitMargin: 30, // 30%
        breakEvenPoint: 25000,
        netPresentValue: 12500
      }),
      JSON.stringify([
        {
          dimension: 'Product Category',
          value: 'Electronics',
          investment: 15000,
          returns: 75000,
          roi: 400,
          percentage: 60
        },
        {
          dimension: 'Product Category',
          value: 'Fashion',
          investment: 8000,
          returns: 35000,
          roi: 337.5,
          percentage: 28
        },
        {
          dimension: 'Product Category',
          value: 'Home & Kitchen',
          investment: 2000,
          returns: 15000,
          roi: 650,
          percentage: 12
        }
      ]),
      JSON.stringify({
        roiTrend: [
          { date: '2024-01-01', value: 120, change: 0, changePercent: 0 },
          { date: '2024-01-15', value: 135, change: 15, changePercent: 12.5 },
          { date: '2024-01-31', value: 150, change: 15, changePercent: 11.1 }
        ],
        investmentTrend: [
          { date: '2024-01-01', value: 800, change: 0, changePercent: 0 },
          { date: '2024-01-15', value: 850, change: 50, changePercent: 6.25 },
          { date: '2024-01-31', value: 900, change: 50, changePercent: 5.88 }
        ],
        returnsTrend: [
          { date: '2024-01-01', value: 4000, change: 0, changePercent: 0 },
          { date: '2024-01-15', value: 4200, change: 200, changePercent: 5.0 },
          { date: '2024-01-31', value: 4500, change: 300, changePercent: 7.14 }
        ],
        efficiency: 92.5,
        stability: 88.7
      }),
      JSON.stringify({
        industryAverage: 120,
        topPerformer: 200,
        previousPeriod: 135,
        target: 140,
        percentile: 85
      }),
      JSON.stringify([
        {
          type: 'increase_investment',
          priority: 'high',
          description: 'ROI exceeds target by 10%. Consider increasing investment in high-performing categories.',
          expectedImpact: 25,
          implementationCost: 10000,
          timeframe: '2 weeks',
          confidence: 90
        },
        {
          type: 'optimize_targeting',
          priority: 'medium',
          description: 'Focus more budget on Electronics category which shows highest ROI.',
          expectedImpact: 15,
          implementationCost: 2000,
          timeframe: '1 week',
          confidence: 85
        }
      ]),
      new Date()
    ]);
    console.log('✅ ROI analysis created:', roiResult.rows[0].id);

    // Test 7: Create analytics alert
    console.log('\n7️⃣ Testing analytics alert creation...');
    const alertResult = await pool.query(`
      INSERT INTO analytics_alerts (
        name, description, alert_type, metric, conditions, channels, recipients, frequency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      'Conversion Rate Drop Alert',
      'Alert when conversion rate drops below 3% for more than 1 hour',
      'threshold',
      'conversion_rate',
      JSON.stringify([
        {
          type: 'less_than',
          threshold: 3.0,
          timeWindow: 60, // 1 hour
          comparisonPeriod: 'previous_period'
        }
      ]),
      JSON.stringify([
        {
          type: 'email',
          configuration: {
            smtpServer: 'smtp.gmail.com',
            port: 587,
            username: 'alerts@bazaarGuru.com',
            template: 'conversion_drop_alert'
          },
          isActive: true
        },
        {
          type: 'telegram',
          configuration: {
            botToken: 'BOT_TOKEN',
            chatId: '-1001234567890'
          },
          isActive: true
        },
        {
          type: 'slack',
          configuration: {
            webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
            channel: '#alerts'
          },
          isActive: true
        }
      ]),
      JSON.stringify([
        'analytics@bazaarGuru.com',
        'management@bazaarGuru.com',
        'operations@bazaarGuru.com'
      ]),
      'immediate'
    ]);
    console.log('✅ Analytics alert created:', alertResult.rows[0].id);

    // Test 8: Create analytics insight
    console.log('\n8️⃣ Testing analytics insight creation...');
    const insightResult = await pool.query(`
      INSERT INTO analytics_insights (
        type, title, description, severity, confidence, impact,
        evidence, recommendations, affected_entities, detected_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      'opportunity',
      'Mobile Traffic Optimization Opportunity',
      'Mobile users show 25% higher engagement but 15% lower conversion rate. Optimizing mobile experience could increase revenue by ₹50,000/month.',
      'high',
      85,
      JSON.stringify({
        metric: 'mobile_conversion_rate',
        currentValue: 4.2,
        potentialValue: 5.5,
        impactPercentage: 31,
        revenueImpact: 50000,
        timeframe: '1 month'
      }),
      JSON.stringify([
        {
          type: 'metric_change',
          description: 'Mobile traffic increased by 35% but conversion rate is 15% lower than desktop',
          data: {
            mobileTraffic: 75,
            mobileConversionRate: 4.2,
            desktopConversionRate: 5.5,
            trafficGrowth: 35
          },
          confidence: 90
        },
        {
          type: 'pattern_detection',
          description: 'Users abandon checkout process 40% more on mobile devices',
          data: {
            mobileAbandonmentRate: 70,
            desktopAbandonmentRate: 50,
            checkoutStepAnalysis: {
              'payment_selection': 25,
              'address_entry': 30,
              'final_confirmation': 15
            }
          },
          confidence: 85
        }
      ]),
      JSON.stringify([
        {
          action: 'Optimize mobile checkout flow',
          description: 'Simplify mobile checkout process by reducing form fields and implementing one-click payment options',
          priority: 'high',
          effort: 'medium',
          expectedImpact: 20,
          implementationSteps: [
            'Implement Google Pay and PhonePe one-click payments',
            'Reduce checkout form fields from 12 to 6',
            'Add progress indicator to checkout flow',
            'Optimize page load speed for mobile',
            'A/B test simplified vs current checkout flow'
          ]
        },
        {
          action: 'Improve mobile page load speed',
          description: 'Optimize images and scripts to reduce mobile page load time from 4.2s to under 2s',
          priority: 'high',
          effort: 'low',
          expectedImpact: 15,
          implementationSteps: [
            'Compress and optimize product images',
            'Implement lazy loading for below-fold content',
            'Minify CSS and JavaScript files',
            'Enable browser caching',
            'Use CDN for static assets'
          ]
        }
      ]),
      JSON.stringify([
        'personal-channel-001',
        'mobile_users_segment',
        'checkout_funnel'
      ]),
      new Date(),
      'new'
    ]);
    console.log('✅ Analytics insight created:', insightResult.rows[0].id);

    // Test 9: Create data export
    console.log('\n9️⃣ Testing data export creation...');
    const exportResult = await pool.query(`
      INSERT INTO data_exports (
        name, description, export_type, format, data_source, query,
        filters, schedule, destination
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      'Daily Revenue Export',
      'Daily export of revenue data for external BI tools',
      'aggregated_data',
      'csv',
      'conversions',
      'SELECT DATE(conversion_time) as date, source, COUNT(*) as conversions, SUM(order_value) as revenue, AVG(order_value) as avg_order_value FROM conversion_events WHERE processing_status = \'confirmed\' GROUP BY DATE(conversion_time), source ORDER BY date DESC',
      JSON.stringify({
        dateRange: 'last_7_days',
        minRevenue: 100,
        excludeFraud: true
      }),
      JSON.stringify({
        frequency: 'daily',
        time: '06:00',
        timezone: 'Asia/Kolkata',
        isActive: true
      }),
      JSON.stringify({
        type: 'email',
        configuration: {
          recipients: ['bi-team@bazaarGuru.com', 'analytics@bazaarGuru.com'],
          subject: 'Daily Revenue Data Export - {{date}}',
          attachmentName: 'revenue_data_{{date}}.csv'
        }
      })
    ]);
    console.log('✅ Data export created:', exportResult.rows[0].id);

    // Test 10: Test analytics queries
    console.log('\n🔟 Testing analytics queries...');
    
    // Traffic overview query
    const overviewResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT ce.click_id) as total_clicks,
        COUNT(DISTINCT ce.user_id) as unique_users,
        COUNT(DISTINCT conv.id) as total_conversions,
        COALESCE(SUM(conv.order_value), 0) as total_revenue,
        COALESCE(SUM(conv.commission), 0) as total_commission,
        CASE 
          WHEN COUNT(DISTINCT ce.click_id) > 0 
          THEN ROUND((COUNT(DISTINCT conv.id)::decimal / COUNT(DISTINCT ce.click_id) * 100), 2)
          ELSE 0 
        END as conversion_rate
      FROM click_events ce
      LEFT JOIN conversion_events conv ON ce.click_id = conv.click_id
      WHERE ce.click_time >= NOW() - INTERVAL '7 days'
    `);
    console.log('📊 Traffic overview (last 7 days):', overviewResult.rows[0]);

    // Channel comparison query
    const channelResult = await pool.query(`
      SELECT 
        ce.source as channel,
        COUNT(DISTINCT ce.click_id) as clicks,
        COUNT(DISTINCT conv.id) as conversions,
        COALESCE(SUM(conv.order_value), 0) as revenue,
        CASE 
          WHEN COUNT(DISTINCT ce.click_id) > 0 
          THEN ROUND((COUNT(DISTINCT conv.id)::decimal / COUNT(DISTINCT ce.click_id) * 100), 2)
          ELSE 0 
        END as conversion_rate
      FROM click_events ce
      LEFT JOIN conversion_events conv ON ce.click_id = conv.click_id
      WHERE ce.click_time >= NOW() - INTERVAL '7 days'
      GROUP BY ce.source
      ORDER BY revenue DESC
      LIMIT 5
    `);
    console.log('📈 Top channels by revenue:', channelResult.rows);

    // Test materialized views
    console.log('\n1️⃣1️⃣ Testing materialized views...');
    
    // Refresh materialized views
    await pool.query('REFRESH MATERIALIZED VIEW daily_traffic_summary');
    await pool.query('REFRESH MATERIALIZED VIEW channel_performance_summary');
    
    const dailySummaryResult = await pool.query(`
      SELECT * FROM daily_traffic_summary 
      ORDER BY date DESC 
      LIMIT 5
    `);
    console.log('📅 Daily traffic summary:', dailySummaryResult.rows);

    const channelSummaryResult = await pool.query(`
      SELECT * FROM channel_performance_summary 
      ORDER BY total_revenue DESC 
      LIMIT 5
    `);
    console.log('🏆 Channel performance summary:', channelSummaryResult.rows);

    console.log('\n🎉 All traffic analytics tests completed successfully!');
    console.log('\n📈 Summary:');
    console.log('- ✅ Traffic dashboards: Working');
    console.log('- ✅ Traffic reports: Working');
    console.log('- ✅ A/B testing: Working');
    console.log('- ✅ Channel performance: Working');
    console.log('- ✅ User journeys: Working');
    console.log('- ✅ ROI analysis: Working');
    console.log('- ✅ Analytics alerts: Working');
    console.log('- ✅ Analytics insights: Working');
    console.log('- ✅ Data exports: Working');
    console.log('- ✅ Analytics queries: Working');
    console.log('- ✅ Materialized views: Working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run tests if called directly
if (require.main === module) {
  testTrafficAnalytics();
}

module.exports = { testTrafficAnalytics };
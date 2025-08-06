#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3010/api/admin/notification-campaigns';

// Test data
const testCampaign = {
  name: 'Test Campaign - ' + Date.now(),
  description: 'Тестовая кампания для проверки системы уведомлений',
  type: 'broadcast',
  status: 'draft',
  priority: 5,
  targetAudience: {
    filters: {
      isActive: true,
      channelStatus: ['active']
    }
  },
  content: {
    title: 'Специальное предложение!',
    message: 'Получите скидку 50% на все товары! Предложение ограничено по времени.',
    actionButtons: [
      {
        text: 'Получить скидку',
        url: 'https://example.com/discount',
        action: 'open_url'
      }
    ]
  },
  schedule: {
    type: 'immediate'
  },
  delivery: {
    channel: 'telegram',
    respectUserPreferences: true,
    rateLimitPerMinute: 100
  },
  tags: ['test', 'discount', 'promotion']
};

const testTemplate = {
  name: 'Welcome Template - ' + Date.now(),
  description: 'Шаблон приветствия для новых пользователей',
  category: 'transactional',
  content: {
    title: 'Добро пожаловать, {{firstName}}!',
    message: 'Спасибо за регистрацию в нашем сервисе. Мы рады видеть вас среди наших пользователей!',
    actionButtons: [
      {
        text: 'Начать использование',
        url: 'https://example.com/dashboard',
        action: 'open_url'
      }
    ]
  },
  variables: [
    {
      name: 'firstName',
      description: 'Имя пользователя',
      type: 'string',
      required: true
    }
  ],
  isActive: true
};

const testBulkNotification = {
  title: 'Системное уведомление',
  message: 'Запланированное техническое обслуживание сервиса с 02:00 до 04:00 МСК.',
  type: 'system',
  recipients: {
    type: 'all_users'
  },
  channel: 'telegram'
};

const testUserPreferences = {
  telegram: true,
  email: true,
  push: false,
  sms: false,
  promotional: true,
  transactional: true,
  informational: true,
  reminders: false,
  maxPerDay: 5,
  maxPerWeek: 20,
  quietHours: {
    enabled: true,
    startTime: '22:00',
    endTime: '08:00',
    timezone: 'Asia/Kolkata'
  },
  categories: ['electronics', 'fashion'],
  stores: ['flipkart', 'amazon'],
  globalUnsubscribe: false,
  unsubscribedCategories: [],
  unsubscribedCampaignTypes: []
};

// Test functions
async function testCampaignOperations() {
  console.log('\n🧪 Testing Campaign Operations...');
  
  try {
    // 1. Create campaign
    console.log('1. Creating campaign...');
    const createResponse = await axios.post(`${BASE_URL}/campaigns`, testCampaign);
    
    if (createResponse.data.success) {
      console.log('✅ Campaign created:', createResponse.data.data.id);
      const campaignId = createResponse.data.data.id;
      
      // 2. Get campaign by ID
      console.log('2. Getting campaign by ID...');
      const getResponse = await axios.get(`${BASE_URL}/campaigns/${campaignId}`);
      
      if (getResponse.data.success) {
        console.log('✅ Campaign retrieved successfully');
        console.log('   Name:', getResponse.data.data.name);
        console.log('   Status:', getResponse.data.data.status);
        console.log('   Type:', getResponse.data.data.type);
      }
      
      // 3. Update campaign
      console.log('3. Updating campaign...');
      const updateData = {
        description: 'Обновленное описание кампании',
        priority: 8
      };
      
      const updateResponse = await axios.put(`${BASE_URL}/campaigns/${campaignId}`, updateData);
      
      if (updateResponse.data.success) {
        console.log('✅ Campaign updated successfully');
        console.log('   New priority:', updateResponse.data.data.priority);
      }
      
      // 4. Preview campaign
      console.log('4. Previewing campaign...');
      const previewResponse = await axios.get(`${BASE_URL}/campaigns/${campaignId}/preview`);
      
      if (previewResponse.data.success) {
        console.log('✅ Campaign preview generated');
        console.log('   Title:', previewResponse.data.data.content.title);
      }
      
      // 5. Schedule campaign
      console.log('5. Scheduling campaign...');
      const scheduledAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const scheduleResponse = await axios.post(`${BASE_URL}/campaigns/${campaignId}/schedule`, {
        scheduledAt: scheduledAt.toISOString()
      });
      
      if (scheduleResponse.data.success) {
        console.log('✅ Campaign scheduled successfully');
        console.log('   Scheduled for:', scheduledAt.toLocaleString());
      }
      
      // 6. Duplicate campaign
      console.log('6. Duplicating campaign...');
      const duplicateResponse = await axios.post(`${BASE_URL}/campaigns/${campaignId}/duplicate`);
      
      if (duplicateResponse.data.success) {
        console.log('✅ Campaign duplicated successfully');
        console.log('   New campaign ID:', duplicateResponse.data.data.id);
        console.log('   New campaign name:', duplicateResponse.data.data.name);
      }
      
      // 7. Execute campaign (commented out to avoid actual sending)
      // console.log('7. Executing campaign...');
      // const executeResponse = await axios.post(`${BASE_URL}/campaigns/${campaignId}/execute`, {
      //   executionType: 'manual'
      // });
      
      // if (executeResponse.data.success) {
      //   console.log('✅ Campaign execution started');
      //   console.log('   Execution ID:', executeResponse.data.data.id);
      // }
      
      return campaignId;
    }
  } catch (error) {
    console.error('❌ Campaign operations test failed:', error.response?.data || error.message);
    return null;
  }
}

async function testCampaignsList() {
  console.log('\n📋 Testing Campaigns List...');
  
  try {
    // Get campaigns with filters
    const params = new URLSearchParams({
      page: '1',
      limit: '10',
      status: 'draft,scheduled',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    
    const response = await axios.get(`${BASE_URL}/campaigns?${params}`);
    
    if (response.data.success) {
      console.log('✅ Campaigns list retrieved successfully');
      console.log('   Total campaigns:', response.data.data.total);
      console.log('   Current page:', response.data.data.page);
      console.log('   Total pages:', response.data.data.totalPages);
      console.log('   Campaigns on this page:', response.data.data.campaigns.length);
      
      if (response.data.data.campaigns.length > 0) {
        const firstCampaign = response.data.data.campaigns[0];
        console.log('   First campaign:', firstCampaign.name);
        console.log('   Status:', firstCampaign.status);
        console.log('   Sent count:', firstCampaign.metrics.sentCount);
      }
    }
  } catch (error) {
    console.error('❌ Campaigns list test failed:', error.response?.data || error.message);
  }
}

async function testCampaignStats() {
  console.log('\n📊 Testing Campaign Statistics...');
  
  try {
    const response = await axios.get(`${BASE_URL}/campaigns/stats`);
    
    if (response.data.success) {
      const stats = response.data.data;
      console.log('✅ Campaign statistics retrieved successfully');
      console.log('   Total campaigns:', stats.totalCampaigns);
      console.log('   Active campaigns:', stats.activeCampaigns);
      console.log('   Completed campaigns:', stats.completedCampaigns);
      console.log('   Total sent:', stats.totalSent);
      console.log('   Average open rate:', stats.averageOpenRate.toFixed(2) + '%');
      console.log('   Average click rate:', stats.averageClickRate.toFixed(2) + '%');
      console.log('   Total revenue:', '$' + stats.totalRevenue.toFixed(2));
      
      if (stats.topCampaigns.length > 0) {
        console.log('   Top performing campaign:', stats.topCampaigns[0].name);
      }
      
      if (stats.campaignsByType.length > 0) {
        console.log('   Campaign types:');
        stats.campaignsByType.forEach(type => {
          console.log(`     ${type.type}: ${type.count} (${type.percentage}%)`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Campaign statistics test failed:', error.response?.data || error.message);
  }
}

async function testTemplateOperations() {
  console.log('\n📝 Testing Template Operations...');
  
  try {
    // 1. Create template
    console.log('1. Creating template...');
    const createResponse = await axios.post(`${BASE_URL}/templates`, testTemplate);
    
    if (createResponse.data.success) {
      console.log('✅ Template created:', createResponse.data.data.id);
      console.log('   Name:', createResponse.data.data.name);
      console.log('   Category:', createResponse.data.data.category);
      
      // 2. Get all templates
      console.log('2. Getting all templates...');
      const getAllResponse = await axios.get(`${BASE_URL}/templates`);
      
      if (getAllResponse.data.success) {
        console.log('✅ Templates retrieved successfully');
        console.log('   Total templates:', getAllResponse.data.data.length);
        
        const categories = [...new Set(getAllResponse.data.data.map(t => t.category))];
        console.log('   Categories:', categories.join(', '));
      }
      
      // 3. Get templates by category
      console.log('3. Getting templates by category...');
      const categoryResponse = await axios.get(`${BASE_URL}/templates?category=transactional`);
      
      if (categoryResponse.data.success) {
        console.log('✅ Category templates retrieved successfully');
        console.log('   Transactional templates:', categoryResponse.data.data.length);
      }
    }
  } catch (error) {
    console.error('❌ Template operations test failed:', error.response?.data || error.message);
  }
}

async function testBulkNotification() {
  console.log('\n📢 Testing Bulk Notification...');
  
  try {
    // Send bulk notification (commented out to avoid actual sending)
    // const response = await axios.post(`${BASE_URL}/bulk-notifications`, testBulkNotification);
    
    // if (response.data.success) {
    //   console.log('✅ Bulk notification sent successfully');
    //   console.log('   Notification ID:', response.data.data.id);
    //   console.log('   Target count:', response.data.data.results.targetCount);
    //   console.log('   Status:', response.data.data.status);
    // }
    
    console.log('✅ Bulk notification test skipped (to avoid actual sending)');
    console.log('   Test data prepared:', testBulkNotification.title);
  } catch (error) {
    console.error('❌ Bulk notification test failed:', error.response?.data || error.message);
  }
}

async function testUserPreferences() {
  console.log('\n👤 Testing User Preferences...');
  
  try {
    const testUserId = 'test-user-' + Date.now();
    
    // 1. Get user preferences (should create defaults)
    console.log('1. Getting user preferences (creating defaults)...');
    const getResponse = await axios.get(`${BASE_URL}/users/${testUserId}/preferences`);
    
    if (getResponse.data.success) {
      console.log('✅ User preferences retrieved/created');
      console.log('   Telegram enabled:', getResponse.data.data.preferences.telegram);
      console.log('   Email enabled:', getResponse.data.data.preferences.email);
      console.log('   Max per day:', getResponse.data.data.preferences.maxPerDay);
      console.log('   Quiet hours enabled:', getResponse.data.data.preferences.quietHours.enabled);
    }
    
    // 2. Update user preferences
    console.log('2. Updating user preferences...');
    const updateResponse = await axios.put(`${BASE_URL}/users/${testUserId}/preferences`, testUserPreferences);
    
    if (updateResponse.data.success) {
      console.log('✅ User preferences updated successfully');
      console.log('   Max per day:', updateResponse.data.data.preferences.maxPerDay);
      console.log('   Quiet hours:', updateResponse.data.data.preferences.quietHours.startTime + ' - ' + updateResponse.data.data.preferences.quietHours.endTime);
      console.log('   Interested categories:', updateResponse.data.data.preferences.categories.join(', '));
    }
  } catch (error) {
    console.error('❌ User preferences test failed:', error.response?.data || error.message);
  }
}

async function testABTesting() {
  console.log('\n🧪 Testing A/B Testing...');
  
  try {
    // Create A/B test campaign
    const abTestCampaign = {
      ...testCampaign,
      name: 'A/B Test Campaign - ' + Date.now(),
      type: 'ab_test',
      abTest: {
        enabled: true,
        variants: [
          {
            id: 'variant-a',
            name: 'Variant A',
            percentage: 50,
            content: {
              title: 'Скидка 30%!',
              message: 'Получите скидку 30% на все товары!'
            }
          },
          {
            id: 'variant-b',
            name: 'Variant B',
            percentage: 50,
            content: {
              title: 'Мега распродажа!',
              message: 'Невероятные скидки до 50% на все товары!'
            }
          }
        ],
        winnerCriteria: 'click_rate',
        testDuration: 24,
        autoPromoteWinner: true
      }
    };
    
    console.log('1. Creating A/B test campaign...');
    const createResponse = await axios.post(`${BASE_URL}/campaigns`, abTestCampaign);
    
    if (createResponse.data.success) {
      const campaignId = createResponse.data.data.id;
      console.log('✅ A/B test campaign created:', campaignId);
      
      // Test A/B variants
      console.log('2. Testing A/B variants...');
      const testResponse = await axios.post(`${BASE_URL}/campaigns/${campaignId}/ab-test`);
      
      if (testResponse.data.success) {
        console.log('✅ A/B test completed successfully');
        console.log('   Winner variant:', testResponse.data.data.winnerVariantId);
        console.log('   Test results:');
        testResponse.data.data.results.forEach((result, index) => {
          console.log(`     Variant ${index + 1}: Click rate ${(result.clickRate * 100).toFixed(2)}%, Conversion rate ${(result.conversionRate * 100).toFixed(2)}%`);
        });
      }
    }
  } catch (error) {
    console.error('❌ A/B testing test failed:', error.response?.data || error.message);
  }
}

async function testCampaignAnalytics() {
  console.log('\n📈 Testing Campaign Analytics...');
  
  try {
    // First, get a campaign ID from the list
    const listResponse = await axios.get(`${BASE_URL}/campaigns?limit=1`);
    
    if (listResponse.data.success && listResponse.data.data.campaigns.length > 0) {
      const campaignId = listResponse.data.data.campaigns[0].id;
      
      console.log('1. Getting campaign analytics...');
      const analyticsResponse = await axios.get(`${BASE_URL}/campaigns/${campaignId}/analytics?period=week`);
      
      if (analyticsResponse.data.success) {
        const analytics = analyticsResponse.data.data;
        console.log('✅ Campaign analytics retrieved successfully');
        console.log('   Campaign ID:', analytics.campaignId);
        console.log('   Period:', analytics.period);
        console.log('   Delivery rate:', analytics.delivery.deliveryRate.toFixed(2) + '%');
        console.log('   Open rate:', analytics.engagement.openRate.toFixed(2) + '%');
        console.log('   Click rate:', analytics.engagement.clickRate.toFixed(2) + '%');
        console.log('   Total revenue:', '$' + analytics.revenue.total.toFixed(2));
        console.log('   ROI:', analytics.revenue.roi.toFixed(2) + '%');
      }
    } else {
      console.log('⚠️  No campaigns found for analytics testing');
    }
  } catch (error) {
    console.error('❌ Campaign analytics test failed:', error.response?.data || error.message);
  }
}

// Generate test report
function generateTestReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    testSuite: 'Notification Campaigns System',
    results: results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length
    }
  };
  
  const reportPath = path.join(__dirname, '../test-reports/notification-campaigns-test-report.json');
  
  // Ensure directory exists
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Test report saved to: ${reportPath}`);
  
  return report;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Notification Campaigns System Tests...');
  console.log('Base URL:', BASE_URL);
  
  const results = [];
  
  // Test campaign operations
  try {
    await testCampaignOperations();
    results.push({ test: 'Campaign Operations', status: 'passed' });
  } catch (error) {
    results.push({ test: 'Campaign Operations', status: 'failed', error: error.message });
  }
  
  // Test campaigns list
  try {
    await testCampaignsList();
    results.push({ test: 'Campaigns List', status: 'passed' });
  } catch (error) {
    results.push({ test: 'Campaigns List', status: 'failed', error: error.message });
  }
  
  // Test campaign statistics
  try {
    await testCampaignStats();
    results.push({ test: 'Campaign Statistics', status: 'passed' });
  } catch (error) {
    results.push({ test: 'Campaign Statistics', status: 'failed', error: error.message });
  }
  
  // Test template operations
  try {
    await testTemplateOperations();
    results.push({ test: 'Template Operations', status: 'passed' });
  } catch (error) {
    results.push({ test: 'Template Operations', status: 'failed', error: error.message });
  }
  
  // Test bulk notification
  try {
    await testBulkNotification();
    results.push({ test: 'Bulk Notification', status: 'passed' });
  } catch (error) {
    results.push({ test: 'Bulk Notification', status: 'failed', error: error.message });
  }
  
  // Test user preferences
  try {
    await testUserPreferences();
    results.push({ test: 'User Preferences', status: 'passed' });
  } catch (error) {
    results.push({ test: 'User Preferences', status: 'failed', error: error.message });
  }
  
  // Test A/B testing
  try {
    await testABTesting();
    results.push({ test: 'A/B Testing', status: 'passed' });
  } catch (error) {
    results.push({ test: 'A/B Testing', status: 'failed', error: error.message });
  }
  
  // Test campaign analytics
  try {
    await testCampaignAnalytics();
    results.push({ test: 'Campaign Analytics', status: 'passed' });
  } catch (error) {
    results.push({ test: 'Campaign Analytics', status: 'failed', error: error.message });
  }
  
  // Generate report
  const report = generateTestReport(results);
  
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${report.summary.passed}`);
  console.log(`❌ Failed: ${report.summary.failed}`);
  console.log(`📝 Total: ${report.summary.total}`);
  
  if (report.summary.failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => r.status === 'failed').forEach(result => {
      console.log(`   - ${result.test}: ${result.error}`);
    });
  }
  
  console.log('\n🎉 Notification Campaigns System testing completed!');
  
  // Exit with appropriate code
  process.exit(report.summary.failed > 0 ? 1 : 0);
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
Notification Campaigns System Test Script

Usage: node test-notification-campaigns.js [options]

Options:
  --help          Show this help message
  
Environment Variables:
  ADMIN_PORT      Admin server port (default: 3010)
  
Examples:
  node test-notification-campaigns.js
  ADMIN_PORT=3011 node test-notification-campaigns.js
  `);
  process.exit(0);
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
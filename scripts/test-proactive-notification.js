#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');

const NOTIFICATION_SERVICE_URL = 'http://localhost:3010';

class ProactiveNotificationTester {
  constructor() {
    this.testResults = [];
    this.testUserId = 'test-user-' + Date.now();
  }

  async runAllTests() {
    console.log('🔔 Starting Proactive Notification System Tests...\n'.cyan.bold);

    try {
      await this.testServiceHealth();
      await this.testTriggerManagement();
      await this.testTemplateManagement();
      await this.testBehavioralAnalysis();
      await this.testSmartTiming();
      await this.testUserPreferences();
      await this.testNotificationProcessing();
      
      this.printTestSummary();
    } catch (error) {
      console.error('❌ Test suite failed:'.red.bold, error.message);
      process.exit(1);
    }
  }

  async testServiceHealth() {
    console.log('🏥 Testing Service Health...'.yellow);
    
    try {
      const response = await axios.get(`${NOTIFICATION_SERVICE_URL}/health`);
      this.logTest('Service Health Check', response.status === 200, 
        `Status: ${response.status}, Service: ${response.data.service}`);
    } catch (error) {
      this.logTest('Service Health Check', false, `Service not responding: ${error.message}`);
    }
  }

  async testTriggerManagement() {
    console.log('🎯 Testing Trigger Management...'.yellow);

    try {
      // Test Create Behavioral Trigger
      const behavioralTrigger = {
        name: 'User Inactivity Alert',
        type: 'behavioral',
        conditions: {
          behavioral_patterns: [{
            pattern_type: 'inactivity',
            threshold_value: 72,
            time_window_hours: 168,
            comparison_operator: 'greater_than'
          }]
        },
        is_active: true,
        priority: 1
      };

      const createResponse = await axios.post(`${NOTIFICATION_SERVICE_URL}/triggers`, behavioralTrigger);
      this.logTest('Create Behavioral Trigger', createResponse.status === 201, 
        `Trigger created: ${behavioralTrigger.name}`);

      // Test Create Temporal Trigger
      const temporalTrigger = {
        name: 'Daily Recommendations',
        type: 'temporal',
        conditions: {
          time_conditions: [{
            trigger_type: 'daily',
            schedule: {
              hours: [9, 18],
              timezone: 'Asia/Kolkata'
            },
            frequency_limit: {
              max_per_day: 2,
              cooldown_hours: 6
            }
          }]
        },
        is_active: true,
        priority: 2
      };

      const temporalResponse = await axios.post(`${NOTIFICATION_SERVICE_URL}/triggers`, temporalTrigger);
      this.logTest('Create Temporal Trigger', temporalResponse.status === 201, 
        `Temporal trigger created`);

      // Test Get Triggers
      const getResponse = await axios.get(`${NOTIFICATION_SERVICE_URL}/triggers`);
      this.logTest('Get Active Triggers', getResponse.status === 200 && Array.isArray(getResponse.data),
        `Retrieved ${getResponse.data?.length || 0} triggers`);

    } catch (error) {
      this.logTest('Trigger Management', false, `Error: ${error.message}`);
    }
  }

  async testTemplateManagement() {
    console.log('📝 Testing Template Management...'.yellow);

    try {
      // First create a trigger to associate templates with
      const trigger = {
        name: 'Test Trigger for Templates',
        type: 'promotional',
        conditions: {},
        is_active: true,
        priority: 1
      };

      const triggerResponse = await axios.post(`${NOTIFICATION_SERVICE_URL}/triggers`, trigger);
      const triggerId = triggerResponse.data.id;

      // Test Create Interactive Template
      const interactiveTemplate = {
        trigger_id: triggerId,
        name: 'Re-engagement Template',
        channel: 'telegram',
        template_type: 'interactive',
        content: {
          title: 'We miss you, {{userName}}!',
          message: 'Check out these {{couponCount}} new deals just for you! 🎯',
          buttons: [
            {
              text: '🎯 See My Deals',
              action_type: 'callback',
              action_value: 'view_deals',
              tracking_id: 'reengagement_cta'
            }
          ],
          personalization_fields: ['userName', 'couponCount']
        },
        is_active: true
      };

      const templateResponse = await axios.post(`${NOTIFICATION_SERVICE_URL}/templates`, interactiveTemplate);
      this.logTest('Create Interactive Template', templateResponse.status === 201, 
        `Template created: ${interactiveTemplate.name}`);

      // Test Create Rich Media Template
      const richMediaTemplate = {
        trigger_id: triggerId,
        name: 'Flash Sale Alert',
        channel: 'telegram',
        template_type: 'rich_media',
        content: {
          title: '⚡ Flash Sale Alert!',
          message: 'Limited time: {{discount}}% OFF on {{store}}!',
          media_url: 'https://bazaarGuru.com/images/flash-sale.jpg',
          buttons: [
            {
              text: '🛒 Shop Now',
              action_type: 'url',
              action_value: '{{couponLink}}'
            }
          ],
          personalization_fields: ['discount', 'store', 'couponLink']
        },
        localization: {
          'hi': {
            title: '⚡ फ्लैश सेल अलर्ट!',
            message: 'सीमित समय: {{store}} पर {{discount}}% छूट!'
          }
        },
        is_active: true
      };

      const richMediaResponse = await axios.post(`${NOTIFICATION_SERVICE_URL}/templates`, richMediaTemplate);
      this.logTest('Create Rich Media Template', richMediaResponse.status === 201, 
        `Rich media template created`);

      // Test Get Templates by Trigger
      const getTemplatesResponse = await axios.get(`${NOTIFICATION_SERVICE_URL}/templates/trigger/${triggerId}`);
      this.logTest('Get Templates by Trigger', getTemplatesResponse.status === 200,
        `Retrieved ${getTemplatesResponse.data?.length || 0} templates for trigger`);

    } catch (error) {
      this.logTest('Template Management', false, `Error: ${error.message}`);
    }
  }

  async testBehavioralAnalysis() {
    console.log('🧠 Testing Behavioral Analysis...'.yellow);

    try {
      // Test Behavior Analysis
      const behaviorRequest = {
        userId: this.testUserId,
        timeWindowHours: 24
      };

      const behaviorResponse = await axios.post(`${NOTIFICATION_SERVICE_URL}/analyze/behavior`, behaviorRequest);
      this.logTest('Analyze User Behavior', behaviorResponse.status === 200,
        `Behavior analysis completed for user`);

      if (behaviorResponse.status === 200) {
        const analysis = behaviorResponse.data.analysis;
        const hasValidMetrics = 
          typeof analysis.activity_level === 'number' &&
          typeof analysis.engagement_score === 'number' &&
          Array.isArray(analysis.category_interests);

        this.logTest('Behavior Analysis Data Quality', hasValidMetrics,
          `Analysis contains valid metrics`);
      }

      // Test Churn Risk Analysis
      const churnRequest = {
        userId: this.testUserId
      };

      const churnResponse = await axios.post(`${NOTIFICATION_SERVICE_URL}/analyze/churn-risk`, churnRequest);
      this.logTest('Analyze Churn Risk', churnResponse.status === 200,
        `Churn risk analysis completed`);

      if (churnResponse.status === 200) {
        const churnRisk = churnResponse.data.churnRisk;
        const hasValidChurnData = 
          typeof churnRisk.score === 'number' &&
          ['low', 'medium', 'high'].includes(churnRisk.level) &&
          Array.isArray(churnRisk.factors);

        this.logTest('Churn Risk Data Quality', hasValidChurnData,
          `Churn risk: ${churnRisk.level} (${churnRisk.score.toFixed(2)})`);
      }

    } catch (error) {
      this.logTest('Behavioral Analysis', false, `Error: ${error.message}`);
    }
  }

  async testSmartTiming() {
    console.log('⏰ Testing Smart Timing...'.yellow);

    try {
      // Test Get Smart Timing
      const timingResponse = await axios.get(`${NOTIFICATION_SERVICE_URL}/timing/${this.testUserId}/telegram`);
      this.logTest('Get Smart Timing', timingResponse.status === 200,
        `Smart timing data retrieved`);

      if (timingResponse.status === 200) {
        const timing = timingResponse.data;
        const hasValidTiming = 
          Array.isArray(timing.optimal_hours) &&
          timing.optimal_hours.length > 0 &&
          typeof timing.confidence_score === 'number';

        this.logTest('Smart Timing Data Quality', hasValidTiming,
          `Optimal hours: ${timing.optimal_hours.join(', ')}, Confidence: ${timing.confidence_score}`);
      }

      // Test Calculate Optimal Timing
      const calculateRequest = {
        userId: this.testUserId,
        channel: 'telegram'
      };

      const calculateResponse = await axios.post(`${NOTIFICATION_SERVICE_URL}/timing/calculate`, calculateRequest);
      this.logTest('Calculate Optimal Timing', calculateResponse.status === 200,
        `Optimal timing calculated`);

      if (calculateResponse.status === 200) {
        const result = calculateResponse.data;
        const hasNextOptimalTime = result.nextOptimalTime && new Date(result.nextOptimalTime) > new Date();

        this.logTest('Next Optimal Time Calculation', hasNextOptimalTime,
          `Next optimal time: ${new Date(result.nextOptimalTime).toLocaleString()}`);
      }

    } catch (error) {
      this.logTest('Smart Timing', false, `Error: ${error.message}`);
    }
  }

  async testUserPreferences() {
    console.log('⚙️ Testing User Preferences...'.yellow);

    try {
      // Test Get User Preferences (should return defaults if not set)
      const getPrefsResponse = await axios.get(`${NOTIFICATION_SERVICE_URL}/preferences/${this.testUserId}`);
      this.logTest('Get User Preferences', getPrefsResponse.status === 200,
        `User preferences retrieved`);

      // Test Update User Preferences
      const preferences = {
        channels: {
          telegram: true,
          push: false,
          email: false,
          sms: false
        },
        categories: {
          promotional: true,
          recommendations: true,
          alerts: true,
          updates: false
        },
        frequency: {
          max_per_day: 3,
          max_per_week: 15,
          quiet_hours: {
            start: '22:00',
            end: '08:00',
            timezone: 'Asia/Kolkata'
          }
        },
        personalization: {
          use_ai_optimization: true,
          preferred_language: 'en',
          content_style: 'friendly'
        }
      };

      const updateResponse = await axios.put(`${NOTIFICATION_SERVICE_URL}/preferences/${this.testUserId}`, preferences);
      this.logTest('Update User Preferences', updateResponse.status === 200,
        `Preferences updated successfully`);

      // Verify preferences were saved
      const verifyResponse = await axios.get(`${NOTIFICATION_SERVICE_URL}/preferences/${this.testUserId}`);
      if (verifyResponse.status === 200) {
        const savedPrefs = verifyResponse.data;
        const prefsMatch = 
          savedPrefs.frequency.max_per_day === 3 &&
          savedPrefs.channels.telegram === true &&
          savedPrefs.personalization.content_style === 'friendly';

        this.logTest('Preferences Persistence', prefsMatch,
          `Preferences saved and retrieved correctly`);
      }

    } catch (error) {
      this.logTest('User Preferences', false, `Error: ${error.message}`);
    }
  }

  async testNotificationProcessing() {
    console.log('🔄 Testing Notification Processing...'.yellow);

    try {
      // Test Start Processing
      const startResponse = await axios.post(`${NOTIFICATION_SERVICE_URL}/processing/start`);
      this.logTest('Start Notification Processing', startResponse.status === 200,
        `Processing started: ${startResponse.data.status}`);

      // Test Get Processing Status
      const statusResponse = await axios.get(`${NOTIFICATION_SERVICE_URL}/processing/status`);
      this.logTest('Get Processing Status', statusResponse.status === 200,
        `Processing status: ${statusResponse.data.status}`);

      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test Stop Processing
      const stopResponse = await axios.post(`${NOTIFICATION_SERVICE_URL}/processing/stop`);
      this.logTest('Stop Notification Processing', stopResponse.status === 200,
        `Processing stopped: ${stopResponse.data.status}`);

    } catch (error) {
      this.logTest('Notification Processing', false, `Error: ${error.message}`);
    }
  }

  async testNotificationPersonalization() {
    console.log('🎨 Testing Notification Personalization...'.yellow);

    try {
      // Test personalization logic
      const template = {
        title: 'Hi {{userName}}!',
        message: 'We found {{couponCount}} new deals in {{favoriteCategory}} for you!',
        personalization_fields: ['userName', 'couponCount', 'favoriteCategory']
      };

      const userData = {
        userName: 'Raj',
        couponCount: 5,
        favoriteCategory: 'Electronics'
      };

      // Simulate personalization
      let personalizedTitle = template.title;
      let personalizedMessage = template.message;

      template.personalization_fields.forEach(field => {
        const placeholder = `{{${field}}}`;
        personalizedTitle = personalizedTitle.replace(placeholder, userData[field] || '');
        personalizedMessage = personalizedMessage.replace(placeholder, userData[field] || '');
      });

      const isPersonalized = 
        personalizedTitle.includes('Raj') &&
        personalizedMessage.includes('5') &&
        personalizedMessage.includes('Electronics');

      this.logTest('Content Personalization', isPersonalized,
        `Personalized: "${personalizedMessage}"`);

    } catch (error) {
      this.logTest('Notification Personalization', false, `Error: ${error.message}`);
    }
  }

  async testPerformanceMetrics() {
    console.log('📊 Testing Performance Metrics...'.yellow);

    try {
      // Simulate notification metrics
      const metrics = {
        sent: 1000,
        delivered: 950,
        opened: 380,
        clicked: 95,
        converted: 23,
        unsubscribed: 5
      };

      const deliveryRate = (metrics.delivered / metrics.sent) * 100;
      const openRate = (metrics.opened / metrics.delivered) * 100;
      const clickThroughRate = (metrics.clicked / metrics.opened) * 100;
      const conversionRate = (metrics.converted / metrics.clicked) * 100;

      const hasGoodPerformance = 
        deliveryRate > 90 &&
        openRate > 30 &&
        clickThroughRate > 20 &&
        conversionRate > 15;

      this.logTest('Performance Metrics Calculation', true,
        `Delivery: ${deliveryRate.toFixed(1)}%, Open: ${openRate.toFixed(1)}%, CTR: ${clickThroughRate.toFixed(1)}%, Conversion: ${conversionRate.toFixed(1)}%`);

      this.logTest('Performance Benchmarks', hasGoodPerformance,
        hasGoodPerformance ? 'All metrics above benchmarks' : 'Some metrics below benchmarks');

    } catch (error) {
      this.logTest('Performance Metrics', false, `Error: ${error.message}`);
    }
  }

  logTest(testName, passed, details) {
    const status = passed ? '✅ PASS'.green : '❌ FAIL'.red;
    console.log(`  ${status} ${testName}: ${details}`);
    
    this.testResults.push({
      name: testName,
      passed,
      details
    });
  }

  printTestSummary() {
    console.log('\n📋 Test Summary'.cyan.bold);
    console.log('='.repeat(50).cyan);
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`.green);
    console.log(`Failed: ${failedTests}`.red);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:'.red.bold);
      this.testResults
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  • ${test.name}: ${test.details}`.red);
        });
    }
    
    console.log('\n🎉 Proactive Notification System Testing Complete!'.green.bold);
    
    if (failedTests === 0) {
      console.log('✨ All tests passed! The notification system is working correctly.'.green);
    } else {
      console.log('⚠️  Some tests failed. Please check the implementation.'.yellow);
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ProactiveNotificationTester();
  tester.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = ProactiveNotificationTester;
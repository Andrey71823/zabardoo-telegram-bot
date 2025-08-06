#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');

const RECOMMENDATION_SERVICE_URL = 'http://localhost:3009';

class RecommendationTester {
  constructor() {
    this.testResults = [];
    this.testUserId = 'test-user-' + Date.now();
  }

  async runAllTests() {
    console.log('🧪 Starting Recommendation System Tests...\n'.cyan.bold);

    try {
      await this.testServiceHealth();
      await this.testUserProfileManagement();
      await this.testRecommendationGeneration();
      await this.testFeedbackCollection();
      await this.testRealtimeRecommendations();
      await this.testAnalytics();
      
      this.printTestSummary();
    } catch (error) {
      console.error('❌ Test suite failed:'.red.bold, error.message);
      process.exit(1);
    }
  }

  async testServiceHealth() {
    console.log('🏥 Testing Service Health...'.yellow);
    
    try {
      const response = await axios.get(`${RECOMMENDATION_SERVICE_URL}/health`);
      this.logTest('Service Health Check', response.status === 200, 
        `Status: ${response.status}, Service: ${response.data.service}`);
    } catch (error) {
      this.logTest('Service Health Check', false, `Service not responding: ${error.message}`);
    }
  }

  async testUserProfileManagement() {
    console.log('👤 Testing User Profile Management...'.yellow);

    // Test Create User Profile
    try {
      const profileData = {
        userId: this.testUserId,
        demographics: {
          age_range: '25-34',
          gender: 'male',
          location: 'Mumbai',
          income_level: 'middle',
          occupation: 'software_engineer'
        },
        preferences: {
          categories: ['Electronics', 'Fashion'],
          stores: ['Amazon', 'Flipkart'],
          price_sensitivity: 0.7,
          brand_preferences: ['Samsung', 'Nike'],
          discount_threshold: 20
        },
        behavior: {
          avg_session_duration: 300,
          purchase_frequency: 'weekly',
          preferred_shopping_time: 'evening',
          device_usage: 'mobile',
          social_sharing_tendency: 0.6
        }
      };

      const createResponse = await axios.post(`${RECOMMENDATION_SERVICE_URL}/profiles`, profileData);
      this.logTest('Create User Profile', createResponse.status === 201, 
        `Profile created for user: ${this.testUserId}`);

      // Test Get User Profile
      const getResponse = await axios.get(`${RECOMMENDATION_SERVICE_URL}/profiles/${this.testUserId}`);
      this.logTest('Get User Profile', getResponse.status === 200 && getResponse.data.userId === this.testUserId,
        `Retrieved profile for user: ${this.testUserId}`);

      // Test Update User Profile
      const updateData = {
        preferences: {
          ...profileData.preferences,
          categories: ['Electronics', 'Fashion', 'Home']
        }
      };

      const updateResponse = await axios.put(`${RECOMMENDATION_SERVICE_URL}/profiles/${this.testUserId}`, updateData);
      this.logTest('Update User Profile', updateResponse.status === 200,
        `Updated profile preferences`);

    } catch (error) {
      this.logTest('User Profile Management', false, `Error: ${error.message}`);
    }
  }

  async testRecommendationGeneration() {
    console.log('🎯 Testing Recommendation Generation...'.yellow);

    try {
      // Test General Recommendations
      const recommendRequest = {
        userId: this.testUserId,
        context: {
          time_of_day: 'evening',
          device: 'mobile',
          location: 'Mumbai'
        },
        filters: {
          limit: 10,
          categories: ['Electronics', 'Fashion']
        }
      };

      const recommendResponse = await axios.post(`${RECOMMENDATION_SERVICE_URL}/recommend`, recommendRequest);
      this.logTest('Generate Recommendations', 
        recommendResponse.status === 200 && Array.isArray(recommendResponse.data.recommendations),
        `Generated ${recommendResponse.data.recommendations?.length || 0} recommendations`);

      // Test Content-Based Recommendations
      const contentBasedResponse = await axios.post(`${RECOMMENDATION_SERVICE_URL}/recommend/content-based`, {
        userId: this.testUserId,
        filters: { limit: 5 }
      });
      this.logTest('Content-Based Recommendations', 
        contentBasedResponse.status === 200,
        `Content-based algorithm working`);

      // Test Hybrid Recommendations
      const hybridResponse = await axios.post(`${RECOMMENDATION_SERVICE_URL}/recommend/hybrid`, {
        userId: this.testUserId,
        filters: { limit: 5 }
      });
      this.logTest('Hybrid Recommendations', 
        hybridResponse.status === 200,
        `Hybrid algorithm working`);

    } catch (error) {
      this.logTest('Recommendation Generation', false, `Error: ${error.message}`);
    }
  }

  async testFeedbackCollection() {
    console.log('📝 Testing Feedback Collection...'.yellow);

    try {
      // Test Explicit Feedback
      const feedbackData = {
        userId: this.testUserId,
        couponId: 'coupon-1',
        feedback_type: 'like',
        rating: 5,
        comment: 'Great coupon!'
      };

      const feedbackResponse = await axios.post(`${RECOMMENDATION_SERVICE_URL}/feedback`, feedbackData);
      this.logTest('Record Explicit Feedback', feedbackResponse.status === 201,
        `Feedback recorded successfully`);

      // Test Implicit Feedback
      const implicitFeedbackData = {
        userId: this.testUserId,
        couponId: 'coupon-2',
        timeSpent: 45,
        scrollDepth: 0.8,
        interactionCount: 3
      };

      const implicitResponse = await axios.post(`${RECOMMENDATION_SERVICE_URL}/feedback/implicit`, implicitFeedbackData);
      this.logTest('Record Implicit Feedback', implicitResponse.status === 200,
        `Implicit feedback recorded`);

    } catch (error) {
      this.logTest('Feedback Collection', false, `Error: ${error.message}`);
    }
  }

  async testRealtimeRecommendations() {
    console.log('⚡ Testing Realtime Recommendations...'.yellow);

    try {
      const realtimeRequest = {
        userId: this.testUserId,
        context: {
          current_page: 'electronics',
          time_of_day: 'evening',
          urgency: 'high'
        },
        limit: 3
      };

      const startTime = Date.now();
      const realtimeResponse = await axios.post(`${RECOMMENDATION_SERVICE_URL}/recommend/realtime`, realtimeRequest);
      const responseTime = Date.now() - startTime;

      this.logTest('Realtime Recommendations', 
        realtimeResponse.status === 200 && responseTime < 500,
        `Response time: ${responseTime}ms (should be < 500ms)`);

    } catch (error) {
      this.logTest('Realtime Recommendations', false, `Error: ${error.message}`);
    }
  }

  async testAnalytics() {
    console.log('📊 Testing Analytics...'.yellow);

    try {
      // Test Performance Analytics
      const analyticsResponse = await axios.get(`${RECOMMENDATION_SERVICE_URL}/analytics/performance`, {
        params: {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        }
      });

      this.logTest('Performance Analytics', analyticsResponse.status === 200,
        `Analytics data retrieved`);

    } catch (error) {
      this.logTest('Analytics', false, `Error: ${error.message}`);
    }
  }

  async testRecommendationQuality() {
    console.log('🎯 Testing Recommendation Quality...'.yellow);

    try {
      // Generate recommendations and check quality metrics
      const recommendRequest = {
        userId: this.testUserId,
        filters: { limit: 10 }
      };

      const response = await axios.post(`${RECOMMENDATION_SERVICE_URL}/recommend`, recommendRequest);
      
      if (response.status === 200 && response.data.recommendations) {
        const recommendations = response.data.recommendations;
        
        // Check if recommendations are properly scored
        const hasScores = recommendations.every(rec => 
          typeof rec.score === 'number' && rec.score >= 0 && rec.score <= 1
        );
        
        // Check if recommendations are ranked
        const isRanked = recommendations.every((rec, index) => 
          index === 0 || rec.score <= recommendations[index - 1].score
        );
        
        // Check personalization scores
        const hasPersonalization = recommendations.every(rec => 
          typeof rec.personalization_score === 'number'
        );

        this.logTest('Recommendation Scoring', hasScores, 
          `All recommendations have valid scores`);
        this.logTest('Recommendation Ranking', isRanked, 
          `Recommendations are properly ranked by score`);
        this.logTest('Personalization Scoring', hasPersonalization, 
          `All recommendations have personalization scores`);
      }

    } catch (error) {
      this.logTest('Recommendation Quality', false, `Error: ${error.message}`);
    }
  }

  async testLoadPerformance() {
    console.log('🚀 Testing Load Performance...'.yellow);

    try {
      const concurrentRequests = 10;
      const promises = [];

      const startTime = Date.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        const promise = axios.post(`${RECOMMENDATION_SERVICE_URL}/recommend/realtime`, {
          userId: `load-test-user-${i}`,
          limit: 5
        });
        promises.push(promise);
      }

      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      
      const successfulRequests = results.filter(result => result.status === 'fulfilled').length;
      const averageResponseTime = (endTime - startTime) / concurrentRequests;

      this.logTest('Concurrent Request Handling', 
        successfulRequests >= concurrentRequests * 0.8,
        `${successfulRequests}/${concurrentRequests} requests successful`);
        
      this.logTest('Average Response Time', 
        averageResponseTime < 1000,
        `Average: ${averageResponseTime.toFixed(2)}ms per request`);

    } catch (error) {
      this.logTest('Load Performance', false, `Error: ${error.message}`);
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
    
    console.log('\n🎉 Recommendation System Testing Complete!'.green.bold);
    
    if (failedTests === 0) {
      console.log('✨ All tests passed! The recommendation system is working correctly.'.green);
    } else {
      console.log('⚠️  Some tests failed. Please check the implementation.'.yellow);
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new RecommendationTester();
  tester.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = RecommendationTester;
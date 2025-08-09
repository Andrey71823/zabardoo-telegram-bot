const axios = require('axios');

const BASE_URL = 'http://localhost:3010'; // Admin server port

class UserManagementTester {
  constructor() {
    this.testResults = [];
    this.testUserId = null;
  }

  async runAllTests() {
    console.log('🧪 Starting User Management System Tests...\n');

    const tests = [
      () => this.testGetUsers(),
      () => this.testSearchUsers(),
      () => this.testGetUserStats(),
      () => this.testUserBanUnban(),
      () => this.testChannelManagement(),
      () => this.testBulkOperations(),
      () => this.testUserSegmentation(),
      () => this.testModerationLogs(),
      () => this.testNotifications(),
      () => this.testGroupModerationSettings()
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
        this.testResults.push({ test: test.name, status: 'failed', error: error.message });
      }
    }

    this.printTestSummary();
  }

  async testGetUsers() {
    console.log('👥 Testing user retrieval...');

    try {
      // Test getting all users
      const allUsersResponse = await axios.get(`${BASE_URL}/api/admin/users?limit=10`);
      
      if (allUsersResponse.data.success) {
        console.log('✅ Retrieved all users successfully');
        console.log(`   Total users: ${allUsersResponse.data.data.total}`);
        console.log(`   Current page: ${allUsersResponse.data.data.page}`);
        console.log(`   Total pages: ${allUsersResponse.data.data.totalPages}`);
        
        // Store a test user ID for other tests
        if (allUsersResponse.data.data.users.length > 0) {
          this.testUserId = allUsersResponse.data.data.users[0].id;
          console.log(`   Test user ID: ${this.testUserId}`);
        }
      }

      // Test with filters
      const filteredResponse = await axios.get(`${BASE_URL}/api/admin/users?isActive=true&limit=5`);
      
      if (filteredResponse.data.success) {
        console.log('✅ Retrieved filtered users successfully');
        console.log(`   Active users: ${filteredResponse.data.data.users.length}`);
      }

      this.testResults.push({ test: 'getUsers', status: 'passed' });
    } catch (error) {
      throw new Error(`Get users test failed: ${error.message}`);
    }
  }

  async testSearchUsers() {
    console.log('🔍 Testing user search...');

    try {
      const searchResponse = await axios.get(`${BASE_URL}/api/admin/users/search?query=test&limit=5`);
      
      if (searchResponse.data.success) {
        console.log('✅ User search functionality working');
        console.log(`   Search results: ${searchResponse.data.data.users.length}`);
      }

      this.testResults.push({ test: 'searchUsers', status: 'passed' });
    } catch (error) {
      throw new Error(`Search users test failed: ${error.message}`);
    }
  }

  async testGetUserStats() {
    console.log('📊 Testing user statistics...');

    try {
      const statsResponse = await axios.get(`${BASE_URL}/api/admin/users/stats`);
      
      if (statsResponse.data.success) {
        const stats = statsResponse.data.data;
        console.log('✅ Retrieved user statistics successfully');
        console.log(`   Total users: ${stats.totalUsers}`);
        console.log(`   Active users: ${stats.activeUsers}`);
        console.log(`   Banned users: ${stats.bannedUsers}`);
        console.log(`   New users today: ${stats.newUsersToday}`);
        console.log(`   Users with channels: ${stats.usersWithPersonalChannels}`);
        console.log(`   Average spent per user: ₹${stats.averageSpentPerUser}`);
        console.log(`   Activity levels - High: ${stats.activityLevels.high}, Medium: ${stats.activityLevels.medium}, Low: ${stats.activityLevels.low}, Inactive: ${stats.activityLevels.inactive}`);
      }

      this.testResults.push({ test: 'getUserStats', status: 'passed' });
    } catch (error) {
      throw new Error(`Get user stats test failed: ${error.message}`);
    }
  }

  async testUserBanUnban() {
    console.log('🚫 Testing user ban/unban functionality...');

    if (!this.testUserId) {
      throw new Error('No test user ID available for ban/unban test');
    }

    try {
      // Test banning user
      const banData = {
        action: 'ban',
        reason: 'Testing ban functionality',
        duration: 24 // 24 hours
      };

      const banResponse = await axios.put(`${BASE_URL}/api/admin/users/${this.testUserId}/ban`, banData);
      
      if (banResponse.data.success) {
        console.log('✅ User banned successfully');
        console.log(`   User ID: ${this.testUserId}`);
        console.log(`   Reason: ${banData.reason}`);
        console.log(`   Duration: ${banData.duration} hours`);
      }

      // Test unbanning user
      const unbanData = {
        action: 'unban',
        reason: 'Testing unban functionality'
      };

      const unbanResponse = await axios.put(`${BASE_URL}/api/admin/users/${this.testUserId}/ban`, unbanData);
      
      if (unbanResponse.data.success) {
        console.log('✅ User unbanned successfully');
        console.log(`   User ID: ${this.testUserId}`);
      }

      this.testResults.push({ test: 'userBanUnban', status: 'passed' });
    } catch (error) {
      throw new Error(`User ban/unban test failed: ${error.message}`);
    }
  }

  async testChannelManagement() {
    console.log('📺 Testing personal channel management...');

    if (!this.testUserId) {
      throw new Error('No test user ID available for channel management test');
    }

    try {
      // Test creating personal channel
      const createChannelData = {
        action: 'create',
        reason: 'Testing channel creation'
      };

      const createResponse = await axios.put(`${BASE_URL}/api/admin/users/${this.testUserId}/channel`, createChannelData);
      
      if (createResponse.data.success) {
        console.log('✅ Personal channel created successfully');
        console.log(`   User ID: ${this.testUserId}`);
        console.log(`   Channel ID: ${createResponse.data.data.channelId}`);
        console.log(`   Status: ${createResponse.data.data.status}`);
      }

      // Test suspending channel
      const suspendChannelData = {
        action: 'suspend',
        reason: 'Testing channel suspension'
      };

      const suspendResponse = await axios.put(`${BASE_URL}/api/admin/users/${this.testUserId}/channel`, suspendChannelData);
      
      if (suspendResponse.data.success) {
        console.log('✅ Personal channel suspended successfully');
        console.log(`   Status: ${suspendResponse.data.data.status}`);
      }

      // Test restoring channel
      const restoreChannelData = {
        action: 'restore',
        reason: 'Testing channel restoration'
      };

      const restoreResponse = await axios.put(`${BASE_URL}/api/admin/users/${this.testUserId}/channel`, restoreChannelData);
      
      if (restoreResponse.data.success) {
        console.log('✅ Personal channel restored successfully');
        console.log(`   Status: ${restoreResponse.data.data.status}`);
      }

      this.testResults.push({ test: 'channelManagement', status: 'passed' });
    } catch (error) {
      throw new Error(`Channel management test failed: ${error.message}`);
    }
  }

  async testBulkOperations() {
    console.log('📦 Testing bulk operations...');

    if (!this.testUserId) {
      throw new Error('No test user ID available for bulk operations test');
    }

    try {
      const bulkOperationData = {
        userIds: [this.testUserId],
        operation: 'suspend_channel',
        reason: 'Testing bulk channel suspension'
      };

      const response = await axios.post(`${BASE_URL}/api/admin/users/bulk-operation`, bulkOperationData);
      
      if (response.data.success) {
        const result = response.data.data;
        console.log('✅ Bulk operation completed successfully');
        console.log(`   Operation: ${bulkOperationData.operation}`);
        console.log(`   Success count: ${result.success}`);
        console.log(`   Failed count: ${result.failed}`);
        console.log(`   Errors: ${result.errors.length}`);
      }

      this.testResults.push({ test: 'bulkOperations', status: 'passed' });
    } catch (error) {
      throw new Error(`Bulk operations test failed: ${error.message}`);
    }
  }

  async testUserSegmentation() {
    console.log('🎯 Testing user segmentation...');

    try {
      const segmentationCriteria = {
        totalSpent: { min: 100 },
        activityLevel: 'high',
        registrationDateRange: {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          to: new Date()
        }
      };

      const response = await axios.post(`${BASE_URL}/api/admin/users/segment`, segmentationCriteria);
      
      if (response.data.success) {
        const segments = response.data.data;
        console.log('✅ User segmentation completed successfully');
        console.log(`   Segments created: ${segments.length}`);
        
        segments.forEach((segment, index) => {
          console.log(`   Segment ${index + 1}: ${segment.name} (${segment.userCount} users)`);
        });
      }

      this.testResults.push({ test: 'userSegmentation', status: 'passed' });
    } catch (error) {
      throw new Error(`User segmentation test failed: ${error.message}`);
    }
  }

  async testModerationLogs() {
    console.log('📋 Testing moderation logs...');

    try {
      const response = await axios.get(`${BASE_URL}/api/admin/moderation/logs?limit=10`);
      
      if (response.data.success) {
        const logs = response.data.data;
        console.log('✅ Retrieved moderation logs successfully');
        console.log(`   Total logs: ${logs.total}`);
        console.log(`   Current page: ${logs.page}`);
        console.log(`   Logs on this page: ${logs.logs.length}`);
        
        if (logs.logs.length > 0) {
          console.log(`   Recent action: ${logs.logs[0].action} by ${logs.logs[0].moderatorId}`);
        }
      }

      this.testResults.push({ test: 'moderationLogs', status: 'passed' });
    } catch (error) {
      throw new Error(`Moderation logs test failed: ${error.message}`);
    }
  }

  async testNotifications() {
    console.log('🔔 Testing user notifications...');

    if (!this.testUserId) {
      throw new Error('No test user ID available for notifications test');
    }

    try {
      const notificationData = {
        userIds: [this.testUserId],
        notification: {
          title: 'Test Notification',
          message: 'This is a test notification from the admin panel.',
          type: 'info',
          actionUrl: 'https://zabardoo.com/test'
        }
      };

      const response = await axios.post(`${BASE_URL}/api/admin/users/notify`, notificationData);
      
      if (response.data.success) {
        const result = response.data.data;
        console.log('✅ Notifications sent successfully');
        console.log(`   Sent: ${result.sent}`);
        console.log(`   Failed: ${result.failed}`);
        console.log(`   Errors: ${result.errors.length}`);
      }

      this.testResults.push({ test: 'notifications', status: 'passed' });
    } catch (error) {
      throw new Error(`Notifications test failed: ${error.message}`);
    }
  }

  async testGroupModerationSettings() {
    console.log('⚙️ Testing group moderation settings...');

    try {
      // Test getting current settings
      const getResponse = await axios.get(`${BASE_URL}/api/admin/moderation/group-settings`);
      
      if (getResponse.data.success) {
        console.log('✅ Retrieved group moderation settings successfully');
        const settings = getResponse.data.data;
        console.log(`   Auto moderation enabled: ${settings.autoModeration.enabled}`);
        console.log(`   Spam detection: ${settings.autoModeration.spamDetection}`);
        console.log(`   Message frequency limit: ${settings.restrictions.messageFrequencyLimit}`);
        console.log(`   Auto ban threshold: ${settings.warningThresholds.autoBan}`);
      }

      // Test updating settings
      const updateData = {
        autoModeration: {
          enabled: true,
          spamDetection: true,
          linkFiltering: true,
          profanityFilter: true,
          duplicateMessageFilter: true
        },
        restrictions: {
          newMemberRestrictions: true,
          messageFrequencyLimit: 3,
          linkPostingAllowed: false,
          mediaPostingAllowed: true,
          forwardingAllowed: true
        },
        warningThresholds: {
          autoWarn: 2,
          autoMute: 4,
          autoBan: 8
        }
      };

      const updateResponse = await axios.put(`${BASE_URL}/api/admin/moderation/group-settings`, updateData);
      
      if (updateResponse.data.success) {
        console.log('✅ Group moderation settings updated successfully');
        console.log(`   Updated by: ${updateResponse.data.data.updatedBy}`);
        console.log(`   Updated at: ${updateResponse.data.data.updatedAt}`);
      }

      this.testResults.push({ test: 'groupModerationSettings', status: 'passed' });
    } catch (error) {
      throw new Error(`Group moderation settings test failed: ${error.message}`);
    }
  }

  printTestSummary() {
    console.log('\n📋 Test Summary:');
    console.log('================');

    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const total = this.testResults.length;

    console.log(`Total tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed tests:');
      this.testResults
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`   - ${r.test}: ${r.error}`);
        });
    }

    console.log('\n🎉 User Management System testing completed!');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new UserManagementTester();
  
  tester.runAllTests()
    .catch(error => {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    });
}

module.exports = UserManagementTester;
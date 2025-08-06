const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

class CouponManagementTester {
  constructor() {
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🧪 Starting Coupon Management System Tests...\n');

    const tests = [
      () => this.testCreateCoupon(),
      () => this.testGetCoupons(),
      () => this.testUpdateCoupon(),
      () => this.testCouponValidation(),
      () => this.testBulkOperations(),
      () => this.testModeration(),
      () => this.testCouponStats(),
      () => this.testSearchAndFilters(),
      () => this.testCouponTemplates(),
      () => this.testCouponDuplication()
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

  async testCreateCoupon() {
    console.log('📝 Testing coupon creation...');

    const couponData = {
      title: 'Test Coupon - 50% Off Electronics',
      description: 'Get 50% off on all electronics items. Limited time offer!',
      code: 'ELECTRONICS50',
      discount: 50,
      discountType: 'percentage',
      store: 'TechMart',
      storeId: 'techmart-001',
      category: 'Electronics',
      validFrom: new Date(),
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: 1000,
      priority: 8,
      tags: ['electronics', 'discount', 'limited-time'],
      affiliateLink: 'https://techmart.com/affiliate/electronics50',
      imageUrl: 'https://techmart.com/images/electronics-banner.jpg',
      termsAndConditions: 'Valid on electronics items only. Cannot be combined with other offers.',
      createdBy: 'admin-test',
      source: 'admin',
      isExclusive: true,
      isFeatured: false
    };

    try {
      const response = await axios.post(`${BASE_URL}/api/admin/coupons`, couponData);
      
      if (response.data.success) {
        console.log('✅ Coupon created successfully');
        console.log(`   Coupon ID: ${response.data.data.id}`);
        console.log(`   Title: ${response.data.data.title}`);
        console.log(`   Status: ${response.data.data.status}`);
        
        this.testCouponId = response.data.data.id;
        this.testResults.push({ test: 'createCoupon', status: 'passed' });
      } else {
        throw new Error(`Failed to create coupon: ${response.data.error}`);
      }
    } catch (error) {
      throw new Error(`Create coupon test failed: ${error.message}`);
    }
  }

  async testGetCoupons() {
    console.log('📋 Testing coupon retrieval...');

    try {
      const allCouponsResponse = await axios.get(`${BASE_URL}/api/admin/coupons?limit=10`);
      
      if (allCouponsResponse.data.success) {
        console.log('✅ Retrieved all coupons successfully');
        console.log(`   Total coupons: ${allCouponsResponse.data.data.total}`);
        console.log(`   Current page: ${allCouponsResponse.data.data.page}`);
        console.log(`   Total pages: ${allCouponsResponse.data.data.totalPages}`);
      }

      if (this.testCouponId) {
        const specificCouponResponse = await axios.get(`${BASE_URL}/api/admin/coupons/${this.testCouponId}`);
        
        if (specificCouponResponse.data.success) {
          console.log('✅ Retrieved specific coupon successfully');
          console.log(`   Coupon title: ${specificCouponResponse.data.data.title}`);
        }
      }

      this.testResults.push({ test: 'getCoupons', status: 'passed' });
    } catch (error) {
      throw new Error(`Get coupons test failed: ${error.message}`);
    }
  }

  async testUpdateCoupon() {
    console.log('✏️ Testing coupon update...');

    if (!this.testCouponId) {
      throw new Error('No test coupon ID available for update test');
    }

    const updateData = {
      title: 'Updated Test Coupon - 60% Off Electronics',
      discount: 60,
      priority: 9,
      isFeatured: true
    };

    try {
      const response = await axios.put(`${BASE_URL}/api/admin/coupons/${this.testCouponId}`, updateData);
      
      if (response.data.success) {
        console.log('✅ Coupon updated successfully');
        console.log(`   New title: ${response.data.data.title}`);
        console.log(`   New discount: ${response.data.data.discount}%`);
        console.log(`   Featured: ${response.data.data.isFeatured}`);
        
        this.testResults.push({ test: 'updateCoupon', status: 'passed' });
      } else {
        throw new Error(`Failed to update coupon: ${response.data.error}`);
      }
    } catch (error) {
      throw new Error(`Update coupon test failed: ${error.message}`);
    }
  }

  async testCouponValidation() {
    console.log('🔍 Testing coupon validation...');

    const invalidCouponData = {
      title: '',
      description: 'Test description',
      discount: -10,
      discountType: 'percentage',
      store: 'TestStore',
      category: 'Test',
      affiliateLink: 'invalid-url',
      createdBy: 'test'
    };

    try {
      const response = await axios.post(`${BASE_URL}/api/admin/coupons/validate`, invalidCouponData);
      
      if (response.data.success) {
        const validation = response.data.data;
        console.log('✅ Validation test completed');
        console.log(`   Is valid: ${validation.isValid}`);
        console.log(`   Errors: ${validation.errors.length}`);
        console.log(`   Warnings: ${validation.warnings.length}`);
        
        if (!validation.isValid && validation.errors.length > 0) {
          console.log('   Validation errors detected as expected');
          this.testResults.push({ test: 'couponValidation', status: 'passed' });
        } else {
          throw new Error('Validation should have failed for invalid data');
        }
      } else {
        throw new Error(`Validation test failed: ${response.data.error}`);
      }
    } catch (error) {
      throw new Error(`Coupon validation test failed: ${error.message}`);
    }
  }

  async testBulkOperations() {
    console.log('📦 Testing bulk operations...');

    if (!this.testCouponId) {
      throw new Error('No test coupon ID available for bulk operations test');
    }

    const bulkOperationData = {
      operation: 'activate',
      couponIds: [this.testCouponId]
    };

    try {
      const response = await axios.post(`${BASE_URL}/api/admin/coupons/bulk-operation`, bulkOperationData);
      
      if (response.data.success) {
        const result = response.data.data;
        console.log('✅ Bulk operation completed successfully');
        console.log(`   Success count: ${result.success}`);
        console.log(`   Failed count: ${result.failed}`);
        console.log(`   Errors: ${result.errors.length}`);
        
        this.testResults.push({ test: 'bulkOperations', status: 'passed' });
      } else {
        throw new Error(`Bulk operation failed: ${response.data.error}`);
      }
    } catch (error) {
      throw new Error(`Bulk operations test failed: ${error.message}`);
    }
  }

  async testModeration() {
    console.log('⚖️ Testing coupon moderation...');

    if (!this.testCouponId) {
      throw new Error('No test coupon ID available for moderation test');
    }

    try {
      const pendingResponse = await axios.get(`${BASE_URL}/api/admin/coupons/pending-moderation`);
      
      if (pendingResponse.data.success) {
        console.log('✅ Retrieved pending moderation coupons');
        console.log(`   Pending count: ${pendingResponse.data.data.length}`);
      }

      const moderationData = {
        action: 'approve',
        notes: 'Approved during automated testing'
      };

      const moderationResponse = await axios.put(`${BASE_URL}/api/admin/coupons/${this.testCouponId}/moderate`, moderationData);
      
      if (moderationResponse.data.success) {
        console.log('✅ Coupon moderated successfully');
        console.log(`   New status: ${moderationResponse.data.data.status}`);
        console.log(`   Moderated by: ${moderationResponse.data.data.moderatedBy}`);
        
        this.testResults.push({ test: 'moderation', status: 'passed' });
      } else {
        throw new Error(`Moderation failed: ${moderationResponse.data.error}`);
      }
    } catch (error) {
      throw new Error(`Moderation test failed: ${error.message}`);
    }
  }

  async testCouponStats() {
    console.log('📊 Testing coupon statistics...');

    try {
      const response = await axios.get(`${BASE_URL}/api/admin/coupons/stats`);
      
      if (response.data.success) {
        const stats = response.data.data;
        console.log('✅ Retrieved coupon statistics successfully');
        console.log(`   Total coupons: ${stats.total}`);
        console.log(`   Active coupons: ${stats.active}`);
        console.log(`   Pending coupons: ${stats.pending}`);
        console.log(`   Total clicks: ${stats.totalClicks}`);
        console.log(`   Total conversions: ${stats.totalConversions}`);
        console.log(`   Total revenue: ₹${stats.totalRevenue}`);
        console.log(`   Conversion rate: ${stats.conversionRate.toFixed(2)}%`);
        console.log(`   Top stores: ${stats.topStores.length}`);
        console.log(`   Top categories: ${stats.topCategories.length}`);
        
        this.testResults.push({ test: 'couponStats', status: 'passed' });
      } else {
        throw new Error(`Failed to get stats: ${response.data.error}`);
      }
    } catch (error) {
      throw new Error(`Coupon stats test failed: ${error.message}`);
    }
  }

  async testSearchAndFilters() {
    console.log('🔎 Testing search and filters...');

    try {
      const searchResponse = await axios.get(`${BASE_URL}/api/admin/coupons/search?query=electronics&limit=5`);
      
      if (searchResponse.data.success) {
        console.log('✅ Search functionality working');
        console.log(`   Search results: ${searchResponse.data.data.length}`);
      }

      const storeResponse = await axios.get(`${BASE_URL}/api/admin/coupons/store/TechMart?limit=10`);
      
      if (storeResponse.data.success) {
        console.log('✅ Store filter working');
        console.log(`   Store coupons: ${storeResponse.data.data.length}`);
      }

      const categoryResponse = await axios.get(`${BASE_URL}/api/admin/coupons/category/Electronics?limit=10`);
      
      if (categoryResponse.data.success) {
        console.log('✅ Category filter working');
        console.log(`   Category coupons: ${categoryResponse.data.data.length}`);
      }

      const filterParams = new URLSearchParams({
        status: 'active,pending',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: '5'
      });

      const filteredResponse = await axios.get(`${BASE_URL}/api/admin/coupons?${filterParams}`);
      
      if (filteredResponse.data.success) {
        console.log('✅ Advanced filters working');
        console.log(`   Filtered results: ${filteredResponse.data.data.coupons.length}`);
      }

      this.testResults.push({ test: 'searchAndFilters', status: 'passed' });
    } catch (error) {
      throw new Error(`Search and filters test failed: ${error.message}`);
    }
  }

  async testCouponTemplates() {
    console.log('📋 Testing coupon templates...');

    try {
      const response = await axios.get(`${BASE_URL}/api/admin/coupons/templates`);
      
      if (response.data.success) {
        const templates = response.data.data;
        console.log('✅ Retrieved coupon templates successfully');
        console.log(`   Available templates: ${templates.length}`);
        
        templates.forEach(template => {
          console.log(`   - ${template.name}: ${template.description}`);
        });
        
        this.testResults.push({ test: 'couponTemplates', status: 'passed' });
      } else {
        throw new Error(`Failed to get templates: ${response.data.error}`);
      }
    } catch (error) {
      throw new Error(`Coupon templates test failed: ${error.message}`);
    }
  }

  async testCouponDuplication() {
    console.log('📄 Testing coupon duplication...');

    if (!this.testCouponId) {
      throw new Error('No test coupon ID available for duplication test');
    }

    try {
      const response = await axios.post(`${BASE_URL}/api/admin/coupons/${this.testCouponId}/duplicate`);
      
      if (response.data.success) {
        const duplicatedCoupon = response.data.data;
        console.log('✅ Coupon duplicated successfully');
        console.log(`   Original ID: ${this.testCouponId}`);
        console.log(`   Duplicate ID: ${duplicatedCoupon.id}`);
        console.log(`   Duplicate title: ${duplicatedCoupon.title}`);
        console.log(`   Duplicate code: ${duplicatedCoupon.code}`);
        
        this.duplicatedCouponId = duplicatedCoupon.id;
        this.testResults.push({ test: 'couponDuplication', status: 'passed' });
      } else {
        throw new Error(`Failed to duplicate coupon: ${response.data.error}`);
      }
    } catch (error) {
      throw new Error(`Coupon duplication test failed: ${error.message}`);
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up test data...');

    const couponsToDelete = [this.testCouponId, this.duplicatedCouponId].filter(Boolean);

    for (const couponId of couponsToDelete) {
      try {
        await axios.delete(`${BASE_URL}/api/admin/coupons/${couponId}`);
        console.log(`✅ Deleted test coupon: ${couponId}`);
      } catch (error) {
        console.log(`⚠️ Failed to delete coupon ${couponId}: ${error.message}`);
      }
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

    console.log('\n🎉 Coupon Management System testing completed!');
  }
}

if (require.main === module) {
  const tester = new CouponManagementTester();
  
  tester.runAllTests()
    .then(() => tester.cleanup())
    .catch(error => {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    });
}

module.exports = CouponManagementTester;
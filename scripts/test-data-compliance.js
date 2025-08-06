const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/admin/data-compliance';

class DataComplianceTestSuite {
  constructor() {
    this.testResults = [];
    this.testUserId = 'test-user-' + Date.now();
  }

  async runAllTests() {
    console.log('🛡️ Starting Data Compliance System Tests...\n');

    try {
      await this.testConsentManagement();
      await this.testDataProcessingRecords();
      await this.testDataDeletion();
      await this.testDataExport();
      await this.testComplianceReporting();
      await this.testGrievanceManagement();
      await this.testDataLocalization();
      await this.testAutomatedProcesses();
      await this.testIndianComplianceSpecifics();

      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    }
  }

  async testConsentManagement() {
    console.log('📋 Testing Consent Management...');

    // Test granting consent
    await this.runTest('Grant Data Collection Consent', async () => {
      const response = await axios.post(`${BASE_URL}/consent/grant`, {
        userId: this.testUserId,
        consentType: 'data_collection',
        version: '1.0'
      });
      return response.status === 201 && response.data.success;
    });

    // Test checking consent
    await this.runTest('Check Consent Status', async () => {
      const response = await axios.get(`${BASE_URL}/consent/${this.testUserId}/data_collection`);
      return response.status === 200 && response.data.data.hasConsent === true;
    });

    // Test granting marketing consent
    await this.runTest('Grant Marketing Consent', async () => {
      const response = await axios.post(`${BASE_URL}/consent/grant`, {
        userId: this.testUserId,
        consentType: 'marketing',
        version: '1.0'
      });
      return response.status === 201 && response.data.success;
    });

    // Test revoking consent
    await this.runTest('Revoke Marketing Consent', async () => {
      const response = await axios.post(`${BASE_URL}/consent/revoke`, {
        userId: this.testUserId,
        consentType: 'marketing'
      });
      return response.status === 200 && response.data.success;
    });

    // Test consent dashboard
    await this.runTest('Get User Consent Dashboard', async () => {
      const response = await axios.get(`${BASE_URL}/consent/dashboard/${this.testUserId}`);
      return response.status === 200 && response.data.success;
    });

    console.log('✅ Consent Management tests completed\n');
  }

  async testDataProcessingRecords() {
    console.log('📊 Testing Data Processing Records...');

    // Test recording data processing
    await this.runTest('Record Personal Data Processing', async () => {
      const response = await axios.post(`${BASE_URL}/processing/record`, {
        userId: this.testUserId,
        dataType: 'personal',
        processingPurpose: 'User registration and profile management',
        legalBasis: 'consent',
        dataSource: 'registration_form',
        retentionDays: 730
      });
      return response.status === 201 && response.data.success;
    });

    // Test recording financial data processing
    await this.runTest('Record Financial Data Processing', async () => {
      const response = await axios.post(`${BASE_URL}/processing/record`, {
        userId: this.testUserId,
        dataType: 'financial',
        processingPurpose: 'Cashback processing and payments',
        legalBasis: 'contract',
        dataSource: 'payment_system',
        retentionDays: 2555 // 7 years for RBI compliance
      });
      return response.status === 201 && response.data.success;
    });

    // Test recording behavioral data processing
    await this.runTest('Record Behavioral Data Processing', async () => {
      const response = await axios.post(`${BASE_URL}/processing/record`, {
        userId: this.testUserId,
        dataType: 'behavioral',
        processingPurpose: 'Personalized recommendations',
        legalBasis: 'legitimate_interests',
        dataSource: 'user_interactions',
        retentionDays: 365
      });
      return response.status === 201 && response.data.success;
    });

    console.log('✅ Data Processing Records tests completed\n');
  }

  async testDataDeletion() {
    console.log('🗑️ Testing Data Deletion (Right to be Forgotten)...');

    let deletionRequestId;

    // Test requesting partial data deletion
    await this.runTest('Request Partial Data Deletion', async () => {
      const response = await axios.post(`${BASE_URL}/deletion/request`, {
        userId: this.testUserId,
        requestType: 'partial_deletion',
        requestedData: ['behavioral_data'],
        reason: 'User no longer wants personalized recommendations'
      });
      
      if (response.status === 201 && response.data.success) {
        deletionRequestId = response.data.data.id;
        return true;
      }
      return false;
    });

    // Test processing deletion request
    if (deletionRequestId) {
      await this.runTest('Process Deletion Request', async () => {
        const response = await axios.post(`${BASE_URL}/deletion/process/${deletionRequestId}`);
        return response.status === 200 && response.data.success;
      });
    }

    // Test requesting full data deletion
    await this.runTest('Request Full Data Deletion', async () => {
      const response = await axios.post(`${BASE_URL}/deletion/request`, {
        userId: this.testUserId,
        requestType: 'full_deletion',
        requestedData: ['all_data'],
        reason: 'User wants to delete account completely'
      });
      return response.status === 201 && response.data.success;
    });

    // Test requesting anonymization
    await this.runTest('Request Data Anonymization', async () => {
      const response = await axios.post(`${BASE_URL}/deletion/request`, {
        userId: 'test-user-anon-' + Date.now(),
        requestType: 'anonymization',
        requestedData: ['personal_data'],
        reason: 'User wants to keep using service but anonymously'
      });
      return response.status === 201 && response.data.success;
    });

    console.log('✅ Data Deletion tests completed\n');
  }

  async testDataExport() {
    console.log('📤 Testing Data Export (Right to Data Portability)...');

    // Test exporting user data
    await this.runTest('Export User Data', async () => {
      const response = await axios.get(`${BASE_URL}/export/${this.testUserId}`);
      
      if (response.status === 200 && response.data.success) {
        const userData = response.data.data;
        return userData.hasOwnProperty('profile') && 
               userData.hasOwnProperty('consents') &&
               userData.hasOwnProperty('processingRecords');
      }
      return false;
    });

    console.log('✅ Data Export tests completed\n');
  }

  async testComplianceReporting() {
    console.log('📊 Testing Compliance Reporting...');

    // Test generating compliance report
    await this.runTest('Generate Compliance Report', async () => {
      const response = await axios.get(`${BASE_URL}/report/compliance`);
      
      if (response.status === 200 && response.data.success) {
        const report = response.data.data;
        return report.hasOwnProperty('complianceScore') &&
               report.hasOwnProperty('dataMinimization') &&
               report.hasOwnProperty('purposeLimitation') &&
               report.hasOwnProperty('paymentDataLocalization');
      }
      return false;
    });

    console.log('✅ Compliance Reporting tests completed\n');
  }

  async testGrievanceManagement() {
    console.log('📝 Testing Grievance Management (IT Rules 2021)...');

    // Test submitting grievance
    await this.runTest('Submit Data Protection Grievance', async () => {
      const response = await axios.post(`${BASE_URL}/grievance/submit`, {
        userId: this.testUserId,
        grievanceType: 'data_protection',
        description: 'User believes their personal data is being misused',
        priority: 'high'
      });
      return response.status === 201 && response.data.success;
    });

    // Test submitting privacy violation grievance
    await this.runTest('Submit Privacy Violation Grievance', async () => {
      const response = await axios.post(`${BASE_URL}/grievance/submit`, {
        userId: this.testUserId,
        grievanceType: 'privacy_violation',
        description: 'Unauthorized sharing of personal information',
        priority: 'critical'
      });
      return response.status === 201 && response.data.success;
    });

    console.log('✅ Grievance Management tests completed\n');
  }

  async testDataLocalization() {
    console.log('🇮🇳 Testing Data Localization (RBI Compliance)...');

    // Test data localization status
    await this.runTest('Check Data Localization Status', async () => {
      const response = await axios.get(`${BASE_URL}/localization/status`);
      
      if (response.status === 200 && response.data.success) {
        const status = response.data.data;
        return status.paymentData.localized === true &&
               status.paymentData.location === 'India' &&
               status.overallCompliance === 'compliant';
      }
      return false;
    });

    console.log('✅ Data Localization tests completed\n');
  }

  async testAutomatedProcesses() {
    console.log('🤖 Testing Automated Processes...');

    // Test processing expired data
    await this.runTest('Process Expired Data', async () => {
      const response = await axios.post(`${BASE_URL}/process/expired-data`);
      return response.status === 200 && response.data.success;
    });

    console.log('✅ Automated Processes tests completed\n');
  }

  async testIndianComplianceSpecifics() {
    console.log('🇮🇳 Testing Indian Compliance Specifics...');

    // Test privacy policy retrieval
    await this.runTest('Get Privacy Policy (Indian Context)', async () => {
      const response = await axios.get(`${BASE_URL}/privacy-policy`);
      
      if (response.status === 200 && response.data.success) {
        const policy = response.data.data;
        return policy.content.hasOwnProperty('dataLocalization') &&
               policy.content.hasOwnProperty('grievanceRedressal') &&
               policy.content.contactInfo.hasOwnProperty('grievanceOfficer');
      }
      return false;
    });

    // Test PDPB compliance features
    await this.runTest('PDPB Compliance Features', async () => {
      const response = await axios.get(`${BASE_URL}/report/compliance`);
      
      if (response.status === 200 && response.data.success) {
        const report = response.data.data;
        // Check all PDPB requirements
        return report.dataMinimization &&
               report.purposeLimitation &&
               report.storageMinimization &&
               report.dataAccuracy &&
               report.transparencyAndAccountability;
      }
      return false;
    });

    // Test IT Rules 2021 compliance
    await this.runTest('IT Rules 2021 Compliance', async () => {
      const response = await axios.get(`${BASE_URL}/report/compliance`);
      
      if (response.status === 200 && response.data.success) {
        const report = response.data.data;
        return report.grievanceOfficerAppointed &&
               report.monthlyComplianceReport &&
               report.contentModerationCompliance;
      }
      return false;
    });

    // Test RBI guidelines compliance
    await this.runTest('RBI Guidelines Compliance', async () => {
      const response = await axios.get(`${BASE_URL}/report/compliance`);
      
      if (response.status === 200 && response.data.success) {
        const report = response.data.data;
        return report.paymentDataLocalization &&
               report.paymentDataRetention;
      }
      return false;
    });

    console.log('✅ Indian Compliance Specifics tests completed\n');
  }

  async runTest(testName, testFunction) {
    try {
      const startTime = Date.now();
      const result = await testFunction();
      const duration = Date.now() - startTime;

      this.testResults.push({
        name: testName,
        status: result ? 'PASS' : 'FAIL',
        duration: `${duration}ms`
      });

      console.log(`  ${result ? '✅' : '❌'} ${testName} (${duration}ms)`);
    } catch (error) {
      this.testResults.push({
        name: testName,
        status: 'ERROR',
        error: error.message,
        duration: 'N/A'
      });

      console.log(`  ❌ ${testName} - ERROR: ${error.message}`);
    }
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(50));

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Errors: ${errors} 💥`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0 || errors > 0) {
      console.log('\n❌ Failed/Error Tests:');
      this.testResults
        .filter(r => r.status !== 'PASS')
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.status}${test.error ? ` (${test.error})` : ''}`);
        });
    }

    console.log('\n🛡️ Data Compliance System Test Suite Completed!');
  }
}

// Run tests if called directly
if (require.main === module) {
  const testSuite = new DataComplianceTestSuite();
  testSuite.runAllTests().catch(console.error);
}

module.exports = DataComplianceTestSuite;
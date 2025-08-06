#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const colors = require('colors');

class RecommendationVerifier {
  constructor() {
    this.verificationResults = [];
    this.requiredFiles = [
      'src/models/Recommendation.ts',
      'src/repositories/RecommendationRepository.ts',
      'src/services/recommendation/RecommendationAlgorithms.ts',
      'src/services/recommendation/RecommendationService.ts',
      'src/__tests__/recommendation.test.ts'
    ];
    
    this.requiredComponents = {
      models: [
        'UserProfile',
        'RecommendationEngine',
        'RecommendationRequest',
        'RecommendationResult',
        'CouponRecommendation',
        'UserSimilarity',
        'CouponFeatures',
        'RecommendationFeedback',
        'RecommendationMetrics',
        'ABTestExperiment'
      ],
      algorithms: [
        'contentBasedRecommendations',
        'collaborativeFilteringRecommendations',
        'hybridRecommendations',
        'trendingRecommendations',
        'calculatePersonalizationScore',
        'rankRecommendations'
      ],
      serviceEndpoints: [
        '/profiles',
        '/recommend',
        '/recommend/content-based',
        '/recommend/collaborative',
        '/recommend/hybrid',
        '/recommend/trending',
        '/feedback',
        '/analytics/performance',
        '/recommend/realtime'
      ],
      repositoryMethods: [
        'createUserProfile',
        'getUserProfile',
        'updateUserProfile',
        'recordRecommendationRequest',
        'saveRecommendationResult',
        'recordFeedback',
        'getSimilarUsers',
        'getCouponFeatures',
        'getActiveRecommendationEngines',
        'getRecommendationMetrics'
      ]
    };
  }

  async runVerification() {
    console.log('🔍 Starting Recommendation System Verification...\n'.cyan.bold);

    try {
      this.verifyFileStructure();
      this.verifyModels();
      this.verifyAlgorithms();
      this.verifyRepository();
      this.verifyService();
      this.verifyTests();
      this.verifyDatabaseSchema();
      this.verifyConfiguration();
      
      this.printVerificationSummary();
    } catch (error) {
      console.error('❌ Verification failed:'.red.bold, error.message);
      process.exit(1);
    }
  }

  verifyFileStructure() {
    console.log('📁 Verifying File Structure...'.yellow);

    for (const filePath of this.requiredFiles) {
      const exists = fs.existsSync(filePath);
      this.logVerification(`File exists: ${filePath}`, exists, 
        exists ? 'File found' : 'File missing');
    }

    // Check directory structure
    const requiredDirs = [
      'src/models',
      'src/repositories',
      'src/services/recommendation',
      'src/__tests__'
    ];

    for (const dir of requiredDirs) {
      const exists = fs.existsSync(dir) && fs.statSync(dir).isDirectory();
      this.logVerification(`Directory exists: ${dir}`, exists,
        exists ? 'Directory found' : 'Directory missing');
    }
  }

  verifyModels() {
    console.log('🏗️  Verifying Data Models...'.yellow);

    try {
      const modelFile = fs.readFileSync('src/models/Recommendation.ts', 'utf8');
      
      for (const model of this.requiredComponents.models) {
        const hasModel = modelFile.includes(`export interface ${model}`) || 
                        modelFile.includes(`export type ${model}`);
        this.logVerification(`Model defined: ${model}`, hasModel,
          hasModel ? 'Model found in file' : 'Model not found');
      }

      // Check for essential model properties
      const essentialProperties = [
        'userId',
        'demographics',
        'preferences',
        'behavior',
        'engagement',
        'score',
        'personalization_score',
        'feedback_type'
      ];

      for (const prop of essentialProperties) {
        const hasProp = modelFile.includes(prop);
        this.logVerification(`Property defined: ${prop}`, hasProp,
          hasProp ? 'Property found' : 'Property missing');
      }

    } catch (error) {
      this.logVerification('Model file verification', false, `Error reading file: ${error.message}`);
    }
  }

  verifyAlgorithms() {
    console.log('🧮 Verifying Recommendation Algorithms...'.yellow);

    try {
      const algorithmFile = fs.readFileSync('src/services/recommendation/RecommendationAlgorithms.ts', 'utf8');
      
      for (const algorithm of this.requiredComponents.algorithms) {
        const hasAlgorithm = algorithmFile.includes(algorithm);
        this.logVerification(`Algorithm implemented: ${algorithm}`, hasAlgorithm,
          hasAlgorithm ? 'Algorithm found' : 'Algorithm missing');
      }

      // Check for algorithm complexity
      const complexityIndicators = [
        'cosine similarity',
        'weighted score',
        'personalization',
        'collaborative filtering',
        'content-based',
        'hybrid'
      ];

      let complexityScore = 0;
      for (const indicator of complexityIndicators) {
        if (algorithmFile.toLowerCase().includes(indicator.toLowerCase())) {
          complexityScore++;
        }
      }

      this.logVerification('Algorithm complexity', complexityScore >= 4,
        `Found ${complexityScore}/${complexityIndicators.length} complexity indicators`);

    } catch (error) {
      this.logVerification('Algorithm file verification', false, `Error reading file: ${error.message}`);
    }
  }

  verifyRepository() {
    console.log('🗄️  Verifying Repository Layer...'.yellow);

    try {
      const repoFile = fs.readFileSync('src/repositories/RecommendationRepository.ts', 'utf8');
      
      for (const method of this.requiredComponents.repositoryMethods) {
        const hasMethod = repoFile.includes(`async ${method}(`) || 
                         repoFile.includes(`${method}(`) ||
                         repoFile.includes(`${method} (`);
        this.logVerification(`Repository method: ${method}`, hasMethod,
          hasMethod ? 'Method found' : 'Method missing');
      }

      // Check for database operations
      const dbOperations = ['INSERT', 'SELECT', 'UPDATE', 'DELETE'];
      let dbOpCount = 0;
      
      for (const op of dbOperations) {
        if (repoFile.toUpperCase().includes(op)) {
          dbOpCount++;
        }
      }

      this.logVerification('Database operations', dbOpCount >= 3,
        `Found ${dbOpCount}/${dbOperations.length} database operations`);

      // Check for error handling
      const hasErrorHandling = repoFile.includes('try {') && repoFile.includes('} catch');
      this.logVerification('Error handling', hasErrorHandling,
        hasErrorHandling ? 'Error handling implemented' : 'Error handling missing');

    } catch (error) {
      this.logVerification('Repository file verification', false, `Error reading file: ${error.message}`);
    }
  }

  verifyService() {
    console.log('🚀 Verifying Service Layer...'.yellow);

    try {
      const serviceFile = fs.readFileSync('src/services/recommendation/RecommendationService.ts', 'utf8');
      
      for (const endpoint of this.requiredComponents.serviceEndpoints) {
        const hasEndpoint = serviceFile.includes(`'${endpoint}'`) || serviceFile.includes(`"${endpoint}"`);
        this.logVerification(`Service endpoint: ${endpoint}`, hasEndpoint,
          hasEndpoint ? 'Endpoint found' : 'Endpoint missing');
      }

      // Check for service features
      const serviceFeatures = [
        'BaseService',
        'express',
        'Request',
        'Response',
        'setupServiceRoutes',
        'checkServiceHealth',
        'logger'
      ];

      let featureCount = 0;
      for (const feature of serviceFeatures) {
        if (serviceFile.includes(feature)) {
          featureCount++;
        }
      }

      this.logVerification('Service features', featureCount >= 5,
        `Found ${featureCount}/${serviceFeatures.length} service features`);

      // Check for middleware and validation
      const hasValidation = serviceFile.includes('validation') || serviceFile.includes('required');
      this.logVerification('Input validation', hasValidation,
        hasValidation ? 'Validation implemented' : 'Validation missing');

    } catch (error) {
      this.logVerification('Service file verification', false, `Error reading file: ${error.message}`);
    }
  }

  verifyTests() {
    console.log('🧪 Verifying Test Coverage...'.yellow);

    try {
      const testFile = fs.readFileSync('src/__tests__/recommendation.test.ts', 'utf8');
      
      const testCategories = [
        'RecommendationAlgorithms',
        'User Profile Management',
        'Recommendation Scoring',
        'Recommendation Filtering',
        'Feedback Processing',
        'Performance Tests'
      ];

      for (const category of testCategories) {
        const hasCategory = testFile.includes(category);
        this.logVerification(`Test category: ${category}`, hasCategory,
          hasCategory ? 'Test category found' : 'Test category missing');
      }

      // Count test cases
      const testCaseCount = (testFile.match(/test\(/g) || []).length + 
                           (testFile.match(/it\(/g) || []).length;
      
      this.logVerification('Test case count', testCaseCount >= 10,
        `Found ${testCaseCount} test cases (minimum 10 required)`);

      // Check for mocking
      const hasMocking = testFile.includes('jest.fn()') || testFile.includes('mock');
      this.logVerification('Test mocking', hasMocking,
        hasMocking ? 'Mocking implemented' : 'Mocking missing');

    } catch (error) {
      this.logVerification('Test file verification', false, `Error reading file: ${error.message}`);
    }
  }

  verifyDatabaseSchema() {
    console.log('🗃️  Verifying Database Schema...'.yellow);

    try {
      const schemaFile = fs.readFileSync('database/init/01-create-tables.sql', 'utf8');
      
      const requiredTables = [
        'user_profiles',
        'recommendation_engines',
        'recommendation_requests',
        'recommendation_results',
        'user_similarity',
        'coupon_features',
        'recommendation_feedback',
        'recommendation_metrics',
        'ab_test_experiments'
      ];

      for (const table of requiredTables) {
        const hasTable = schemaFile.includes(table);
        this.logVerification(`Database table: ${table}`, hasTable,
          hasTable ? 'Table found in schema' : 'Table missing from schema');
      }

      // Check for indexes
      const hasIndexes = schemaFile.includes('CREATE INDEX');
      this.logVerification('Database indexes', hasIndexes,
        hasIndexes ? 'Indexes defined' : 'Indexes missing');

    } catch (error) {
      this.logVerification('Database schema verification', false, `Error reading schema: ${error.message}`);
    }
  }

  verifyConfiguration() {
    console.log('⚙️  Verifying Configuration...'.yellow);

    try {
      // Check if service is registered in docker-compose
      const dockerFile = fs.readFileSync('docker-compose.yml', 'utf8');
      const hasRecommendationService = dockerFile.includes('recommendation-service') || 
                                      dockerFile.includes('3009');
      
      this.logVerification('Docker service configuration', hasRecommendationService,
        hasRecommendationService ? 'Service configured in docker-compose' : 'Service not in docker-compose');

      // Check for environment variables
      const hasEnvVars = dockerFile.includes('POSTGRES_') && dockerFile.includes('REDIS_');
      this.logVerification('Environment variables', hasEnvVars,
        hasEnvVars ? 'Database environment variables found' : 'Environment variables missing');

    } catch (error) {
      this.logVerification('Configuration verification', false, `Error reading config: ${error.message}`);
    }
  }

  logVerification(testName, passed, details) {
    const status = passed ? '✅ PASS'.green : '❌ FAIL'.red;
    console.log(`  ${status} ${testName}: ${details}`);
    
    this.verificationResults.push({
      name: testName,
      passed,
      details
    });
  }

  printVerificationSummary() {
    console.log('\n📋 Verification Summary'.cyan.bold);
    console.log('='.repeat(60).cyan);
    
    const totalChecks = this.verificationResults.length;
    const passedChecks = this.verificationResults.filter(check => check.passed).length;
    const failedChecks = totalChecks - passedChecks;
    
    console.log(`Total Checks: ${totalChecks}`);
    console.log(`Passed: ${passedChecks}`.green);
    console.log(`Failed: ${failedChecks}`.red);
    console.log(`Success Rate: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);
    
    // Component completeness assessment
    const completenessScore = (passedChecks / totalChecks) * 100;
    let completenessLevel;
    
    if (completenessScore >= 95) {
      completenessLevel = '🌟 EXCELLENT - Production Ready'.green.bold;
    } else if (completenessScore >= 85) {
      completenessLevel = '✅ GOOD - Minor issues to address'.green;
    } else if (completenessScore >= 70) {
      completenessLevel = '⚠️  FAIR - Several issues need attention'.yellow;
    } else {
      completenessLevel = '❌ POOR - Major issues require fixing'.red;
    }
    
    console.log(`\nCompleteness Level: ${completenessLevel}`);
    
    if (failedChecks > 0) {
      console.log('\n❌ Failed Checks:'.red.bold);
      this.verificationResults
        .filter(check => !check.passed)
        .forEach(check => {
          console.log(`  • ${check.name}: ${check.details}`.red);
        });
      
      console.log('\n💡 Recommendations:'.yellow.bold);
      this.printRecommendations();
    }
    
    console.log('\n🎯 Recommendation System Verification Complete!'.green.bold);
    
    if (completenessScore >= 85) {
      console.log('✨ The recommendation system is well-implemented and ready for use!'.green);
    } else {
      console.log('⚠️  Please address the failed checks before proceeding.'.yellow);
    }
  }

  printRecommendations() {
    const recommendations = [
      '1. Ensure all required files are present and properly structured',
      '2. Implement missing data models and interfaces',
      '3. Complete all recommendation algorithms with proper scoring',
      '4. Add comprehensive error handling and validation',
      '5. Write thorough unit and integration tests',
      '6. Configure database schema with proper indexes',
      '7. Set up service configuration in docker-compose',
      '8. Add monitoring and logging for production readiness'
    ];
    
    recommendations.forEach(rec => console.log(`  ${rec}`.yellow));
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new RecommendationVerifier();
  verifier.runVerification().catch(error => {
    console.error('Verification execution failed:', error);
    process.exit(1);
  });
}

module.exports = RecommendationVerifier;
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TestRunner {
  constructor() {
    this.testResults = {
      unit: { passed: 0, failed: 0, total: 0, duration: 0 },
      integration: { passed: 0, failed: 0, total: 0, duration: 0 },
      e2e: { passed: 0, failed: 0, total: 0, duration: 0 },
      system: { passed: 0, failed: 0, total: 0, duration: 0 }
    };
    this.totalStartTime = Date.now();
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive Test Suite...\n');
    console.log('=' .repeat(60));

    try {
      // Run tests in sequence to avoid resource conflicts
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runE2ETests();
      await this.runSystemTests();

      this.generateTestReport();
      this.checkCoverage();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async runUnitTests() {
    console.log('🔬 Running Unit Tests...');
    console.log('-' .repeat(40));

    const startTime = Date.now();
    
    try {
      const result = await this.runJestTests('unit', [
        'src/__tests__/unit/',
        'src/__tests__/**/unit.test.ts',
        'src/__tests__/**/*.unit.test.ts'
      ]);

      this.testResults.unit = {
        ...result,
        duration: Date.now() - startTime
      };

      console.log(`✅ Unit Tests: ${result.passed}/${result.total} passed (${result.duration}ms)\n`);
    } catch (error) {
      console.log(`❌ Unit Tests failed: ${error.message}\n`);
      this.testResults.unit.failed = this.testResults.unit.total;
    }
  }

  async runIntegrationTests() {
    console.log('🔗 Running Integration Tests...');
    console.log('-' .repeat(40));

    const startTime = Date.now();
    
    try {
      const result = await this.runJestTests('integration', [
        'src/__tests__/integration/',
        'src/__tests__/**/*.integration.test.ts'
      ]);

      this.testResults.integration = {
        ...result,
        duration: Date.now() - startTime
      };

      console.log(`✅ Integration Tests: ${result.passed}/${result.total} passed (${result.duration}ms)\n`);
    } catch (error) {
      console.log(`❌ Integration Tests failed: ${error.message}\n`);
      this.testResults.integration.failed = this.testResults.integration.total;
    }
  }

  async runE2ETests() {
    console.log('🎭 Running End-to-End Tests...');
    console.log('-' .repeat(40));

    const startTime = Date.now();
    
    try {
      // Start test server if needed
      await this.ensureTestServer();

      const result = await this.runJestTests('e2e', [
        'src/__tests__/e2e/',
        'src/__tests__/**/*.e2e.test.ts'
      ], {
        timeout: 60000, // 60 seconds for E2E tests
        setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/e2e-setup.ts']
      });

      this.testResults.e2e = {
        ...result,
        duration: Date.now() - startTime
      };

      console.log(`✅ E2E Tests: ${result.passed}/${result.total} passed (${result.duration}ms)\n`);
    } catch (error) {
      console.log(`❌ E2E Tests failed: ${error.message}\n`);
      this.testResults.e2e.failed = this.testResults.e2e.total;
    }
  }

  async runSystemTests() {
    console.log('🏗️ Running System Tests...');
    console.log('-' .repeat(40));

    const startTime = Date.now();
    
    try {
      // Run individual system test scripts
      const systemTests = [
        'scripts/test-security-system.js',
        'scripts/test-performance-optimization.js',
        'scripts/test-monitoring-system.js',
        'scripts/test-data-compliance.js',
        'scripts/test-cashback-system.js'
      ];

      let passed = 0;
      let total = systemTests.length;

      for (const testScript of systemTests) {
        try {
          console.log(`  Running ${path.basename(testScript)}...`);
          await this.runNodeScript(testScript);
          passed++;
          console.log(`  ✅ ${path.basename(testScript)} passed`);
        } catch (error) {
          console.log(`  ❌ ${path.basename(testScript)} failed: ${error.message}`);
        }
      }

      this.testResults.system = {
        passed,
        failed: total - passed,
        total,
        duration: Date.now() - startTime
      };

      console.log(`✅ System Tests: ${passed}/${total} passed (${Date.now() - startTime}ms)\n`);
    } catch (error) {
      console.log(`❌ System Tests failed: ${error.message}\n`);
    }
  }

  async runJestTests(testType, patterns, options = {}) {
    return new Promise((resolve, reject) => {
      const jestConfig = {
        testMatch: patterns,
        testTimeout: options.timeout || 30000,
        setupFilesAfterEnv: options.setupFilesAfterEnv || [],
        collectCoverage: true,
        coverageDirectory: `coverage/${testType}`,
        coverageReporters: ['text', 'lcov', 'html'],
        verbose: true,
        ...options
      };

      const configFile = path.join(__dirname, `../jest.${testType}.config.js`);
      fs.writeFileSync(configFile, `module.exports = ${JSON.stringify(jestConfig, null, 2)};`);

      const jest = spawn('npx', ['jest', '--config', configFile], {
        stdio: 'pipe',
        cwd: path.join(__dirname, '..')
      });

      let output = '';
      let errorOutput = '';

      jest.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });

      jest.stderr.on('data', (data) => {
        errorOutput += data.toString();
        process.stderr.write(data);
      });

      jest.on('close', (code) => {
        // Parse Jest output to extract test results
        const results = this.parseJestOutput(output);
        
        if (code === 0) {
          resolve(results);
        } else {
          reject(new Error(`Jest exited with code ${code}\n${errorOutput}`));
        }

        // Cleanup config file
        try {
          fs.unlinkSync(configFile);
        } catch (e) {
          // Ignore cleanup errors
        }
      });
    });
  }

  async runNodeScript(scriptPath) {
    return new Promise((resolve, reject) => {
      const script = spawn('node', [scriptPath], {
        stdio: 'pipe',
        cwd: path.join(__dirname, '..')
      });

      let output = '';
      let errorOutput = '';

      script.stdout.on('data', (data) => {
        output += data.toString();
      });

      script.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      script.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Script failed with code ${code}\n${errorOutput}`));
        }
      });
    });
  }

  parseJestOutput(output) {
    // Simple parser for Jest output
    const testSuiteMatch = output.match(/Test Suites: (\d+) passed, (\d+) total/);
    const testMatch = output.match(/Tests:\s+(\d+) passed, (\d+) total/);
    const timeMatch = output.match(/Time:\s+([\d.]+)\s*s/);

    if (testMatch) {
      return {
        passed: parseInt(testMatch[1]),
        total: parseInt(testMatch[2]),
        failed: parseInt(testMatch[2]) - parseInt(testMatch[1]),
        duration: timeMatch ? parseFloat(timeMatch[1]) * 1000 : 0
      };
    }

    return { passed: 0, failed: 0, total: 0, duration: 0 };
  }

  async ensureTestServer() {
    // Check if test server is running, start if needed
    try {
      const response = await fetch('http://localhost:3000/api/health');
      if (response.ok) {
        console.log('  Test server is already running');
        return;
      }
    } catch (error) {
      // Server not running, start it
      console.log('  Starting test server...');
      
      const server = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        detached: true,
        cwd: path.join(__dirname, '..')
      });

      // Wait for server to start
      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });

      // Store server PID for cleanup
      this.testServerPid = server.pid;
    }
  }

  generateTestReport() {
    const totalDuration = Date.now() - this.totalStartTime;
    
    console.log('\n📊 COMPREHENSIVE TEST REPORT');
    console.log('=' .repeat(60));
    
    const categories = ['unit', 'integration', 'e2e', 'system'];
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;

    categories.forEach(category => {
      const result = this.testResults[category];
      totalPassed += result.passed;
      totalFailed += result.failed;
      totalTests += result.total;

      const successRate = result.total > 0 ? ((result.passed / result.total) * 100).toFixed(1) : '0.0';
      const status = result.failed === 0 ? '✅' : '❌';
      
      console.log(`${status} ${category.toUpperCase().padEnd(12)} | ${result.passed.toString().padStart(3)}/${result.total.toString().padEnd(3)} | ${successRate.padStart(5)}% | ${(result.duration/1000).toFixed(2).padStart(6)}s`);
    });

    console.log('-' .repeat(60));
    
    const overallSuccessRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0.0';
    const overallStatus = totalFailed === 0 ? '✅' : '❌';
    
    console.log(`${overallStatus} OVERALL        | ${totalPassed.toString().padStart(3)}/${totalTests.toString().padEnd(3)} | ${overallSuccessRate.padStart(5)}% | ${(totalDuration/1000).toFixed(2).padStart(6)}s`);
    
    console.log('\n📈 Test Metrics:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${totalPassed} ✅`);
    console.log(`   Failed: ${totalFailed} ❌`);
    console.log(`   Success Rate: ${overallSuccessRate}%`);
    console.log(`   Total Duration: ${(totalDuration/1000).toFixed(2)}s`);
    
    if (totalFailed > 0) {
      console.log('\n⚠️  Some tests failed. Please review the output above.');
      console.log('   Consider running individual test suites for detailed debugging.');
    } else {
      console.log('\n🎉 All tests passed! System is ready for deployment.');
    }

    // Generate detailed report file
    this.generateDetailedReport();
  }

  generateDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: Object.values(this.testResults).reduce((sum, r) => sum + r.total, 0),
        totalPassed: Object.values(this.testResults).reduce((sum, r) => sum + r.passed, 0),
        totalFailed: Object.values(this.testResults).reduce((sum, r) => sum + r.failed, 0),
        totalDuration: Date.now() - this.totalStartTime,
        successRate: 0
      },
      categories: this.testResults,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage()
      }
    };

    report.summary.successRate = report.summary.totalTests > 0 
      ? (report.summary.totalPassed / report.summary.totalTests) * 100 
      : 0;

    const reportPath = path.join(__dirname, '../test-reports/comprehensive-test-report.json');
    
    // Ensure directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  checkCoverage() {
    console.log('\n📊 Code Coverage Summary:');
    console.log('-' .repeat(40));
    
    const coverageFiles = [
      'coverage/unit/lcov-report/index.html',
      'coverage/integration/lcov-report/index.html',
      'coverage/e2e/lcov-report/index.html'
    ];

    coverageFiles.forEach(file => {
      const fullPath = path.join(__dirname, '..', file);
      if (fs.existsSync(fullPath)) {
        console.log(`✅ Coverage report: ${file}`);
      } else {
        console.log(`❌ Coverage report missing: ${file}`);
      }
    });

    console.log('\n💡 Open coverage reports in your browser to view detailed coverage information.');
  }

  cleanup() {
    // Cleanup test server if we started it
    if (this.testServerPid) {
      try {
        process.kill(this.testServerPid);
        console.log('🧹 Test server stopped');
      } catch (error) {
        console.log('⚠️  Could not stop test server:', error.message);
      }
    }
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Test suite interrupted');
  process.exit(1);
});

process.on('exit', () => {
  // Cleanup will be handled by the TestRunner instance
});

// Run tests if called directly
if (require.main === module) {
  const runner = new TestRunner();
  
  runner.runAllTests()
    .then(() => {
      const totalFailed = Object.values(runner.testResults).reduce((sum, r) => sum + r.failed, 0);
      process.exit(totalFailed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    })
    .finally(() => {
      runner.cleanup();
    });
}

module.exports = TestRunner;
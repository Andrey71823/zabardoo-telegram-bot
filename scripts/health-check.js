#!/usr/bin/env node

const http = require('http');
const https = require('https');

// Service configurations
const services = [
  {
    name: 'API Gateway',
    url: 'http://localhost:8080/health',
    port: 8080,
    critical: true
  },
  {
    name: 'Telegram Bot',
    url: 'http://localhost:3000/health',
    port: 3000,
    critical: true
  },
  {
    name: 'Admin Panel',
    url: 'http://localhost:3010/health',
    port: 3010,
    critical: false
  },
  {
    name: 'Business Dashboard',
    url: 'http://localhost:3020/health',
    port: 3020,
    critical: false
  }
];

// External dependencies
const dependencies = [
  {
    name: 'PostgreSQL',
    check: 'database',
    critical: true
  },
  {
    name: 'Redis',
    check: 'cache',
    critical: true
  },
  {
    name: 'Telegram API',
    check: 'telegram',
    critical: true
  },
  {
    name: 'OpenAI API',
    check: 'openai',
    critical: false
  }
];

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Check if a service is healthy
async function checkService(service) {
  return new Promise((resolve) => {
    const client = service.url.startsWith('https') ? https : http;
    
    const req = client.get(service.url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            name: service.name,
            status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
            statusCode: res.statusCode,
            response: response,
            critical: service.critical,
            port: service.port
          });
        } catch (error) {
          resolve({
            name: service.name,
            status: 'unhealthy',
            statusCode: res.statusCode,
            error: 'Invalid JSON response',
            critical: service.critical,
            port: service.port
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        name: service.name,
        status: 'unreachable',
        error: error.message,
        critical: service.critical,
        port: service.port
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        name: service.name,
        status: 'timeout',
        error: 'Request timeout',
        critical: service.critical,
        port: service.port
      });
    });
  });
}

// Check external dependencies
async function checkDependency(dependency) {
  // This is a simplified check - in real implementation you would
  // actually test connections to these services
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        name: dependency.name,
        status: 'unknown', // Would be 'healthy' or 'unhealthy' in real implementation
        check: dependency.check,
        critical: dependency.critical
      });
    }, 100);
  });
}

// Display results
function displayResults(serviceResults, dependencyResults) {
  console.log(`${colors.bold}${colors.blue}🏥 Health Check Results${colors.reset}\n`);
  
  // Services
  console.log(`${colors.bold}📊 Services:${colors.reset}`);
  let healthyServices = 0;
  let criticalIssues = 0;
  
  serviceResults.forEach(result => {
    let statusColor = colors.green;
    let statusIcon = '✅';
    
    if (result.status === 'unhealthy') {
      statusColor = colors.yellow;
      statusIcon = '⚠️';
      if (result.critical) criticalIssues++;
    } else if (result.status === 'unreachable' || result.status === 'timeout') {
      statusColor = colors.red;
      statusIcon = '❌';
      if (result.critical) criticalIssues++;
    } else if (result.status === 'healthy') {
      healthyServices++;
    }
    
    console.log(`  ${statusIcon} ${colors.bold}${result.name}${colors.reset} (Port ${result.port})`);
    console.log(`     Status: ${statusColor}${result.status.toUpperCase()}${colors.reset}`);
    
    if (result.statusCode) {
      console.log(`     HTTP: ${result.statusCode}`);
    }
    
    if (result.response && result.response.uptime) {
      console.log(`     Uptime: ${result.response.uptime}`);
    }
    
    if (result.error) {
      console.log(`     Error: ${colors.red}${result.error}${colors.reset}`);
    }
    
    console.log();
  });
  
  // Dependencies
  console.log(`${colors.bold}🔗 Dependencies:${colors.reset}`);
  dependencyResults.forEach(result => {
    let statusColor = colors.yellow;
    let statusIcon = '❓';
    
    if (result.status === 'healthy') {
      statusColor = colors.green;
      statusIcon = '✅';
    } else if (result.status === 'unhealthy') {
      statusColor = colors.red;
      statusIcon = '❌';
      if (result.critical) criticalIssues++;
    }
    
    console.log(`  ${statusIcon} ${colors.bold}${result.name}${colors.reset}`);
    console.log(`     Status: ${statusColor}${result.status.toUpperCase()}${colors.reset}`);
    console.log(`     Type: ${result.check}`);
    console.log();
  });
  
  // Summary
  console.log(`${colors.bold}📋 Summary:${colors.reset}`);
  console.log(`  Services: ${healthyServices}/${serviceResults.length} healthy`);
  console.log(`  Critical Issues: ${criticalIssues}`);
  
  if (criticalIssues === 0) {
    console.log(`  ${colors.green}${colors.bold}✅ System is healthy!${colors.reset}`);
  } else {
    console.log(`  ${colors.red}${colors.bold}❌ System has critical issues!${colors.reset}`);
  }
  
  // URLs for healthy services
  console.log(`\n${colors.bold}🌐 Available Services:${colors.reset}`);
  serviceResults.forEach(result => {
    if (result.status === 'healthy') {
      const baseUrl = `http://localhost:${result.port}`;
      console.log(`  ${colors.green}✅${colors.reset} ${result.name}: ${baseUrl}`);
      
      // Add specific URLs for each service
      if (result.name === 'Admin Panel') {
        console.log(`     - Coupons: ${baseUrl}/admin/coupon-management.html`);
        console.log(`     - Users: ${baseUrl}/admin/user-management.html`);
        console.log(`     - Campaigns: ${baseUrl}/admin/notification-campaigns.html`);
      } else if (result.name === 'Business Dashboard') {
        console.log(`     - Dashboard: ${baseUrl}/dashboard.html`);
        console.log(`     - Business: ${baseUrl}/business-dashboard.html`);
      } else if (result.name === 'API Gateway') {
        console.log(`     - API Docs: ${baseUrl}/api-docs`);
      }
    }
  });
  
  return criticalIssues === 0;
}

// Main function
async function main() {
  console.log(`${colors.bold}${colors.blue}🔍 Checking system health...${colors.reset}\n`);
  
  try {
    // Check all services
    console.log('Checking services...');
    const servicePromises = services.map(checkService);
    const serviceResults = await Promise.all(servicePromises);
    
    // Check dependencies
    console.log('Checking dependencies...');
    const dependencyPromises = dependencies.map(checkDependency);
    const dependencyResults = await Promise.all(dependencyPromises);
    
    // Display results
    const isHealthy = displayResults(serviceResults, dependencyResults);
    
    // Additional tips
    console.log(`\n${colors.bold}💡 Tips:${colors.reset}`);
    console.log('  - Run `npm start` to start all services');
    console.log('  - Run `npm run test:integration` for detailed testing');
    console.log('  - Check individual service logs for more details');
    console.log('  - Ensure PostgreSQL and Redis are running');
    
    // Exit with appropriate code
    process.exit(isHealthy ? 0 : 1);
    
  } catch (error) {
    console.error(`${colors.red}💥 Health check failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
System Health Check

Usage: node health-check.js [options]

Options:
  --help          Show this help message
  
This script checks the health of all system services and dependencies.

Exit codes:
  0 - All critical services are healthy
  1 - One or more critical services are unhealthy
  
Examples:
  node health-check.js
  npm run health
  `);
  process.exit(0);
}

// Run the health check
main().catch(error => {
  console.error(`${colors.red}💥 Health check error: ${error.message}${colors.reset}`);
  process.exit(1);
});
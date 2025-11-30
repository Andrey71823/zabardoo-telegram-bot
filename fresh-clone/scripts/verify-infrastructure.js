#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying bazaarGuru Telegram Bot Infrastructure...\n');

// Check if all required files exist
const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'docker-compose.yml',
  'Dockerfile.gateway',
  'Dockerfile.service',
  '.env.example',
  'src/config/database.ts',
  'src/config/logger.ts',
  'src/config/monitoring.ts',
  'src/config/index.ts',
  'src/gateway/index.ts',
  'src/services/base/BaseService.ts',
  'src/services/channel-manager/ChannelManagerService.ts',
  'database/init/01-create-tables.sql',
  'database/init/02-seed-data.sql',
  'monitoring/prometheus.yml',
  'src/__tests__/infrastructure.test.ts',
  'jest.config.js',
];

let allFilesExist = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('\n📦 Checking package.json dependencies:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = [
  'express',
  'pg',
  'redis',
  'winston',
  'prom-client',
  'cors',
  'helmet',
  'compression',
  'express-rate-limit',
  'http-proxy-middleware',
  'dotenv',
];

requiredDeps.forEach(dep => {
  const exists = packageJson.dependencies[dep] || packageJson.devDependencies[dep];
  console.log(`  ${exists ? '✅' : '❌'} ${dep}`);
  if (!exists) allFilesExist = false;
});

console.log('\n🏗️ Checking TypeScript compilation:');
try {
  const { execSync } = require('child_process');
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('  ✅ TypeScript compilation successful');
} catch (error) {
  console.log('  ❌ TypeScript compilation failed');
  console.log('  Error:', error.message);
  allFilesExist = false;
}

console.log('\n🧪 Checking test configuration:');
const jestConfigExists = fs.existsSync('jest.config.js');
const testSetupExists = fs.existsSync('src/__tests__/setup.ts');
console.log(`  ${jestConfigExists ? '✅' : '❌'} Jest configuration`);
console.log(`  ${testSetupExists ? '✅' : '❌'} Test setup file`);

console.log('\n🐳 Checking Docker configuration:');
const dockerComposeExists = fs.existsSync('docker-compose.yml');
const gatewayDockerfileExists = fs.existsSync('Dockerfile.gateway');
const serviceDockerfileExists = fs.existsSync('Dockerfile.service');
console.log(`  ${dockerComposeExists ? '✅' : '❌'} Docker Compose configuration`);
console.log(`  ${gatewayDockerfileExists ? '✅' : '❌'} Gateway Dockerfile`);
console.log(`  ${serviceDockerfileExists ? '✅' : '❌'} Service Dockerfile`);

console.log('\n📊 Checking monitoring setup:');
const prometheusConfigExists = fs.existsSync('monitoring/prometheus.yml');
console.log(`  ${prometheusConfigExists ? '✅' : '❌'} Prometheus configuration`);

console.log('\n🗄️ Checking database setup:');
const dbInitExists = fs.existsSync('database/init/01-create-tables.sql');
const dbSeedExists = fs.existsSync('database/init/02-seed-data.sql');
console.log(`  ${dbInitExists ? '✅' : '❌'} Database schema`);
console.log(`  ${dbSeedExists ? '✅' : '❌'} Database seed data`);

console.log('\n📋 Infrastructure Verification Summary:');
if (allFilesExist) {
  console.log('🎉 All infrastructure components are properly set up!');
  console.log('\n✨ Ready for next steps:');
  console.log('  1. Configure environment variables in .env');
  console.log('  2. Start services with: npm run docker:up');
  console.log('  3. Run tests with: npm test');
  console.log('  4. Start development with: npm run dev');
  process.exit(0);
} else {
  console.log('❌ Some infrastructure components are missing or misconfigured.');
  console.log('Please review the errors above and fix them before proceeding.');
  process.exit(1);
}
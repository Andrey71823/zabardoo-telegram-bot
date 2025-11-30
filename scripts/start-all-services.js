#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting bazaarGuru Telegram Bot System...\n');

// Service configurations
const services = [
  {
    name: 'API Gateway',
    script: 'src/gateway/index.js',
    port: process.env.GATEWAY_PORT || 8081,
    color: '\x1b[36m', // Cyan
    env: { GATEWAY_PORT: process.env.GATEWAY_PORT || '8081' }
  },
  {
    name: 'Telegram Bot',
    script: 'src/services/telegram/TelegramBotService.js',
    port: process.env.BOT_PORT || 3000,
    color: '\x1b[32m', // Green
    env: { BOT_PORT: process.env.BOT_PORT || '3000' }
  },
  {
    name: 'Admin Panel',
    script: 'src/servers/adminServer.js',
    port: process.env.ADMIN_PORT || 3010,
    color: '\x1b[33m', // Yellow
    env: { ADMIN_PORT: process.env.ADMIN_PORT || '3010' }
  },
  {
    name: 'Business Dashboard',
    script: 'src/servers/dashboardServer.js',
    port: process.env.DASHBOARD_PORT || 3020,
    color: '\x1b[35m', // Magenta
    env: { DASHBOARD_PORT: process.env.DASHBOARD_PORT || '3020' }
  }
];

const processes = [];
const startTime = Date.now();

// Check if required files exist
function checkRequiredFiles() {
  console.log('🔍 Checking required files...');
  
  const requiredFiles = [
    'package.json',
    'src/config/database.js',
    'src/config/logger.js',
    '.env'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    console.error('\nPlease ensure all required files are present.');
    process.exit(1);
  }
  
  console.log('✅ All required files found\n');
}

// Check if ports are available
async function checkPorts() {
  console.log('🔍 Checking port availability...');
  
  const net = require('net');
  
  for (const service of services) {
    try {
      await new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(service.port, () => {
          server.close(resolve);
        });
        server.on('error', reject);
      });
      console.log(`✅ Port ${service.port} is available for ${service.name}`);
    } catch (error) {
      console.error(`❌ Port ${service.port} is already in use (needed for ${service.name})`);
      console.error('   Please stop the process using this port or change the configuration.');
      process.exit(1);
    }
  }
  
  console.log('✅ All ports are available\n');
}

// Start a service
function startService(service) {
  console.log(`${service.color}🚀 Starting ${service.name}...${'\x1b[0m'}`);
  
  const env = { ...process.env, ...service.env };
  
  const child = spawn('node', [service.script], {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: path.resolve(__dirname, '..')
  });
  
  // Handle stdout
  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.log(`${service.color}[${service.name}]${'\x1b[0m'} ${line}`);
    });
  });
  
  // Handle stderr
  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.error(`${service.color}[${service.name}]${'\x1b[0m'} ${'\x1b[31m'}ERROR:${'\x1b[0m'} ${line}`);
    });
  });
  
  // Handle process exit
  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`${service.color}[${service.name}]${'\x1b[0m'} ${'\x1b[31m'}Process exited with code ${code}${'\x1b[0m'}`);
    } else {
      console.log(`${service.color}[${service.name}]${'\x1b[0m'} ${'\x1b[32m'}Process exited normally${'\x1b[0m'}`);
    }
    
    // Remove from processes array
    const index = processes.indexOf(child);
    if (index > -1) {
      processes.splice(index, 1);
    }
    
    // If all processes have exited, exit main process
    if (processes.length === 0) {
      console.log('\n🛑 All services have stopped');
      process.exit(code);
    }
  });
  
  // Handle process errors
  child.on('error', (error) => {
    console.error(`${service.color}[${service.name}]${'\x1b[0m'} ${'\x1b[31m'}Failed to start: ${error.message}${'\x1b[0m'}`);
  });
  
  processes.push(child);
  return child;
}

// Wait for services to be ready
async function waitForServices() {
  console.log('⏳ Waiting for services to be ready...\n');
  
  const http = require('http');
  const maxRetries = 30;
  const retryDelay = 2000;
  
  for (const service of services) {
    let retries = 0;
    let ready = false;
    
    while (retries < maxRetries && !ready) {
      try {
        await new Promise((resolve, reject) => {
          const req = http.get(`http://localhost:${service.port}/health`, (res) => {
            if (res.statusCode === 200) {
              resolve();
            } else {
              reject(new Error(`HTTP ${res.statusCode}`));
            }
          });
          
          req.on('error', reject);
          req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Timeout'));
          });
        });
        
        ready = true;
        console.log(`${service.color}✅ ${service.name} is ready${'\x1b[0m'}`);
      } catch (error) {
        retries++;
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    if (!ready) {
      console.error(`${service.color}❌ ${service.name} failed to start after ${maxRetries} retries${'\x1b[0m'}`);
    }
  }
}

// Display service URLs
function displayServiceUrls() {
  const uptime = Math.round((Date.now() - startTime) / 1000);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 All services are running!');
  console.log(`⏱️  Startup time: ${uptime} seconds`);
  console.log('='.repeat(60));
  
  console.log('\n📱 Telegram Bot:');
  console.log('   Find your bot in Telegram and send /start');
  console.log('   Health check: http://localhost:3000/health');
  
  console.log('\n🔧 Admin Panel:');
  console.log('   Main: http://localhost:3010');
  console.log('   Coupons: http://localhost:3010/admin/coupon-management.html');
  console.log('   Users: http://localhost:3010/admin/user-management.html');
  console.log('   Campaigns: http://localhost:3010/admin/notification-campaigns.html');
  
  console.log('\n📊 Business Dashboard:');
  console.log('   Main: http://localhost:3020');
  console.log('   Dashboard: http://localhost:3020/dashboard.html');
  console.log('   Business: http://localhost:3020/business-dashboard.html');
  
  console.log('\n🌐 API Gateway:');
  console.log('   Main: http://localhost:8080');
  console.log('   Health: http://localhost:8080/health');
  console.log('   Docs: http://localhost:8080/api-docs');
  
  console.log('\n' + '='.repeat(60));
  console.log('💡 Tips:');
  console.log('   - Press Ctrl+C to stop all services');
  console.log('   - Check logs above for any errors');
  console.log('   - Run health checks to verify everything works');
  console.log('='.repeat(60) + '\n');
}

// Handle graceful shutdown
function setupGracefulShutdown() {
  const shutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    
    processes.forEach((child, index) => {
      const service = services[index];
      console.log(`${service.color}🛑 Stopping ${service.name}...${'\x1b[0m'}`);
      child.kill('SIGTERM');
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('\n⚠️  Force killing remaining processes...');
      processes.forEach(child => child.kill('SIGKILL'));
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Main function
async function main() {
  try {
    // Pre-flight checks
    checkRequiredFiles();
    await checkPorts();
    
    // Setup graceful shutdown
    setupGracefulShutdown();
    
    // Start all services
    console.log('🚀 Starting all services...\n');
    services.forEach(startService);
    
    // Wait for services to be ready
    await waitForServices();
    
    // Display URLs and info
    displayServiceUrls();
    
    // Keep the process running
    console.log('🔄 Services are running. Press Ctrl+C to stop.\n');
    
  } catch (error) {
    console.error('💥 Failed to start services:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
bazaarGuru Telegram Bot System Launcher

Usage: node start-all-services.js [options]

Options:
  --help          Show this help message
  
Environment Variables:
  BOT_PORT        Telegram bot port (default: 3000)
  ADMIN_PORT      Admin panel port (default: 3010)
  DASHBOARD_PORT  Dashboard port (default: 3020)
  GATEWAY_PORT    API gateway port (default: 8080)
  
Examples:
  node start-all-services.js
  BOT_PORT=3001 node start-all-services.js
  `);
  process.exit(0);
}

// Run the main function
main().catch(error => {
  console.error('💥 Startup failed:', error);
  process.exit(1);
});
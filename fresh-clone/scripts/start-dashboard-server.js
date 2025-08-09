#!/usr/bin/env node

// Simple Dashboard Server for Zabardoo Admin Panels
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

class DashboardServer {
  constructor(port = 3000) {
    this.port = port;
    this.publicDir = path.join(__dirname, '..', 'public');
  }

  start() {
    const server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    server.listen(this.port, () => {
      console.log('\n🚀 ZABARDOO DASHBOARD SERVER STARTED!');
      console.log('=' .repeat(50));
      console.log(`📊 Server running at: http://localhost:${this.port}`);
      console.log('\n🎯 UNIFIED ADMIN DASHBOARD:');
      console.log(`🚀 Main Dashboard: http://localhost:${this.port}`);
      console.log('\n📋 All dashboards are now accessible through the unified interface!');
      console.log('\n✨ Features:');
      console.log('   • 🤖 GPT Chat Management');
      console.log('   • ⭐ Favorites Management');
      console.log('   • 📱 Telegram WebApp');
      console.log('   • 📊 Business Dashboard');
      console.log('   • 📈 System Monitoring');
      console.log('   • 🎫 Coupon Management');
      console.log('   • 👥 User Management');
      console.log('   • 📢 Notification Campaigns');
      console.log('   • 🛡️ Data Compliance');
      console.log('\n💡 Press Ctrl+C to stop the server');
      console.log('=' .repeat(50));
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Shutting down dashboard server...');
      server.close(() => {
        console.log('✅ Dashboard server stopped successfully!');
        process.exit(0);
      });
    });
  }

  handleRequest(req, res) {
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;

    // Default route
    if (pathname === '/') {
      pathname = '/admin/unified-dashboard.html';
    }

    // Security: prevent directory traversal
    if (pathname.includes('..')) {
      this.send404(res);
      return;
    }

    const filePath = path.join(this.publicDir, pathname);

    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        // If HTML file not found, try to serve index page
        if (pathname === '/index.html') {
          this.serveIndexPage(res);
        } else {
          this.send404(res);
        }
        return;
      }

      // Serve the file
      this.serveFile(filePath, res);
    });
  }

  serveFile(filePath, res) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = this.getContentType(ext);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        this.send500(res, err);
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      res.end(data);
    });
  }

  serveIndexPage(res) {
    const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zabardoo Admin Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            background: #fafbfc;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #202124;
        }
        .dashboard-card {
            background: #ffffff;
            border-radius: 8px;
            padding: 24px;
            margin: 16px 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid #e8eaed;
            transition: box-shadow 0.15s ease;
        }
        .dashboard-card:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .dashboard-link {
            text-decoration: none;
            color: inherit;
        }
        .icon-large {
            font-size: 2.5rem;
            margin-bottom: 16px;
            color: #1a73e8;
        }
        .container {
            padding-top: 32px;
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: #202124;
            text-align: center;
            margin-bottom: 40px;
            font-weight: 400;
            font-size: 28px;
        }
        .status-badge {
            position: absolute;
            top: 12px;
            right: 12px;
            background: #34a853;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1><i class="fas fa-robot me-3"></i>Zabardoo Admin Dashboard</h1>
        
        <div class="row">
            <div class="col-md-4">
                <a href="/admin/gpt-chat-management-clean.html" class="dashboard-link">
                    <div class="dashboard-card position-relative">
                        <div class="status-badge">ACTIVE</div>
                        <div class="text-center">
                            <i class="fas fa-robot icon-large"></i>
                            <h4 style="font-size: 18px; font-weight: 500; margin-bottom: 8px;">GPT Chat Management</h4>
                            <p style="color: #5f6368; font-size: 14px; margin: 0;">Manage AI personalities, prompts, and chat analytics</p>
                        </div>
                    </div>
                </a>
            </div>
            
            <div class="col-md-4">
                <a href="/admin/favorites-management.html" class="dashboard-link">
                    <div class="dashboard-card position-relative">
                        <div class="status-badge">ACTIVE</div>
                        <div class="text-center">
                            <i class="fas fa-heart icon-large"></i>
                            <h4 style="font-size: 18px; font-weight: 500; margin-bottom: 8px;">Favorites Management</h4>
                            <p style="color: #5f6368; font-size: 14px; margin: 0;">User favorites, history, and recommendations</p>
                        </div>
                    </div>
                </a>
            </div>
            
            <div class="col-md-4">
                <a href="/telegram-webapp/index.html" class="dashboard-link">
                    <div class="dashboard-card position-relative">
                        <div class="status-badge">ACTIVE</div>
                        <div class="text-center">
                            <i class="fab fa-telegram icon-large"></i>
                            <h4 style="font-size: 18px; font-weight: 500; margin-bottom: 8px;">Telegram WebApp</h4>
                            <p style="color: #5f6368; font-size: 14px; margin: 0;">Full-featured web application for users</p>
                        </div>
                    </div>
                </a>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-4">
                <a href="/business-dashboard.html" class="dashboard-link">
                    <div class="dashboard-card position-relative">
                        <div class="status-badge">ACTIVE</div>
                        <div class="text-center">
                            <i class="fas fa-chart-line icon-large"></i>
                            <h4>Business Dashboard</h4>
                            <p class="text-muted">Analytics, forecasting, and business metrics</p>
                        </div>
                    </div>
                </a>
            </div>
            
            <div class="col-md-4">
                <a href="/admin/coupon-management.html" class="dashboard-link">
                    <div class="dashboard-card position-relative">
                        <div class="status-badge">ACTIVE</div>
                        <div class="text-center">
                            <i class="fas fa-ticket-alt icon-large"></i>
                            <h4>Coupon Management</h4>
                            <p class="text-muted">Create, edit, and manage coupon campaigns</p>
                        </div>
                    </div>
                </a>
            </div>
            
            <div class="col-md-4">
                <a href="/admin/user-management.html" class="dashboard-link">
                    <div class="dashboard-card position-relative">
                        <div class="status-badge">ACTIVE</div>
                        <div class="text-center">
                            <i class="fas fa-users icon-large"></i>
                            <h4>User Management</h4>
                            <p class="text-muted">Manage users, permissions, and analytics</p>
                        </div>
                    </div>
                </a>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-4">
                <a href="/monitoring-dashboard.html" class="dashboard-link">
                    <div class="dashboard-card position-relative">
                        <div class="status-badge">ACTIVE</div>
                        <div class="text-center">
                            <i class="fas fa-tachometer-alt icon-large"></i>
                            <h4>System Monitoring</h4>
                            <p class="text-muted">Real-time system performance and health</p>
                        </div>
                    </div>
                </a>
            </div>
            
            <div class="col-md-4">
                <a href="/admin/data-compliance.html" class="dashboard-link">
                    <div class="dashboard-card position-relative">
                        <div class="status-badge">ACTIVE</div>
                        <div class="text-center">
                            <i class="fas fa-shield-alt icon-large"></i>
                            <h4>Data Compliance</h4>
                            <p class="text-muted">GDPR, PDPB compliance and data management</p>
                        </div>
                    </div>
                </a>
            </div>
            
            <div class="col-md-4">
                <a href="/admin/notification-campaigns.html" class="dashboard-link">
                    <div class="dashboard-card position-relative">
                        <div class="status-badge">ACTIVE</div>
                        <div class="text-center">
                            <i class="fas fa-bell icon-large"></i>
                            <h4>Notification Campaigns</h4>
                            <p class="text-muted">Push notifications and user engagement</p>
                        </div>
                    </div>
                </a>
            </div>
        </div>
        
        <div class="text-center mt-5">
            <div class="dashboard-card">
                <h5><i class="fas fa-info-circle me-2"></i>System Status</h5>
                <div class="row text-center mt-4">
                    <div class="col-md-3">
                        <i class="fas fa-server fa-2x text-success mb-2"></i>
                        <p><strong>Server</strong><br><span class="text-success">Online</span></p>
                    </div>
                    <div class="col-md-3">
                        <i class="fas fa-database fa-2x text-success mb-2"></i>
                        <p><strong>Database</strong><br><span class="text-success">Connected</span></p>
                    </div>
                    <div class="col-md-3">
                        <i class="fas fa-robot fa-2x text-success mb-2"></i>
                        <p><strong>AI Services</strong><br><span class="text-success">Active</span></p>
                    </div>
                    <div class="col-md-3">
                        <i class="fab fa-telegram fa-2x text-success mb-2"></i>
                        <p><strong>Telegram Bot</strong><br><span class="text-success">Running</span></p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(indexHtml);
  }

  getContentType(ext) {
    const types = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    };
    return types[ext] || 'text/plain';
  }

  send404(res) {
    const html404 = `
<!DOCTYPE html>
<html>
<head>
    <title>404 - Page Not Found</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #e74c3c; }
        a { color: #3498db; text-decoration: none; }
    </style>
</head>
<body>
    <h1>404 - Page Not Found</h1>
    <p>The requested page could not be found.</p>
    <a href="/">← Back to Dashboard</a>
</body>
</html>`;

    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(html404);
  }

  send500(res, error) {
    const html500 = `
<!DOCTYPE html>
<html>
<head>
    <title>500 - Server Error</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #e74c3c; }
        a { color: #3498db; text-decoration: none; }
    </style>
</head>
<body>
    <h1>500 - Server Error</h1>
    <p>An internal server error occurred.</p>
    <a href="/">← Back to Dashboard</a>
</body>
</html>`;

    console.error('Server Error:', error);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(html500);
  }
}

// Start the server
if (require.main === module) {
  const port = process.argv[2] || 3000;
  const server = new DashboardServer(port);
  server.start();
}

module.exports = DashboardServer;
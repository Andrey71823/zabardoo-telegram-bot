const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
require('dotenv').config();
const PORT = process.env.GATEWAY_PORT || 8081;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      bot: `http://localhost:${process.env.BOT_PORT || 3000}`,
      admin: `http://localhost:${process.env.ADMIN_PORT || 3010}`,
      dashboard: `http://localhost:${process.env.DASHBOARD_PORT || 3020}`
    }
  });
});

// API Documentation
app.get('/api-docs', (req, res) => {
  res.json({
    title: 'Zabardoo Telegram Bot API',
    version: '1.0.0',
    description: 'API Gateway for Zabardoo Telegram Bot System',
    services: {
      bot: {
        url: `http://localhost:${process.env.BOT_PORT || 3000}`,
        description: 'Telegram Bot Service',
        endpoints: [
          'GET /health - Health check',
          'POST /webhook - Telegram webhook'
        ]
      },
      admin: {
        url: `http://localhost:${process.env.ADMIN_PORT || 3010}`,
        description: 'Admin Panel Service',
        endpoints: [
          'GET /health - Health check',
          'GET /api/admin/coupons - Coupon management',
          'GET /api/admin/users - User management',
          'GET /api/admin/notification-campaigns - Campaign management'
        ]
      },
      dashboard: {
        url: `http://localhost:${process.env.DASHBOARD_PORT || 3020}`,
        description: 'Business Dashboard Service',
        endpoints: [
          'GET /health - Health check',
          'GET /api/dashboard/stats - Dashboard statistics',
          'GET /api/dashboard/analytics - Analytics data'
        ]
      }
    }
  });
});

// Proxy routes (if services are running)
const botPort = process.env.BOT_PORT || 3000;
const adminPort = process.env.ADMIN_PORT || 3010;
const dashboardPort = process.env.DASHBOARD_PORT || 3020;

// Bot service proxy
app.use('/api/bot', createProxyMiddleware({
  target: `http://localhost:${botPort}`,
  changeOrigin: true,
  pathRewrite: {
    '^/api/bot': '/api'
  },
  onError: (err, req, res) => {
    res.status(503).json({
      error: 'Bot service unavailable',
      message: 'The Telegram bot service is not running'
    });
  }
}));

// Admin service proxy
app.use('/api/admin', createProxyMiddleware({
  target: `http://localhost:${adminPort}`,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(503).json({
      error: 'Admin service unavailable',
      message: 'The admin panel service is not running'
    });
  }
}));

// Dashboard service proxy
app.use('/api/dashboard', createProxyMiddleware({
  target: `http://localhost:${dashboardPort}`,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(503).json({
      error: 'Dashboard service unavailable',
      message: 'The dashboard service is not running'
    });
  }
}));

// Direct service access (fallback)
app.get('/services', (req, res) => {
  res.json({
    message: 'Available services',
    services: [
      {
        name: 'Telegram Bot',
        url: `http://localhost:${botPort}`,
        health: `http://localhost:${botPort}/health`
      },
      {
        name: 'Admin Panel',
        url: `http://localhost:${adminPort}`,
        health: `http://localhost:${adminPort}/health`
      },
      {
        name: 'Business Dashboard',
        url: `http://localhost:${dashboardPort}`,
        health: `http://localhost:${dashboardPort}/health`
      }
    ]
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /health',
      'GET /api-docs',
      'GET /services',
      'GET /api/bot/*',
      'GET /api/admin/*',
      'GET /api/dashboard/*'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`API Gateway received ${signal}, shutting down gracefully`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`Services: http://localhost:${PORT}/services`);
});

module.exports = app;
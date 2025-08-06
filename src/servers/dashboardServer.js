const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const app = express();
require('dotenv').config();
const PORT = process.env.DASHBOARD_PORT || 3021;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for dashboard with inline scripts
}));
app.use(cors());
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files for dashboard
app.use('/dashboard', express.static(path.join(__dirname, '../../public')));
app.use('/public', express.static(path.join(__dirname, '../../public')));

// Dashboard routes
app.get('/', (req, res) => {
  res.redirect('/dashboard.html');
});

app.get('/dashboard', (req, res) => {
  res.redirect('/dashboard.html');
});

app.get('/business', (req, res) => {
  res.redirect('/business-dashboard.html');
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'dashboard-server',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mock API endpoints for demo
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: 1250,
      activeUsers: 890,
      totalRevenue: 45000,
      conversionRate: 12.5,
      topChannels: [
        { name: 'Electronics', users: 450, revenue: 18000 },
        { name: 'Fashion', users: 320, revenue: 12000 },
        { name: 'Home & Garden', users: 280, revenue: 8500 }
      ]
    }
  });
});

app.get('/api/dashboard/analytics', (req, res) => {
  res.json({
    success: true,
    data: {
      userGrowth: [
        { date: '2024-01-01', users: 100 },
        { date: '2024-01-02', users: 150 },
        { date: '2024-01-03', users: 200 },
        { date: '2024-01-04', users: 280 },
        { date: '2024-01-05', users: 350 }
      ],
      revenueGrowth: [
        { date: '2024-01-01', revenue: 1000 },
        { date: '2024-01-02', revenue: 1500 },
        { date: '2024-01-03', revenue: 2200 },
        { date: '2024-01-04', revenue: 3100 },
        { date: '2024-01-05', revenue: 4200 }
      ]
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Dashboard server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`Dashboard server received ${signal}, shutting down gracefully`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
app.listen(PORT, () => {
  console.log(`Dashboard Server running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`Business Dashboard: http://localhost:${PORT}/business-dashboard.html`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
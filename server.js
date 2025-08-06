const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Zabardoo Telegram Bot API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      webhook: '/webhook',
      admin: '/admin'
    }
  });
});

// Admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/unified-dashboard.html'));
});

// Webhook endpoint (placeholder)
app.post('/webhook', (req, res) => {
  console.log('Webhook received:', req.body);
  res.json({ status: 'ok' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Zabardoo Telegram Bot started on port ${port}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🌐 Health check: http://localhost:${port}/health`);
  console.log(`👨‍💼 Admin dashboard: http://localhost:${port}/admin`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM. Starting graceful shutdown...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT. Starting graceful shutdown...');
  process.exit(0);
});
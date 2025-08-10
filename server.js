const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 8080;

// Security & perf middleware (safe defaults)
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Helmet with relaxed CSP to allow our CDN resources
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", 'https:'],
      // allow inline event handlers (onclick) used by restored local UI
      "script-src-attr": ["'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", 'https:'],
      "img-src": ["'self'", 'data:', 'https:'],
      "font-src": ["'self'", 'https:', 'data:'],
      "connect-src": ["'self'", 'https:'],
      // explicitly allow same-origin iframes for unified-dashboard content
      "frame-src": ["'self'"],
      "frame-ancestors": ["'self'"],
      "object-src": ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS: allow same-origin by default, optionally allow via ENV
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:8080').split(',');
app.use(cors({ origin: allowedOrigins, credentials: false }));

// Rate limiting for APIs and webhook
const limiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false });
app.use(['/api', '/monitoring', '/webhook'], limiter);

app.use(compression());
app.use(express.json({ limit: '200kb' }));

// Static files with safe headers
app.use(express.static(path.join(__dirname, 'public'), {
  dotfiles: 'ignore',
  etag: false,
  maxAge: '1h',
  fallthrough: true,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
  }
}));

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
      admin: '/admin',
      dashboardMetrics: '/api/dashboard/metrics',
      dashboardInsights: '/api/dashboard/insights',
      dashboardRealtime: '/api/dashboard/realtime',
      dashboardExport: '/api/dashboard/export'
    }
  });
});

// Optional admin protection (basic auth or token) without breaking default
const needsAdminAuth = process.env.ADMIN_BASIC_AUTH === '1' || !!process.env.ADMIN_TOKEN;
function adminAuthMiddleware(req, res, next) {
  if (!needsAdminAuth) return next();
  const token = req.header('x-admin-token');
  if (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) return next();
  if (process.env.ADMIN_USER && process.env.ADMIN_PASS) {
    const b64 = (req.headers.authorization || '').replace(/^Basic\s+/i, '');
    if (b64) {
      const [u, p] = Buffer.from(b64, 'base64').toString().split(':');
      if (u === process.env.ADMIN_USER && p === process.env.ADMIN_PASS) return next();
    }
  }
  res.setHeader('WWW-Authenticate', 'Basic');
  return res.status(401).send('Unauthorized');
}

// Admin dashboard
app.get('/admin', adminAuthMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/unified-dashboard.html'));
});

// Webhook endpoint (placeholder)
app.post('/webhook', (req, res) => {
  console.log('Webhook received:', req.body);
  res.json({ status: 'ok' });
});

// ---------- Lightweight demo APIs for dashboards (mock data) ----------
function generateMockBusinessData() {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const m = new Date().getMonth();
  const monthlyRevenueTrend = Array.from({ length: 6 }, (_, i) => {
    const idx = (m - 5 + i + 12) % 12;
    return { month: months[idx], revenue: 150000 + i * 25000 + Math.floor(Math.random() * 20000) };
  });
  const revenueByChannel = [
    { channel: 'Telegram Group', revenue: 240000 },
    { channel: 'Personal Channels', revenue: 420000 },
    { channel: 'AI Recommendations', revenue: 190000 },
    { channel: 'Web App', revenue: 110000 }
  ];
  const conversionByFunnel = [
    { funnelName: 'View → Click', conversionRate: 0.42 },
    { funnelName: 'Click → Visit', conversionRate: 0.31 },
    { funnelName: 'Visit → Purchase', conversionRate: 0.12 }
  ];
  const channelPerformance = [
    { channel: 'Group', users: 12450, revenue: 320000, conversionRate: 0.14, roi: 2.3 },
    { channel: 'Personal', users: 18920, revenue: 520000, conversionRate: 0.19, roi: 3.1 },
    { channel: 'AI', users: 8650, revenue: 210000, conversionRate: 0.17, roi: 2.7 }
  ];
  const totalRevenue = revenueByChannel.reduce((s, x) => s + x.revenue, 0);
  return {
    overview: {
      totalUsers: 32450,
      activeUsers: 12840,
      totalRevenue,
      conversionRate: 0.184,
      averageOrderValue: 2450,
      totalCashback: 178000,
      growthRate: 12.6
    },
    revenue: { monthlyRevenueTrend, revenueByChannel },
    users: {},
    conversion: { conversionByFunnel },
    channels: { channelPerformance }
  };
}

app.get('/api/dashboard/metrics', (req, res) => {
  // For now return mock data; plug real data source later
  const data = generateMockBusinessData();
  res.json({ success: true, data });
});

app.get('/api/dashboard/insights', (req, res) => {
  const data = {
    alerts: [
      { type: 'warning', message: 'Spike in traffic from AI Recommendations. Check conversion quality.' },
      { type: 'info', message: 'New Flipkart campaign performing 18% above baseline.' }
    ],
    insights: [
      'Personal channels drive the highest ROI this week',
      'Users with 3+ favorites convert 2.4x better'
    ],
    recommendations: [
      'Increase push frequency for Electronics by 10% over the weekend',
      'Target Myntra seekers with fashion flash sale tonight'
    ]
  };
  res.json({ success: true, data });
});

app.get('/api/dashboard/realtime', (req, res) => {
  res.json({
    success: true,
    data: {
      activeUsers: 12000 + Math.floor(Math.random() * 500),
      rps: 65 + Math.floor(Math.random() * 12),
      queue: Math.floor(Math.random() * 5)
    }
  });
});

app.get('/api/dashboard/export', (req, res) => {
  const { format = 'json' } = req.query;
  const payload = { generatedAt: new Date().toISOString(), ...generateMockBusinessData() };
  if (format === 'csv') {
    // extremely simple CSV for demo
    const rows = [
      'metric,value',
      `total_users,${payload.overview.totalUsers}`,
      `active_users,${payload.overview.activeUsers}`,
      `total_revenue,${payload.overview.totalRevenue}`,
      `conversion_rate,${payload.overview.conversionRate}`
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="dashboard_export.csv"');
    return res.send(rows.join('\n'));
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="dashboard_export.json"');
  res.end(JSON.stringify(payload, null, 2));
});

// Monitoring endpoints used by monitoring-dashboard.html
function generateMockMonitoringStatus() {
  const now = Date.now();
  return {
    system: {
      platform: `node${process.versions.node}-${process.platform}-${process.arch}`,
      uptime: Math.floor(process.uptime()),
      cpu: { usage: 35 + Math.random() * 20, loadAverage: [0.42, 0.58, 0.61] },
      memory: { usage: 48 + Math.random() * 15, total: 8 * 1024 * 1024 * 1024 },
      application: { requestsPerSecond: 12 + Math.random() * 5, averageResponseTime: 180 + Math.random() * 90, uptime: now }
    },
    monitoring: {
      metricsCollector: {
        applicationStats: { requestsTotal: 125430, totalErrors: 423, activeConnections: 87 }
      }
    },
    database: { activeConnections: 12, totalQueries: 48230, averageQueryTime: 12.4, connectionPoolUsage: 63.5 },
    cache: { hitRate: 92.3, totalOperations: 84231, averageResponseTime: 2.3, memoryUsage: 128 * 1024 * 1024 }
  };
}

function generateMockMonitoringAlerts() {
  return {
    active: [
      { level: 'warning', title: 'High response time', description: 'Average response time spiked to 1.2s', timestamp: Date.now() - 120000 },
      { level: 'info', title: 'Deployment complete', description: 'New version deployed successfully', timestamp: Date.now() - 3600000 }
    ]
  };
}

app.get('/monitoring/status', (req, res) => {
  res.json(generateMockMonitoringStatus());
});

app.get('/monitoring/alerts', (req, res) => {
  res.json(generateMockMonitoringAlerts());
});

// ------------------- Admin: Data Compliance mock API -------------------
// These endpoints power public/admin/data-compliance.html
// They return predictable JSON so the dashboard renders identically in local & prod.

function generateComplianceSummary() {
  // simple stable mock
  return {
    complianceScore: 95,
    dataMinimization: true,
    purposeLimitation: true,
    storageMinimization: true,
    paymentDataLocalization: true,
    lastComplianceCheck: Date.now() - (2 * 24 * 60 * 60 * 1000)
  };
}

app.get('/api/admin/data-compliance/report/compliance', (req, res) => {
  res.json({ success: true, data: generateComplianceSummary() });
});

app.get('/api/admin/data-compliance/localization/status', (req, res) => {
  res.json({
    success: true,
    data: {
      paymentDataLocalized: true,
      personalDataLocalized: true,
      sensitiveDataLocalized: true,
      lastComplianceCheck: Date.now() - (6 * 60 * 60 * 1000)
    }
  });
});

app.get('/api/admin/data-compliance/consent/dashboard/:userId', (req, res) => {
  const { userId } = req.params;
  res.json({
    success: true,
    data: {
      userId,
      consents: {
        dataCollection: { granted: true },
        marketing: { granted: false },
        analytics: { granted: true },
        cookies: { granted: true },
        thirdParty: { granted: false }
      }
    }
  });
});

app.post('/api/admin/data-compliance/consent/grant', (req, res) => {
  res.json({ success: true });
});

app.post('/api/admin/data-compliance/consent/revoke', (req, res) => {
  res.json({ success: true });
});

app.post('/api/admin/data-compliance/deletion/process/:id', (req, res) => {
  res.json({ success: true, id: req.params.id });
});

app.post('/api/admin/data-compliance/process/expired-data', (req, res) => {
  res.json({ success: true, processed: true });
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
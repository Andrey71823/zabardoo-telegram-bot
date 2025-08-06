import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { logger } from '../config/logger';
import { connectDatabases } from '../config/database';
import couponManagementRoutes from '../routes/admin/couponManagement';
import userManagementRoutes from '../routes/admin/userManagement';
import notificationCampaignRoutes from '../routes/admin/notificationCampaigns';

const app = express();
require('dotenv').config();
const PORT = process.env.ADMIN_PORT || 3011;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for admin panel with inline scripts
}));
app.use(cors());
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files for admin panel
app.use('/admin', express.static(path.join(__dirname, '../../public/admin')));
app.use('/public', express.static(path.join(__dirname, '../../public')));

// API routes
app.use('/api/admin', couponManagementRoutes);
app.use('/api/admin', userManagementRoutes);
app.use('/api/admin/notification-campaigns', notificationCampaignRoutes);

// Admin panel routes
app.get('/', (req, res) => {
  res.redirect('/admin/coupon-management.html');
});

app.get('/admin', (req, res) => {
  res.redirect('/admin/coupon-management.html');
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'admin-server',
    timestamp: new Date().toISOString()
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
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Admin server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Admin server received ${signal}, shutting down gracefully`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startAdminServer = async () => {
  try {
    // Connect to databases
    await connectDatabases();
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`Admin Server running on port ${PORT}`);
      logger.info(`Admin Panel: http://localhost:${PORT}/admin/coupon-management.html`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start Admin Server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startAdminServer();
}

export default app;
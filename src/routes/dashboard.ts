import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';

const router = Router();
const dashboardController = new DashboardController();

// Dashboard metrics endpoints
router.get('/metrics', dashboardController.getMetrics.bind(dashboardController));
router.get('/insights', dashboardController.getInsights.bind(dashboardController));
router.get('/export', dashboardController.exportData.bind(dashboardController));
router.get('/realtime', dashboardController.getRealTimeMetrics.bind(dashboardController));

// Event tracking endpoint
router.post('/track-event', dashboardController.trackEvent.bind(dashboardController));

export default router;
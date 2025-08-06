import { Router } from 'express';
import { NotificationCampaignController } from '../../controllers/admin/NotificationCampaignController';

const router = Router();
const controller = new NotificationCampaignController();

// Campaign routes
router.get('/campaigns', (req, res) => controller.getCampaigns(req, res));
router.get('/campaigns/stats', (req, res) => controller.getCampaignStats(req, res));
router.get('/campaigns/:id', (req, res) => controller.getCampaignById(req, res));
router.post('/campaigns', (req, res) => controller.createCampaign(req, res));
router.put('/campaigns/:id', (req, res) => controller.updateCampaign(req, res));
router.delete('/campaigns/:id', (req, res) => controller.deleteCampaign(req, res));

// Campaign execution routes
router.post('/campaigns/:id/execute', (req, res) => controller.executeCampaign(req, res));
router.post('/campaigns/:id/pause', (req, res) => controller.pauseCampaign(req, res));
router.post('/campaigns/:id/resume', (req, res) => controller.resumeCampaign(req, res));
router.post('/campaigns/:id/schedule', (req, res) => controller.scheduleCampaign(req, res));
router.post('/campaigns/:id/duplicate', (req, res) => controller.duplicateCampaign(req, res));

// Campaign analysis routes
router.get('/campaigns/:id/preview', (req, res) => controller.previewCampaign(req, res));
router.get('/campaigns/:id/analytics', (req, res) => controller.getCampaignAnalytics(req, res));
router.post('/campaigns/:id/ab-test', (req, res) => controller.testABCampaignVariants(req, res));

// Bulk notification routes
router.post('/bulk-notifications', (req, res) => controller.sendBulkNotification(req, res));

// Template routes
router.get('/templates', (req, res) => controller.getNotificationTemplates(req, res));
router.post('/templates', (req, res) => controller.createNotificationTemplate(req, res));

// User preference routes
router.get('/users/:userId/preferences', (req, res) => controller.getUserNotificationPreferences(req, res));
router.put('/users/:userId/preferences', (req, res) => controller.updateUserNotificationPreferences(req, res));

export default router;
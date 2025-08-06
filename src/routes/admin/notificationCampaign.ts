import { Router } from 'express';
import { NotificationCampaignController } from '../../controllers/admin/NotificationCampaignController';

const router = Router();
const campaignController = new NotificationCampaignController();

// Campaign CRUD operations
router.get('/campaigns', campaignController.getCampaigns.bind(campaignController));
router.get('/campaigns/stats', campaignController.getCampaignStats.bind(campaignController));
router.get('/campaigns/:id', campaignController.getCampaignById.bind(campaignController));
router.get('/campaigns/:id/preview', campaignController.previewCampaign.bind(campaignController));
router.get('/campaigns/:id/analytics', campaignController.getCampaignAnalytics.bind(campaignController));

router.post('/campaigns', campaignController.createCampaign.bind(campaignController));
router.post('/campaigns/:id/execute', campaignController.executeCampaign.bind(campaignController));
router.post('/campaigns/:id/pause', campaignController.pauseCampaign.bind(campaignController));
router.post('/campaigns/:id/resume', campaignController.resumeCampaign.bind(campaignController));
router.post('/campaigns/:id/schedule', campaignController.scheduleCampaign.bind(campaignController));
router.post('/campaigns/:id/duplicate', campaignController.duplicateCampaign.bind(campaignController));
router.post('/campaigns/:id/ab-test', campaignController.testABCampaignVariants.bind(campaignController));

router.put('/campaigns/:id', campaignController.updateCampaign.bind(campaignController));

router.delete('/campaigns/:id', campaignController.deleteCampaign.bind(campaignController));

// Bulk notifications
router.post('/notifications/bulk', campaignController.sendBulkNotification.bind(campaignController));

// Notification templates
router.get('/templates', campaignController.getNotificationTemplates.bind(campaignController));
router.post('/templates', campaignController.createNotificationTemplate.bind(campaignController));

// User notification preferences
router.get('/users/:userId/preferences', campaignController.getUserNotificationPreferences.bind(campaignController));
router.put('/users/:userId/preferences', campaignController.updateUserNotificationPreferences.bind(campaignController));

export default router;
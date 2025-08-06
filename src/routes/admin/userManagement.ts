import { Router } from 'express';
import { UserManagementController } from '../../controllers/admin/UserManagementController';

const router = Router();
const userController = new UserManagementController();

// User CRUD operations
router.get('/users', userController.getUsers.bind(userController));
router.get('/users/stats', userController.getUserStats.bind(userController));
router.get('/users/search', userController.searchUsers.bind(userController));
router.get('/users/ban-list', userController.getBanList.bind(userController));
router.get('/users/suspended-channels', userController.getSuspendedChannels.bind(userController));
router.get('/users/:id', userController.getUserById.bind(userController));
router.get('/users/:id/activity', userController.getUserActivity.bind(userController));
router.get('/users/:id/engagement', userController.getUserEngagementMetrics.bind(userController));

router.put('/users/:id', userController.updateUser.bind(userController));
router.put('/users/:id/ban', userController.banUser.bind(userController));
router.put('/users/:id/channel', userController.managePersonalChannel.bind(userController));

// Bulk operations
router.post('/users/bulk-operation', userController.bulkUserOperation.bind(userController));
router.post('/users/segment', userController.segmentUsers.bind(userController));
router.post('/users/export', userController.exportUsers.bind(userController));
router.post('/users/notify', userController.sendNotificationToUsers.bind(userController));

// Moderation
router.get('/moderation/logs', userController.getModerationLogs.bind(userController));
router.get('/moderation/group-settings', userController.getGroupModerationSettings.bind(userController));
router.put('/moderation/group-settings', userController.updateGroupModerationSettings.bind(userController));

export default router;
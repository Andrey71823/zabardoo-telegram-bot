import { UserManagementService } from '../services/admin/UserManagementService';
import { UserManagementRepository } from '../repositories/UserManagementRepository';
import { 
  User, 
  UserFilter, 
  BanAction,
  UserStats,
  ChannelManagement,
  ModerationLog
} from '../models/UserManagement';

// Mock the repository
jest.mock('../repositories/UserManagementRepository');

describe('UserManagementService', () => {
  let service: UserManagementService;
  let mockRepository: jest.Mocked<UserManagementRepository>;

  beforeEach(() => {
    service = new UserManagementService();
    mockRepository = service['repository'] as jest.Mocked<UserManagementRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should retrieve users with filters and pagination', async () => {
      const filter: UserFilter = {
        isActive: true,
        isBanned: false,
        sortBy: 'registeredAt',
        sortOrder: 'desc'
      };

      const mockResponse = {
        users: [
          {
            id: 'user-1',
            telegramId: 123456789,
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            isActive: true,
            isBanned: false,
            registeredAt: new Date(),
            lastActiveAt: new Date(),
            totalSpent: 1000,
            couponsUsed: 5,
            channelStatus: 'active' as const,
            language: 'en',
            preferences: {
              notifications: true,
              categories: [],
              stores: []
            },
            metadata: {
              tags: []
            },
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        total: 1
      };

      mockRepository.getUsers.mockResolvedValue(mockResponse);

      const result = await service.getUsers(filter, 1, 20);

      expect(result.users).toEqual(mockResponse.users);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockRepository.getUsers).toHaveBeenCalledWith(filter, 20, 0);
    });
  });

  describe('getUserById', () => {
    it('should retrieve user by ID', async () => {
      const userId = 'user-1';
      const mockUser: User = {
        id: userId,
        telegramId: 123456789,
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        isBanned: false,
        registeredAt: new Date(),
        lastActiveAt: new Date(),
        totalSpent: 1000,
        couponsUsed: 5,
        channelStatus: 'active',
        language: 'en',
        preferences: {
          notifications: true,
          categories: [],
          stores: []
        },
        metadata: {
          tags: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.getUserById.mockResolvedValue(mockUser);

      const result = await service.getUserById(userId);

      expect(result).toEqual(mockUser);
      expect(mockRepository.getUserById).toHaveBeenCalledWith(userId);
    });

    it('should return null when user not found', async () => {
      const userId = 'non-existent-user';

      mockRepository.getUserById.mockResolvedValue(null);

      const result = await service.getUserById(userId);

      expect(result).toBeNull();
      expect(mockRepository.getUserById).toHaveBeenCalledWith(userId);
    });
  });

  describe('searchUsers', () => {
    it('should search users by text', async () => {
      const searchTerm = 'test';
      const mockResponse = {
        users: [
          {
            id: 'user-1',
            telegramId: 123456789,
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            isActive: true,
            isBanned: false,
            registeredAt: new Date(),
            lastActiveAt: new Date(),
            totalSpent: 1000,
            couponsUsed: 5,
            channelStatus: 'active' as const,
            language: 'en',
            preferences: {
              notifications: true,
              categories: [],
              stores: []
            },
            metadata: {
              tags: []
            },
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        total: 1
      };

      mockRepository.searchUsers.mockResolvedValue(mockResponse);

      const result = await service.searchUsers(searchTerm, 1, 20);

      expect(result.users).toEqual(mockResponse.users);
      expect(result.total).toBe(1);
      expect(mockRepository.searchUsers).toHaveBeenCalledWith(searchTerm, 20, 0);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userId = 'user-1';
      const updates = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const updatedUser: User = {
        id: userId,
        telegramId: 123456789,
        username: 'testuser',
        firstName: 'Updated',
        lastName: 'Name',
        isActive: true,
        isBanned: false,
        registeredAt: new Date(),
        lastActiveAt: new Date(),
        totalSpent: 1000,
        couponsUsed: 5,
        channelStatus: 'active',
        language: 'en',
        preferences: {
          notifications: true,
          categories: [],
          stores: []
        },
        metadata: {
          tags: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.updateUser.mockResolvedValue(updatedUser);

      const result = await service.updateUser(userId, updates);

      expect(result).toEqual(updatedUser);
      expect(mockRepository.updateUser).toHaveBeenCalledWith(userId, expect.objectContaining(updates));
    });
  });

  describe('banUser', () => {
    it('should ban user successfully', async () => {
      const userId = 'user-1';
      const moderatorId = 'admin-1';
      const reason = 'Violation of terms';
      const duration = 24; // 24 hours

      const existingUser: User = {
        id: userId,
        telegramId: 123456789,
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        isBanned: false,
        registeredAt: new Date(),
        lastActiveAt: new Date(),
        totalSpent: 1000,
        couponsUsed: 5,
        channelStatus: 'active',
        language: 'en',
        preferences: {
          notifications: true,
          categories: [],
          stores: []
        },
        metadata: {
          tags: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const bannedUser: User = {
        ...existingUser,
        isBanned: true,
        bannedAt: new Date(),
        bannedBy: moderatorId,
        banReason: reason,
        banExpiresAt: new Date(Date.now() + duration * 60 * 60 * 1000)
      };

      mockRepository.getUserById.mockResolvedValue(existingUser);
      mockRepository.updateUser.mockResolvedValue(bannedUser);
      mockRepository.logModerationAction.mockResolvedValue();

      const result = await service.banUser(userId, 'ban', moderatorId, reason, duration);

      expect(result).toEqual(bannedUser);
      expect(mockRepository.getUserById).toHaveBeenCalledWith(userId);
      expect(mockRepository.updateUser).toHaveBeenCalledWith(userId, expect.objectContaining({
        isBanned: true,
        bannedBy: moderatorId,
        banReason: reason
      }));
      expect(mockRepository.logModerationAction).toHaveBeenCalled();
    });

    it('should unban user successfully', async () => {
      const userId = 'user-1';
      const moderatorId = 'admin-1';

      const bannedUser: User = {
        id: userId,
        telegramId: 123456789,
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        isBanned: true,
        bannedAt: new Date(),
        bannedBy: 'admin-2',
        banReason: 'Previous violation',
        registeredAt: new Date(),
        lastActiveAt: new Date(),
        totalSpent: 1000,
        couponsUsed: 5,
        channelStatus: 'active',
        language: 'en',
        preferences: {
          notifications: true,
          categories: [],
          stores: []
        },
        metadata: {
          tags: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const unbannedUser: User = {
        ...bannedUser,
        isBanned: false,
        bannedAt: null,
        bannedBy: null,
        banReason: null,
        banExpiresAt: null
      };

      mockRepository.getUserById.mockResolvedValue(bannedUser);
      mockRepository.updateUser.mockResolvedValue(unbannedUser);
      mockRepository.logModerationAction.mockResolvedValue();

      const result = await service.banUser(userId, 'unban', moderatorId);

      expect(result).toEqual(unbannedUser);
      expect(mockRepository.updateUser).toHaveBeenCalledWith(userId, expect.objectContaining({
        isBanned: false,
        bannedAt: null,
        bannedBy: null,
        banReason: null
      }));
    });

    it('should throw error when user not found', async () => {
      const userId = 'non-existent-user';
      const moderatorId = 'admin-1';

      mockRepository.getUserById.mockResolvedValue(null);

      await expect(service.banUser(userId, 'ban', moderatorId)).rejects.toThrow('User not found');
    });
  });

  describe('managePersonalChannel', () => {
    it('should create personal channel successfully', async () => {
      const userId = 'user-1';
      const moderatorId = 'admin-1';

      const user: User = {
        id: userId,
        telegramId: 123456789,
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        isBanned: false,
        registeredAt: new Date(),
        lastActiveAt: new Date(),
        totalSpent: 1000,
        couponsUsed: 5,
        channelStatus: 'none',
        language: 'en',
        preferences: {
          notifications: true,
          categories: [],
          stores: []
        },
        metadata: {
          tags: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const channelManagement: ChannelManagement = {
        id: 'channel-1',
        userId,
        channelId: 'CH67891234567890ABCD',
        status: 'active',
        createdBy: moderatorId,
        createdAt: new Date(),
        metadata: {}
      };

      mockRepository.getUserById.mockResolvedValue(user);
      mockRepository.managePersonalChannel.mockResolvedValue(channelManagement);
      mockRepository.logModerationAction.mockResolvedValue();

      const result = await service.managePersonalChannel(userId, 'create', moderatorId);

      expect(result).toEqual(channelManagement);
      expect(mockRepository.managePersonalChannel).toHaveBeenCalledWith(userId, expect.objectContaining({
        status: 'active',
        createdBy: moderatorId
      }));
      expect(mockRepository.logModerationAction).toHaveBeenCalled();
    });

    it('should suspend personal channel successfully', async () => {
      const userId = 'user-1';
      const moderatorId = 'admin-1';
      const reason = 'Inappropriate content';

      const user: User = {
        id: userId,
        telegramId: 123456789,
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        isBanned: false,
        registeredAt: new Date(),
        lastActiveAt: new Date(),
        totalSpent: 1000,
        couponsUsed: 5,
        channelStatus: 'active',
        personalChannelId: 'CH67891234567890ABCD',
        language: 'en',
        preferences: {
          notifications: true,
          categories: [],
          stores: []
        },
        metadata: {
          tags: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const suspendedChannel: ChannelManagement = {
        id: 'channel-1',
        userId,
        channelId: 'CH67891234567890ABCD',
        status: 'suspended',
        createdBy: 'admin-2',
        createdAt: new Date(),
        suspendedBy: moderatorId,
        suspendedAt: new Date(),
        suspensionReason: reason,
        metadata: {}
      };

      mockRepository.getUserById.mockResolvedValue(user);
      mockRepository.managePersonalChannel.mockResolvedValue(suspendedChannel);
      mockRepository.logModerationAction.mockResolvedValue();

      const result = await service.managePersonalChannel(userId, 'suspend', moderatorId, reason);

      expect(result).toEqual(suspendedChannel);
      expect(mockRepository.managePersonalChannel).toHaveBeenCalledWith(userId, expect.objectContaining({
        status: 'suspended',
        suspendedBy: moderatorId,
        suspensionReason: reason
      }));
    });
  });

  describe('getUserStats', () => {
    it('should retrieve user statistics', async () => {
      const mockStats: UserStats = {
        totalUsers: 1000,
        activeUsers: 800,
        bannedUsers: 50,
        newUsersToday: 10,
        newUsersThisWeek: 70,
        newUsersThisMonth: 300,
        usersWithPersonalChannels: 600,
        suspendedChannels: 20,
        deletedChannels: 10,
        averageSpentPerUser: 500,
        averageCouponsPerUser: 3,
        topSpenders: [
          { userId: 'user-1', username: 'bigspender', totalSpent: 5000 }
        ],
        topCouponUsers: [
          { userId: 'user-2', username: 'couponlover', couponsUsed: 50 }
        ],
        usersByLocation: [
          { location: 'Mumbai', count: 200, percentage: 20 }
        ],
        usersByLanguage: [
          { language: 'en', count: 800, percentage: 80 }
        ],
        activityLevels: {
          high: 100,
          medium: 300,
          low: 400,
          inactive: 200
        },
        registrationTrend: [
          { date: '2023-01-01', count: 10 }
        ]
      };

      mockRepository.getUserStats.mockResolvedValue(mockStats);

      const result = await service.getUserStats();

      expect(result).toEqual(mockStats);
      expect(mockRepository.getUserStats).toHaveBeenCalled();
    });
  });

  describe('bulkUserOperation', () => {
    it('should perform bulk ban operation successfully', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const operatorId = 'admin-1';
      const reason = 'Bulk ban for policy violation';

      const user1: User = {
        id: 'user-1',
        telegramId: 123456789,
        username: 'user1',
        firstName: 'User',
        lastName: 'One',
        isActive: true,
        isBanned: false,
        registeredAt: new Date(),
        lastActiveAt: new Date(),
        totalSpent: 100,
        couponsUsed: 1,
        channelStatus: 'active',
        language: 'en',
        preferences: { notifications: true, categories: [], stores: [] },
        metadata: { tags: [] },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock successful ban for all users
      mockRepository.getUserById.mockResolvedValue(user1);
      mockRepository.updateUser.mockResolvedValue({ ...user1, isBanned: true });
      mockRepository.logModerationAction.mockResolvedValue();

      const result = await service.bulkUserOperation(userIds, 'ban', operatorId, { reason });

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockRepository.getUserById).toHaveBeenCalledTimes(3);
      expect(mockRepository.updateUser).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in bulk operations', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const operatorId = 'admin-1';

      const user1: User = {
        id: 'user-1',
        telegramId: 123456789,
        username: 'user1',
        firstName: 'User',
        lastName: 'One',
        isActive: true,
        isBanned: false,
        registeredAt: new Date(),
        lastActiveAt: new Date(),
        totalSpent: 100,
        couponsUsed: 1,
        channelStatus: 'active',
        language: 'en',
        preferences: { notifications: true, categories: [], stores: [] },
        metadata: { tags: [] },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock success for first user, failure for second, success for third
      mockRepository.getUserById
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(null) // User not found
        .mockResolvedValueOnce(user1);
      
      mockRepository.updateUser.mockResolvedValue({ ...user1, isBanned: true });
      mockRepository.logModerationAction.mockResolvedValue();

      const result = await service.bulkUserOperation(userIds, 'ban', operatorId);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].userId).toBe('user-2');
    });
  });

  describe('segmentUsers', () => {
    it('should segment users based on criteria', async () => {
      const criteria = {
        totalSpent: { min: 1000 },
        activityLevel: 'high' as const
      };

      const mockSegments = [
        {
          id: 'segment-1',
          name: 'High Value Users',
          description: 'Users with high spending and activity',
          criteria,
          userCount: 50,
          users: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRepository.segmentUsers.mockResolvedValue(mockSegments);

      const result = await service.segmentUsers(criteria);

      expect(result).toEqual(mockSegments);
      expect(mockRepository.segmentUsers).toHaveBeenCalledWith(criteria);
    });
  });

  describe('getUserActivity', () => {
    it('should retrieve user activity with pagination', async () => {
      const userId = 'user-1';
      const mockActivity = {
        activities: [
          {
            id: 'activity-1',
            userId,
            activityType: 'coupon_use' as const,
            description: 'Used coupon SAVE20',
            metadata: { couponId: 'coupon-1' },
            timestamp: new Date()
          }
        ],
        total: 1
      };

      mockRepository.getUserActivity.mockResolvedValue(mockActivity);

      const result = await service.getUserActivity(userId, 1, 50);

      expect(result.activities).toEqual(mockActivity.activities);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockRepository.getUserActivity).toHaveBeenCalledWith(userId, 50, 0);
    });
  });

  describe('getModerationLogs', () => {
    it('should retrieve moderation logs with filters', async () => {
      const filter = {
        userId: 'user-1',
        action: 'user_banned'
      };

      const mockLogs = {
        logs: [
          {
            id: 'log-1',
            userId: 'user-1',
            moderatorId: 'admin-1',
            action: 'user_banned' as const,
            reason: 'Policy violation',
            metadata: {},
            timestamp: new Date()
          }
        ],
        total: 1
      };

      mockRepository.getModerationLogs.mockResolvedValue(mockLogs);

      const result = await service.getModerationLogs(filter, 1, 50);

      expect(result.logs).toEqual(mockLogs.logs);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockRepository.getModerationLogs).toHaveBeenCalledWith(filter, 50, 0);
    });
  });

  describe('sendNotificationToUsers', () => {
    it('should send notifications to multiple users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const notification = {
        title: 'System Maintenance',
        message: 'The system will be under maintenance tonight.',
        type: 'system' as const
      };
      const senderId = 'admin-1';

      // Mock successful notification sending
      mockRepository.sendNotificationToUser.mockResolvedValue();

      const result = await service.sendNotificationToUsers(userIds, notification, senderId);

      expect(result.sent).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockRepository.sendNotificationToUser).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in notification sending', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const notification = {
        title: 'Test Notification',
        message: 'This is a test.',
        type: 'info' as const
      };
      const senderId = 'admin-1';

      // Mock success for first user, failure for second, success for third
      mockRepository.sendNotificationToUser
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('User not found'))
        .mockResolvedValueOnce();

      const result = await service.sendNotificationToUsers(userIds, notification, senderId);

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].userId).toBe('user-2');
    });
  });
});
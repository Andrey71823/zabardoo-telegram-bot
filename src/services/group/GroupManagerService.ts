import { BaseService } from '../base/BaseService';
import { Request, Response } from 'express';
import { GroupRepository } from '../../repositories/GroupRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { PersonalChannelRepository } from '../../repositories/PersonalChannelRepository';
import { TelegramBotService } from '../telegram/TelegramBotService';
import { ModerationService } from '../moderation/ModerationService';
import { pgPool } from '../../config/database';
import { Group, GroupMessage, GroupMember, ModerationRule } from '../../models/Group';
import config from '../../config';

export class GroupManagerService extends BaseService {
  private groupRepository: GroupRepository;
  private userRepository: UserRepository;
  private channelRepository: PersonalChannelRepository;
  private telegramBot: TelegramBotService;
  private moderationService: ModerationService;

  constructor() {
    super('group-manager', 3007);
    this.groupRepository = new GroupRepository(pgPool);
    this.userRepository = new UserRepository(pgPool);
    this.channelRepository = new PersonalChannelRepository(pgPool);
    
    if (!config.apis.telegram.botToken) {
      throw new Error('Telegram bot token is required');
    }
    
    this.telegramBot = new TelegramBotService(config.apis.telegram.botToken);
    this.moderationService = new ModerationService(
      this.groupRepository,
      this.userRepository,
      this.telegramBot
    );
  }

  protected setupServiceRoutes(): void {
    // Group management routes
    this.app.post('/groups', this.createGroup.bind(this));
    this.app.get('/groups/:telegramGroupId', this.getGroup.bind(this));
    this.app.put('/groups/:telegramGroupId', this.updateGroup.bind(this));
    
    // Member management routes
    this.app.post('/groups/:telegramGroupId/members', this.addMember.bind(this));
    this.app.get('/groups/:telegramGroupId/members', this.getMembers.bind(this));
    this.app.put('/groups/:telegramGroupId/members/:userId', this.updateMemberStatus.bind(this));
    
    // Message moderation routes
    this.app.post('/groups/:telegramGroupId/moderate', this.moderateMessage.bind(this));
    this.app.get('/groups/:telegramGroupId/messages', this.getRecentMessages.bind(this));
    this.app.post('/groups/:telegramGroupId/messages/:messageId/action', this.takeAction.bind(this));
    
    // Moderation rules routes
    this.app.post('/groups/:telegramGroupId/rules', this.createModerationRule.bind(this));
    this.app.get('/groups/:telegramGroupId/rules', this.getModerationRules.bind(this));
    this.app.put('/groups/:telegramGroupId/rules/:ruleId', this.updateModerationRule.bind(this));
    
    // Coupon creation assistance routes
    this.app.post('/groups/:telegramGroupId/assist-coupon', this.assistCouponCreation.bind(this));
    this.app.get('/groups/:telegramGroupId/coupon-requests', this.getCouponRequests.bind(this));
    this.app.post('/groups/:telegramGroupId/coupon-requests/:requestId/moderate', this.moderateCouponRequest.bind(this));
    
    // Analytics routes
    this.app.get('/groups/:telegramGroupId/analytics', this.getGroupAnalytics.bind(this));
    this.app.get('/analytics/groups', this.getAllGroupsAnalytics.bind(this));
    
    // Webhook for group updates
    this.app.post('/webhook/group-update', this.handleGroupUpdate.bind(this));
  }

  protected async checkServiceHealth(): Promise<boolean> {
    try {
      // Check database connections and basic functionality
      const testGroups = await this.groupRepository.getGroupByTelegramId('test');
      return true;
    } catch (error) {
      this.logger.error('Group Manager health check failed:', error);
      return false;
    }
  }

  // Group Management Methods
  private async createGroup(req: Request, res: Response): Promise<void> {
    try {
      const groupData: Partial<Group> = req.body;
      
      if (!groupData.telegramGroupId || !groupData.name) {
        res.status(400).json({ error: 'telegramGroupId and name are required' });
        return;
      }

      // Check if group already exists
      const existingGroup = await this.groupRepository.getGroupByTelegramId(groupData.telegramGroupId);
      if (existingGroup) {
        res.status(409).json({ error: 'Group already exists', group: existingGroup });
        return;
      }

      const group = await this.groupRepository.createGroup(groupData);
      
      // Create default moderation rules
      await this.createDefaultModerationRules(group.id);
      
      this.logger.info(`Created group ${group.telegramGroupId}: ${group.name}`);
      res.status(201).json(group);
    } catch (error) {
      this.logger.error('Error creating group:', error);
      res.status(500).json({ error: 'Failed to create group' });
    }
  }

  private async getGroup(req: Request, res: Response): Promise<void> {
    try {
      const { telegramGroupId } = req.params;
      
      const group = await this.groupRepository.getGroupByTelegramId(telegramGroupId);
      
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      res.json(group);
    } catch (error) {
      this.logger.error('Error getting group:', error);
      res.status(500).json({ error: 'Failed to get group' });
    }
  }

  private async updateGroup(req: Request, res: Response): Promise<void> {
    try {
      const { telegramGroupId } = req.params;
      const updates = req.body;
      
      const group = await this.groupRepository.getGroupByTelegramId(telegramGroupId);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const updatedGroup = await this.groupRepository.updateGroup(group.id, updates);
      
      res.json(updatedGroup);
    } catch (error) {
      this.logger.error('Error updating group:', error);
      res.status(500).json({ error: 'Failed to update group' });
    }
  }

  // Member Management Methods
  private async addMember(req: Request, res: Response): Promise<void> {
    try {
      const { telegramGroupId } = req.params;
      const { userId, role = 'member' } = req.body;
      
      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const group = await this.groupRepository.getGroupByTelegramId(telegramGroupId);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const member = await this.groupRepository.addGroupMember({
        groupId: group.id,
        userId,
        role
      });
      
      // Update group member count
      await this.groupRepository.updateGroup(group.id, {
        memberCount: group.memberCount + 1
      });
      
      this.logger.info(`Added member ${userId} to group ${telegramGroupId}`);
      res.status(201).json(member);
    } catch (error) {
      this.logger.error('Error adding member:', error);
      res.status(500).json({ error: 'Failed to add member' });
    }
  }

  private async updateMemberStatus(req: Request, res: Response): Promise<void> {
    try {
      const { telegramGroupId, userId } = req.params;
      const { status, reason } = req.body;
      
      if (!status) {
        res.status(400).json({ error: 'status is required' });
        return;
      }

      const group = await this.groupRepository.getGroupByTelegramId(telegramGroupId);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const member = await this.groupRepository.updateMemberStatus(group.id, userId, status, reason);
      
      if (!member) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }

      this.logger.info(`Updated member ${userId} status to ${status} in group ${telegramGroupId}`);
      res.json(member);
    } catch (error) {
      this.logger.error('Error updating member status:', error);
      res.status(500).json({ error: 'Failed to update member status' });
    }
  }

  // Message Moderation Methods
  private async moderateMessage(req: Request, res: Response): Promise<void> {
    try {
      const { telegramGroupId } = req.params;
      const { messageId, userId, content, messageType = 'text' } = req.body;
      
      if (!messageId || !userId || !content) {
        res.status(400).json({ error: 'messageId, userId, and content are required' });
        return;
      }

      const group = await this.groupRepository.getGroupByTelegramId(telegramGroupId);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      // Record the message
      const message = await this.groupRepository.recordGroupMessage({
        groupId: group.id,
        userId,
        messageId,
        content,
        messageType
      });

      // Run moderation
      const moderationResult = await this.moderationService.moderateMessage(group.id, message);
      
      this.logger.info(`Moderated message ${messageId}: ${moderationResult.action}`);
      res.json({
        message,
        moderation: moderationResult
      });
    } catch (error) {
      this.logger.error('Error moderating message:', error);
      res.status(500).json({ error: 'Failed to moderate message' });
    }
  }

  private async getRecentMessages(req: Request, res: Response): Promise<void> {
    try {
      const { telegramGroupId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const group = await this.groupRepository.getGroupByTelegramId(telegramGroupId);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const messages = await this.groupRepository.getRecentMessages(group.id, limit);
      
      res.json({ groupId: group.id, messages, count: messages.length });
    } catch (error) {
      this.logger.error('Error getting recent messages:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  }

  // Coupon Creation Assistance Methods
  private async assistCouponCreation(req: Request, res: Response): Promise<void> {
    try {
      const { telegramGroupId } = req.params;
      const { userId, messageContent } = req.body;
      
      if (!userId || !messageContent) {
        res.status(400).json({ error: 'userId and messageContent are required' });
        return;
      }

      const group = await this.groupRepository.getGroupByTelegramId(telegramGroupId);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      if (!group.allowCouponCreation) {
        res.status(403).json({ error: 'Coupon creation is disabled for this group' });
        return;
      }

      const assistance = await this.moderationService.assistCouponCreation(
        group.id, 
        userId, 
        messageContent
      );
      
      res.json(assistance);
    } catch (error) {
      this.logger.error('Error assisting coupon creation:', error);
      res.status(500).json({ error: 'Failed to assist coupon creation' });
    }
  }

  private async getCouponRequests(req: Request, res: Response): Promise<void> {
    try {
      const { telegramGroupId } = req.params;
      
      const group = await this.groupRepository.getGroupByTelegramId(telegramGroupId);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const requests = await this.groupRepository.getPendingCouponRequests(group.id);
      
      res.json({ groupId: group.id, requests, count: requests.length });
    } catch (error) {
      this.logger.error('Error getting coupon requests:', error);
      res.status(500).json({ error: 'Failed to get coupon requests' });
    }
  }

  private async moderateCouponRequest(req: Request, res: Response): Promise<void> {
    try {
      const { telegramGroupId, requestId } = req.params;
      const { status, moderatorId, notes } = req.body;
      
      if (!status || !moderatorId) {
        res.status(400).json({ error: 'status and moderatorId are required' });
        return;
      }

      const group = await this.groupRepository.getGroupByTelegramId(telegramGroupId);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const request = await this.groupRepository.moderateCouponRequest(
        requestId, 
        status, 
        moderatorId, 
        notes
      );
      
      if (!request) {
        res.status(404).json({ error: 'Coupon request not found' });
        return;
      }

      this.logger.info(`Moderated coupon request ${requestId}: ${status}`);
      res.json(request);
    } catch (error) {
      this.logger.error('Error moderating coupon request:', error);
      res.status(500).json({ error: 'Failed to moderate coupon request' });
    }
  }

  // Analytics Methods
  private async getGroupAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { telegramGroupId } = req.params;
      
      const group = await this.groupRepository.getGroupByTelegramId(telegramGroupId);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const messages = await this.groupRepository.getRecentMessages(group.id, 1000);
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentMessages = messages.filter(msg => new Date(msg.createdAt) > oneDayAgo);
      const moderatedMessages = messages.filter(msg => msg.isModerated);
      const couponsCreated = messages.filter(msg => msg.messageType === 'coupon').length;
      
      const analytics = {
        groupId: group.id,
        groupName: group.name,
        memberCount: group.memberCount,
        totalMessages: messages.length,
        messagesLast24h: recentMessages.length,
        moderationRate: (moderatedMessages.length / Math.max(messages.length, 1)) * 100,
        couponsCreated,
        isActive: group.isActive,
        moderationLevel: group.moderationLevel,
        timestamp: new Date()
      };

      res.json(analytics);
    } catch (error) {
      this.logger.error('Error getting group analytics:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  }

  private async getAllGroupsAnalytics(req: Request, res: Response): Promise<void> {
    try {
      // This would typically get all groups, but for now return summary
      const analytics = {
        totalGroups: 1,
        activeGroups: 1,
        totalMembers: 0,
        totalMessages: 0,
        moderationActions: 0,
        couponsCreated: 0,
        timestamp: new Date()
      };

      res.json(analytics);
    } catch (error) {
      this.logger.error('Error getting all groups analytics:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  }

  // Webhook Handler
  private async handleGroupUpdate(req: Request, res: Response): Promise<void> {
    try {
      const update = req.body;
      
      // Handle different types of group updates
      if (update.message && update.message.chat.type === 'group') {
        await this.processGroupMessage(update.message);
      } else if (update.new_chat_member) {
        await this.processNewMember(update.new_chat_member, update.message.chat.id);
      } else if (update.left_chat_member) {
        await this.processLeftMember(update.left_chat_member, update.message.chat.id);
      }
      
      res.status(200).json({ ok: true });
    } catch (error) {
      this.logger.error('Error handling group update:', error);
      res.status(500).json({ error: 'Failed to process group update' });
    }
  }

  // Helper Methods
  private async createDefaultModerationRules(groupId: string): Promise<void> {
    const defaultRules = [
      {
        groupId,
        ruleType: 'spam_detection' as const,
        parameters: { maxCapsRatio: 0.7, maxEmojis: 10 },
        action: 'warn' as const,
        severity: 'medium' as const
      },
      {
        groupId,
        ruleType: 'rate_limit' as const,
        parameters: { maxMessagesPerMinute: 5 },
        action: 'mute' as const,
        severity: 'medium' as const
      },
      {
        groupId,
        ruleType: 'link_filter' as const,
        parameters: { 
          allowedDomains: ['flipkart.com', 'amazon.in', 'myntra.com', 'zabardoo.com'] 
        },
        action: 'warn' as const,
        severity: 'low' as const
      }
    ];

    for (const rule of defaultRules) {
      await this.groupRepository.createModerationRule(rule);
    }
  }

  private async processGroupMessage(message: any): Promise<void> {
    // Process incoming group message for moderation
    this.logger.info(`Processing group message: ${message.message_id}`);
  }

  private async processNewMember(member: any, chatId: string): Promise<void> {
    // Process new member joining the group
    this.logger.info(`New member joined group ${chatId}: ${member.id}`);
  }

  private async processLeftMember(member: any, chatId: string): Promise<void> {
    // Process member leaving the group
    this.logger.info(`Member left group ${chatId}: ${member.id}`);
  }

  // Moderation Rules Methods (continued from setupServiceRoutes)
  private async createModerationRule(req: Request, res: Response): Promise<void> {
    try {
      const { telegramGroupId } = req.params;
      const ruleData = req.body;
      
      const group = await this.groupRepository.getGroupByTelegramId(telegramGroupId);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const rule = await this.groupRepository.createModerationRule({
        ...ruleData,
        groupId: group.id
      });
      
      res.status(201).json(rule);
    } catch (error) {
      this.logger.error('Error creating moderation rule:', error);
      res.status(500).json({ error: 'Failed to create moderation rule' });
    }
  }

  private async getModerationRules(req: Request, res: Response): Promise<void> {
    try {
      const { telegramGroupId } = req.params;
      
      const group = await this.groupRepository.getGroupByTelegramId(telegramGroupId);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const rules = await this.groupRepository.getModerationRules(group.id);
      
      res.json({ groupId: group.id, rules, count: rules.length });
    } catch (error) {
      this.logger.error('Error getting moderation rules:', error);
      res.status(500).json({ error: 'Failed to get moderation rules' });
    }
  }

  private async updateModerationRule(req: Request, res: Response): Promise<void> {
    try {
      const { telegramGroupId, ruleId } = req.params;
      const updates = req.body;
      
      // This would require additional repository method
      res.json({ message: 'Rule update not implemented yet' });
    } catch (error) {
      this.logger.error('Error updating moderation rule:', error);
      res.status(500).json({ error: 'Failed to update moderation rule' });
    }
  }

  private async takeAction(req: Request, res: Response): Promise<void> {
    try {
      const { telegramGroupId, messageId } = req.params;
      const { action, reason, moderatorId } = req.body;
      
      if (!action || !moderatorId) {
        res.status(400).json({ error: 'action and moderatorId are required' });
        return;
      }

      const result = await this.groupRepository.moderateMessage(messageId, action, reason, moderatorId);
      
      if (!result) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      res.json(result);
    } catch (error) {
      this.logger.error('Error taking action on message:', error);
      res.status(500).json({ error: 'Failed to take action' });
    }
  }

  private async getMembers(req: Request, res: Response): Promise<void> {
    try {
      const { telegramGroupId } = req.params;
      
      // This would require additional repository method to get all members
      res.json({ message: 'Get members not implemented yet' });
    } catch (error) {
      this.logger.error('Error getting members:', error);
      res.status(500).json({ error: 'Failed to get members' });
    }
  }
}

// Start service if run directly
if (require.main === module) {
  const service = new GroupManagerService();
  service.setupGracefulShutdown();
  service.start();
}
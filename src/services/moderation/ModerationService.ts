import { GroupRepository } from '../../repositories/GroupRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { TelegramBotService } from '../telegram/TelegramBotService';
import { GroupMessage, ModerationRule, CouponCreationRequest } from '../../models/Group';
import { logger } from '../../config/logger';

export class ModerationService {
  constructor(
    private groupRepository: GroupRepository,
    private userRepository: UserRepository,
    private telegramBot: TelegramBotService
  ) {}

  async moderateMessage(groupId: string, message: GroupMessage): Promise<{
    action: string;
    reason?: string;
    shouldDelete: boolean;
    shouldWarn: boolean;
    shouldBan: boolean;
  }> {
    try {
      const rules = await this.groupRepository.getModerationRules(groupId);
      
      for (const rule of rules) {
        const violation = await this.checkRule(message, rule);
        if (violation.isViolation) {
          const action = await this.executeAction(groupId, message, rule, violation.reason || 'Rule violation');
          return action;
        }
      }

      return {
        action: 'approved',
        shouldDelete: false,
        shouldWarn: false,
        shouldBan: false
      };
    } catch (error) {
      logger.error('Error moderating message:', error);
      return {
        action: 'error',
        reason: 'Moderation system error',
        shouldDelete: false,
        shouldWarn: false,
        shouldBan: false
      };
    }
  }

  private async checkRule(message: GroupMessage, rule: ModerationRule): Promise<{
    isViolation: boolean;
    reason?: string;
  }> {
    const { ruleType, parameters } = rule;
    const content = message.content.toLowerCase();

    switch (ruleType) {
      case 'spam_detection':
        return this.checkSpam(content, parameters);
      
      case 'keyword_filter':
        return this.checkKeywords(content, parameters);
      
      case 'link_filter':
        return this.checkLinks(content, parameters);
      
      case 'rate_limit':
        return await this.checkRateLimit(message, parameters);
      
      case 'duplicate_content':
        return await this.checkDuplicateContent(message, parameters);
      
      default:
        return { isViolation: false };
    }
  }

  private checkSpam(content: string, parameters: any): { isViolation: boolean; reason?: string } {
    // Check for excessive caps
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.7 && content.length > 10) {
      return { isViolation: true, reason: 'Excessive capital letters' };
    }

    // Check for excessive emojis
    const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
    if (emojiCount > 10) {
      return { isViolation: true, reason: 'Excessive emojis' };
    }

    // Check for repetitive characters
    const repetitivePattern = /(.)\1{4,}/g;
    if (repetitivePattern.test(content)) {
      return { isViolation: true, reason: 'Repetitive characters' };
    }

    return { isViolation: false };
  }

  private checkKeywords(content: string, parameters: any): { isViolation: boolean; reason?: string } {
    const bannedWords = parameters.bannedWords || [];
    
    for (const word of bannedWords) {
      if (content.includes(word.toLowerCase())) {
        return { isViolation: true, reason: `Contains banned word: ${word}` };
      }
    }

    return { isViolation: false };
  }

  private checkLinks(content: string, parameters: any): { isViolation: boolean; reason?: string } {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex) || [];
    
    if (urls.length === 0) {
      return { isViolation: false };
    }

    const allowedDomains = parameters.allowedDomains || [];
    
    for (const url of urls) {
      const domain = this.extractDomain(url);
      if (allowedDomains.length > 0 && !allowedDomains.some((allowed: string) => domain.includes(allowed))) {
        return { isViolation: true, reason: `Unauthorized link: ${domain}` };
      }
    }

    return { isViolation: false };
  }

  private async checkRateLimit(message: GroupMessage, parameters: any): Promise<{ isViolation: boolean; reason?: string }> {
    const maxMessages = parameters.maxMessagesPerMinute || 5;
    const timeWindow = 60 * 1000; // 1 minute
    
    try {
      const recentMessages = await this.groupRepository.getRecentMessages(message.groupId, 100);
      const userMessages = recentMessages.filter(msg => 
        msg.userId === message.userId && 
        new Date(msg.createdAt).getTime() > Date.now() - timeWindow
      );

      if (userMessages.length >= maxMessages) {
        return { isViolation: true, reason: `Rate limit exceeded: ${userMessages.length} messages in 1 minute` };
      }
    } catch (error) {
      logger.error('Error checking rate limit:', error);
    }

    return { isViolation: false };
  }

  private async checkDuplicateContent(message: GroupMessage, parameters: any): Promise<{ isViolation: boolean; reason?: string }> {
    try {
      const recentMessages = await this.groupRepository.getRecentMessages(message.groupId, 50);
      const duplicates = recentMessages.filter(msg => 
        msg.userId === message.userId && 
        msg.content === message.content &&
        new Date(msg.createdAt).getTime() > Date.now() - (24 * 60 * 60 * 1000) // 24 hours
      );

      if (duplicates.length > 0) {
        return { isViolation: true, reason: 'Duplicate content detected' };
      }
    } catch (error) {
      logger.error('Error checking duplicate content:', error);
    }

    return { isViolation: false };
  }

  private async executeAction(
    groupId: string, 
    message: GroupMessage, 
    rule: ModerationRule, 
    reason: string
  ): Promise<{
    action: string;
    reason: string;
    shouldDelete: boolean;
    shouldWarn: boolean;
    shouldBan: boolean;
  }> {
    const { action, severity } = rule;
    let shouldDelete = false;
    let shouldWarn = false;
    let shouldBan = false;

    switch (action) {
      case 'warn':
        shouldWarn = true;
        await this.warnUser(groupId, message.userId, reason);
        break;
      
      case 'delete':
        shouldDelete = true;
        await this.deleteMessage(groupId, message.messageId);
        break;
      
      case 'mute':
        await this.muteUser(groupId, message.userId, this.getMuteDuration(severity));
        shouldDelete = true;
        break;
      
      case 'ban':
        shouldBan = true;
        await this.banUser(groupId, message.userId, reason);
        break;
    }

    // Record moderation action
    await this.groupRepository.moderateMessage(message.messageId, action, reason);

    return {
      action,
      reason,
      shouldDelete,
      shouldWarn,
      shouldBan
    };
  }

  private async warnUser(groupId: string, userId: string, reason: string): Promise<void> {
    try {
      const warningCount = await this.groupRepository.incrementWarningCount(groupId, userId);
      
      // Auto-ban after 3 warnings
      if (warningCount >= 3) {
        await this.banUser(groupId, userId, 'Exceeded warning limit');
        return;
      }

      // Send warning message
      const user = await this.userRepository.getUserById(userId);
      if (user) {
        const warningMessage = `⚠️ Предупреждение ${warningCount}/3\n\nПричина: ${reason}\n\nПожалуйста, соблюдайте правила группы.`;
        
        await this.telegramBot.sendMessage({
          channelId: user.personalChannelId,
          message: warningMessage,
          messageType: 'text'
        });
      }
    } catch (error) {
      logger.error('Error warning user:', error);
    }
  }

  private async deleteMessage(groupId: string, messageId: string): Promise<void> {
    try {
      // In a real implementation, this would call Telegram API to delete the message
      logger.info(`Deleting message ${messageId} in group ${groupId}`);
    } catch (error) {
      logger.error('Error deleting message:', error);
    }
  }

  private async muteUser(groupId: string, userId: string, duration: number): Promise<void> {
    try {
      await this.groupRepository.updateMemberStatus(groupId, userId, 'muted');
      
      // Schedule unmute (in a real implementation, this would use a job queue)
      setTimeout(async () => {
        await this.groupRepository.updateMemberStatus(groupId, userId, 'active');
      }, duration);
      
      logger.info(`Muted user ${userId} in group ${groupId} for ${duration}ms`);
    } catch (error) {
      logger.error('Error muting user:', error);
    }
  }

  private async banUser(groupId: string, userId: string, reason: string): Promise<void> {
    try {
      await this.groupRepository.updateMemberStatus(groupId, userId, 'banned', reason);
      
      // Send ban notification
      const user = await this.userRepository.getUserById(userId);
      if (user) {
        const banMessage = `🚫 Вы были заблокированы в группе\n\nПричина: ${reason}\n\nДля разблокировки обратитесь к администратору.`;
        
        await this.telegramBot.sendMessage({
          channelId: user.personalChannelId,
          message: banMessage,
          messageType: 'text'
        });
      }
      
      logger.info(`Banned user ${userId} in group ${groupId}: ${reason}`);
    } catch (error) {
      logger.error('Error banning user:', error);
    }
  }

  private getMuteDuration(severity: string): number {
    switch (severity) {
      case 'low': return 5 * 60 * 1000; // 5 minutes
      case 'medium': return 30 * 60 * 1000; // 30 minutes
      case 'high': return 2 * 60 * 60 * 1000; // 2 hours
      default: return 15 * 60 * 1000; // 15 minutes
    }
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  // Coupon Creation Assistance
  async assistCouponCreation(groupId: string, userId: string, messageContent: string): Promise<{
    isValidCoupon: boolean;
    extractedData?: Partial<CouponCreationRequest>;
    suggestions?: string[];
    errors?: string[];
  }> {
    try {
      const extractedData = this.extractCouponData(messageContent);
      const validation = this.validateCouponData(extractedData);
      
      if (validation.isValid) {
        // Create coupon request
        const request = await this.groupRepository.createCouponRequest({
          groupId,
          userId,
          messageId: `msg_${Date.now()}`,
          ...extractedData
        });
        
        return {
          isValidCoupon: true,
          extractedData: request,
          suggestions: [
            'Купон успешно создан и отправлен на модерацию',
            'Добавьте больше деталей для лучшего описания',
            'Проверьте срок действия купона'
          ]
        };
      } else {
        return {
          isValidCoupon: false,
          extractedData,
          errors: validation.errors,
          suggestions: [
            'Добавьте название магазина',
            'Укажите размер скидки',
            'Добавьте ссылку на товар',
            'Опишите условия использования купона'
          ]
        };
      }
    } catch (error) {
      logger.error('Error assisting coupon creation:', error);
      return {
        isValidCoupon: false,
        errors: ['Ошибка при обработке купона']
      };
    }
  }

  private extractCouponData(content: string): Partial<CouponCreationRequest> {
    const data: Partial<CouponCreationRequest> = {};
    
    // Extract title (first line or text before description)
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      data.title = lines[0].substring(0, 200);
    }
    
    // Extract description
    if (lines.length > 1) {
      data.description = lines.slice(1).join('\n').substring(0, 1000);
    }
    
    // Extract discount percentage
    const percentageMatch = content.match(/(\d+)%/);
    if (percentageMatch) {
      data.discountType = 'percentage';
      data.discountValue = parseInt(percentageMatch[1]);
    }
    
    // Extract fixed discount
    const fixedMatch = content.match(/₹(\d+)/);
    if (fixedMatch && !data.discountValue) {
      data.discountType = 'fixed';
      data.discountValue = parseInt(fixedMatch[1]);
    }
    
    // Extract coupon code
    const codeMatch = content.match(/код[:\s]*([A-Z0-9]+)/i) || content.match(/code[:\s]*([A-Z0-9]+)/i);
    if (codeMatch) {
      data.couponCode = codeMatch[1];
    }
    
    // Extract links
    const linkMatch = content.match(/(https?:\/\/[^\s]+)/);
    if (linkMatch) {
      data.link = linkMatch[1];
    }
    
    // Extract store name
    const storePatterns = [
      /flipkart/i,
      /amazon/i,
      /myntra/i,
      /ajio/i,
      /nykaa/i,
      /bigbasket/i,
      /swiggy/i,
      /zomato/i
    ];
    
    for (const pattern of storePatterns) {
      if (pattern.test(content)) {
        data.store = pattern.source.replace(/[^a-z]/gi, '');
        break;
      }
    }
    
    return data;
  }

  private validateCouponData(data: Partial<CouponCreationRequest>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!data.title || data.title.length < 10) {
      errors.push('Название купона слишком короткое (минимум 10 символов)');
    }
    
    if (!data.store) {
      errors.push('Не указан магазин');
    }
    
    if (!data.discountValue && !data.couponCode) {
      errors.push('Не указана скидка или промокод');
    }
    
    if (!data.link) {
      errors.push('Не указана ссылка на товар');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
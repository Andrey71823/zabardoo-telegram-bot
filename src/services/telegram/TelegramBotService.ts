import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../../config/logger';
import { ChannelMessage } from '../../models/PersonalChannel';
import { recordTelegramApiCall } from '../../config/monitoring';

export class TelegramBotService {
  private bot: TelegramBot;

  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: false });
    logger.info('Telegram Bot Service initialized');
  }

  async createChannel(channelName: string, description: string): Promise<string> {
    try {
      // Note: Telegram Bot API doesn't directly support creating channels
      // This would typically be done through Telegram's official apps
      // For now, we'll simulate channel creation and return a mock channel ID
      
      const channelId = `@${channelName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      
      logger.info(`Simulated channel creation: ${channelId}`);
      recordTelegramApiCall('createChannel', true);
      
      return channelId;
    } catch (error) {
      logger.error('Error creating channel:', error);
      recordTelegramApiCall('createChannel', false);
      throw error;
    }
  }

  async sendMessage(channelMessage: ChannelMessage): Promise<boolean> {
    try {
      const { channelId, message, messageType, metadata } = channelMessage;

      let options: any = {};

      // Handle different message types
      switch (messageType) {
        case 'text':
          await this.bot.sendMessage(channelId, message, options);
          break;

        case 'photo':
          if (metadata?.imageUrl) {
            await this.bot.sendPhoto(channelId, metadata.imageUrl, {
              caption: message,
              ...options
            });
          } else {
            await this.bot.sendMessage(channelId, message, options);
          }
          break;

        case 'coupon':
        case 'recommendation':
          // Add inline keyboard for coupons and recommendations
          if (metadata?.buttons && metadata.buttons.length > 0) {
            options.reply_markup = {
              inline_keyboard: [
                metadata.buttons.map(button => ({
                  text: button.text,
                  url: button.url,
                  callback_data: button.callbackData
                }))
              ]
            };
          }
          await this.bot.sendMessage(channelId, message, options);
          break;

        case 'document':
          // Handle document sending if needed
          await this.bot.sendMessage(channelId, message, options);
          break;

        default:
          await this.bot.sendMessage(channelId, message, options);
      }

      logger.info(`Message sent to channel ${channelId}: ${messageType}`);
      recordTelegramApiCall('sendMessage', true);
      return true;

    } catch (error) {
      logger.error('Error sending message:', error);
      recordTelegramApiCall('sendMessage', false);
      return false;
    }
  }

  async sendBulkMessages(messages: ChannelMessage[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const message of messages) {
      try {
        const result = await this.sendMessage(message);
        if (result) {
          success++;
        } else {
          failed++;
        }
        
        // Add small delay to avoid rate limiting
        await this.delay(100);
      } catch (error) {
        failed++;
        logger.error(`Failed to send bulk message to ${message.channelId}:`, error);
      }
    }

    logger.info(`Bulk message results: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  async getChatInfo(chatId: string): Promise<any> {
    try {
      const chat = await this.bot.getChat(chatId);
      recordTelegramApiCall('getChat', true);
      return chat;
    } catch (error) {
      logger.error('Error getting chat info:', error);
      recordTelegramApiCall('getChat', false);
      throw error;
    }
  }

  async getChatMemberCount(chatId: string): Promise<number> {
    try {
      const count = await this.bot.getChatMemberCount(chatId);
      recordTelegramApiCall('getChatMemberCount', true);
      return count;
    } catch (error) {
      logger.error('Error getting chat member count:', error);
      recordTelegramApiCall('getChatMemberCount', false);
      return 0;
    }
  }

  async isChannelActive(channelId: string): Promise<boolean> {
    try {
      await this.bot.getChat(channelId);
      return true;
    } catch (error) {
      logger.warn(`Channel ${channelId} appears to be inactive:`, error);
      return false;
    }
  }

  async setWebhook(url: string): Promise<boolean> {
    try {
      await this.bot.setWebHook(url);
      logger.info(`Webhook set to: ${url}`);
      recordTelegramApiCall('setWebhook', true);
      return true;
    } catch (error) {
      logger.error('Error setting webhook:', error);
      recordTelegramApiCall('setWebhook', false);
      return false;
    }
  }

  async deleteWebhook(): Promise<boolean> {
    try {
      await this.bot.deleteWebHook();
      logger.info('Webhook deleted');
      recordTelegramApiCall('deleteWebhook', true);
      return true;
    } catch (error) {
      logger.error('Error deleting webhook:', error);
      recordTelegramApiCall('deleteWebhook', false);
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Method to handle incoming updates (for webhook)
  processUpdate(update: any): void {
    try {
      logger.debug('Processing Telegram update:', update);
      
      // Handle different types of updates
      if (update.message) {
        this.handleMessage(update.message);
      } else if (update.callback_query) {
        this.handleCallbackQuery(update.callback_query);
      } else if (update.channel_post) {
        this.handleChannelPost(update.channel_post);
      }
    } catch (error) {
      logger.error('Error processing Telegram update:', error);
    }
  }

  private handleMessage(message: any): void {
    logger.info(`Received message from ${message.from?.id}: ${message.text}`);
    // This will be handled by the Channel Manager Service
  }

  private handleCallbackQuery(callbackQuery: any): void {
    logger.info(`Received callback query: ${callbackQuery.data}`);
    // Handle button clicks
  }

  private handleChannelPost(channelPost: any): void {
    logger.info(`Received channel post: ${channelPost.text}`);
    // Handle channel posts
  }
}
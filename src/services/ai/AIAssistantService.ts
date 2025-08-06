import { BaseService } from '../base/BaseService';
import { Request, Response } from 'express';
import { AIConversationRepository } from '../../repositories/AIConversationRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { PersonalChannelRepository } from '../../repositories/PersonalChannelRepository';
import { TelegramBotService } from '../telegram/TelegramBotService';
import { OpenAIService } from './OpenAIService';
import { pgPool } from '../../config/database';
import { AIConversation, AIMessage, UserIntent, CouponRecommendation } from '../../models/AIAssistant';
import { ChannelMessage } from '../../models/PersonalChannel';
import config from '../../config';

export class AIAssistantService extends BaseService {
  private aiRepository: AIConversationRepository;
  private userRepository: UserRepository;
  private channelRepository: PersonalChannelRepository;
  private telegramBot: TelegramBotService;
  private openAIService: OpenAIService;

  constructor() {
    super('ai-assistant', 3002);
    
    this.aiRepository = new AIConversationRepository(pgPool);
    this.userRepository = new UserRepository(pgPool);
    this.channelRepository = new PersonalChannelRepository(pgPool);
    
    if (!config.apis.telegram.botToken) {
      throw new Error('Telegram bot token is required');
    }
    
    if (!config.apis.openai.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    this.telegramBot = new TelegramBotService(config.apis.telegram.botToken);
    this.openAIService = new OpenAIService(config.apis.openai.apiKey, config.apis.openai.model);
  }

  protected setupServiceRoutes(): void {
    // Conversation Management
    this.app.post('/conversations', this.createConversation.bind(this));
    this.app.get('/conversations/:userId', this.getUserConversation.bind(this));
    this.app.put('/conversations/:conversationId', this.updateConversation.bind(this));
    this.app.delete('/conversations/:conversationId', this.endConversation.bind(this));

    // Message Processing
    this.app.post('/conversations/:conversationId/messages', this.addMessage.bind(this));
    this.app.get('/conversations/:conversationId/messages', this.getMessages.bind(this));
    this.app.post('/process-message', this.processUserMessage.bind(this));

    // AI Interactions
    this.app.post('/chat', this.handleChat.bind(this));
    this.app.post('/recommend-coupons', this.recommendCoupons.bind(this));
    this.app.post('/generate-greeting', this.generateGreeting.bind(this));
    this.app.post('/analyze-intent', this.analyzeIntent.bind(this));

    // Prompt Templates
    this.app.post('/prompt-templates', this.createPromptTemplate.bind(this));
    this.app.get('/prompt-templates', this.getPromptTemplates.bind(this));
    this.app.put('/prompt-templates/:templateId', this.updatePromptTemplate.bind(this));

    // Recommendations
    this.app.get('/users/:userId/recommendations', this.getUserRecommendations.bind(this));
    this.app.post('/recommendations/:recommendationId/accept', this.acceptRecommendation.bind(this));
    this.app.post('/recommendations/:recommendationId/reject', this.rejectRecommendation.bind(this));

    // Analytics
    this.app.get('/analytics/conversations', this.getConversationAnalytics.bind(this));
    this.app.get('/analytics/recommendations', this.getRecommendationAnalytics.bind(this));
    this.app.get('/analytics/intents', this.getIntentAnalytics.bind(this));

    // Webhooks
    this.app.post('/webhook/message', this.handleIncomingMessage.bind(this));
  }

  protected async checkServiceHealth(): Promise<boolean> {
    try {
      // Test OpenAI connection
      const testResponse = await this.openAIService.generatePersonalizedGreeting({
        name: 'Test',
        preferences: ['test'],
        purchaseHistory: [],
        lifetimeValue: 0,
        churnRisk: 0
      });
      
      return testResponse.length > 0;
    } catch (error) {
      this.logger.error('AI Assistant health check failed:', error);
      return false;
    }
  }

  // Conversation Management
  private async createConversation(req: Request, res: Response): Promise<void> {
    try {
      const { userId, channelId } = req.body;
      
      if (!userId || !channelId) {
        res.status(400).json({ error: 'userId and channelId are required' });
        return;
      }

      // Get user profile
      const user = await this.userRepository.getUserById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Create conversation context
      const context = {
        userProfile: {
          name: user.firstName,
          preferences: [], // Would be loaded from user preferences
          purchaseHistory: [], // Would be loaded from purchase history
          lifetimeValue: user.lifetimeValue,
          churnRisk: user.churnRisk
        },
        conversationHistory: [],
        currentIntent: 'greeting',
        lastInteraction: new Date()
      };

      const conversation = await this.aiRepository.createConversation({
        userId,
        channelId,
        status: 'active',
        context
      });

      this.logger.info(`Created AI conversation for user ${userId}`);
      res.status(201).json(conversation);
    } catch (error) {
      this.logger.error('Error creating conversation:', error);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  }

  private async getUserConversation(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      const conversation = await this.aiRepository.getConversationByUserId(userId);
      
      if (!conversation) {
        res.status(404).json({ error: 'No active conversation found' });
        return;
      }

      res.json(conversation);
    } catch (error) {
      this.logger.error('Error getting user conversation:', error);
      res.status(500).json({ error: 'Failed to get conversation' });
    }
  }

  // Message Processing
  private async processUserMessage(req: Request, res: Response): Promise<void> {
    try {
      const { userId, message, channelId } = req.body;
      
      if (!userId || !message) {
        res.status(400).json({ error: 'userId and message are required' });
        return;
      }

      // Get or create conversation
      let conversation = await this.aiRepository.getConversationByUserId(userId);
      if (!conversation) {
        const user = await this.userRepository.getUserById(userId);
        if (!user) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        conversation = await this.aiRepository.createConversation({
          userId,
          channelId: channelId || user.personalChannelId,
          status: 'active',
          context: {
            userProfile: {
              name: user.firstName,
              preferences: [],
              purchaseHistory: [],
              lifetimeValue: user.lifetimeValue,
              churnRisk: user.churnRisk
            },
            conversationHistory: [],
            currentIntent: 'greeting',
            lastInteraction: new Date()
          }
        });
      }

      // Add user message
      const userMessage = await this.aiRepository.addMessage({
        conversationId: conversation.id,
        role: 'user',
        content: message,
        messageType: 'text',
        metadata: {}
      });

      // Get conversation history
      const messages = await this.aiRepository.getRecentMessages(conversation.id, 10);

      // Generate AI response
      const aiResponse = await this.openAIService.generateResponse(
        messages,
        conversation.context
      );

      // Add AI response message
      const assistantMessage = await this.aiRepository.addMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.response,
        messageType: aiResponse.intent.intent === 'coupon_search' ? 'coupon_recommendation' : 'text',
        metadata: {
          intent: aiResponse.intent.intent,
          confidence: aiResponse.intent.confidence,
          entities: aiResponse.intent.entities,
          recommendations: aiResponse.recommendations
        }
      });

      // Update conversation context
      await this.aiRepository.updateConversation(conversation.id, {
        context: {
          ...conversation.context,
          currentIntent: aiResponse.intent.intent,
          lastInteraction: new Date()
        }
      });

      // Send response to Telegram
      if (channelId) {
        await this.telegramBot.sendMessage({
          channelId,
          message: aiResponse.response,
          messageType: 'text'
        });
      }

      res.json({
        conversation: conversation.id,
        userMessage,
        assistantMessage,
        intent: aiResponse.intent,
        recommendations: aiResponse.recommendations
      });

    } catch (error) {
      this.logger.error('Error processing user message:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  }

  // AI Interactions
  private async handleChat(req: Request, res: Response): Promise<void> {
    try {
      const { userId, message } = req.body;
      
      if (!userId || !message) {
        res.status(400).json({ error: 'userId and message are required' });
        return;
      }

      // Process the message and get response
      const result = await this.processUserMessage(req, res);
      
    } catch (error) {
      this.logger.error('Error handling chat:', error);
      res.status(500).json({ error: 'Failed to handle chat' });
    }
  }

  private async recommendCoupons(req: Request, res: Response): Promise<void> {
    try {
      const { userId, availableCoupons } = req.body;
      
      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const user = await this.userRepository.getUserById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const userProfile = {
        name: user.firstName,
        preferences: [], // Load from user preferences
        purchaseHistory: [], // Load from purchase history
        lifetimeValue: user.lifetimeValue,
        churnRisk: user.churnRisk
      };

      const recommendation = await this.openAIService.generateCouponRecommendation(
        userProfile,
        availableCoupons || []
      );

      // Record recommendations
      for (const couponId of recommendation.recommendedCoupons) {
        await this.aiRepository.recordRecommendation({
          userId,
          couponId,
          recommendationReason: 'AI-generated personalized recommendation',
          confidence: 0.8,
          personalizedMessage: recommendation.personalizedMessage,
          metadata: {
            userPreferences: userProfile.preferences,
            matchingFactors: ['AI analysis'],
            discountValue: 0,
            store: 'Various',
            category: 'Mixed'
          }
        });
      }

      res.json(recommendation);
    } catch (error) {
      this.logger.error('Error recommending coupons:', error);
      res.status(500).json({ error: 'Failed to recommend coupons' });
    }
  }

  private async generateGreeting(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const user = await this.userRepository.getUserById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const userProfile = {
        name: user.firstName,
        preferences: [],
        purchaseHistory: [],
        lifetimeValue: user.lifetimeValue,
        churnRisk: user.churnRisk
      };

      const greeting = await this.openAIService.generatePersonalizedGreeting(userProfile);

      res.json({ greeting });
    } catch (error) {
      this.logger.error('Error generating greeting:', error);
      res.status(500).json({ error: 'Failed to generate greeting' });
    }
  }

  private async analyzeIntent(req: Request, res: Response): Promise<void> {
    try {
      const { message } = req.body;
      
      if (!message) {
        res.status(400).json({ error: 'message is required' });
        return;
      }

      const intent = await this.openAIService.extractIntent(message);

      res.json({ intent });
    } catch (error) {
      this.logger.error('Error analyzing intent:', error);
      res.status(500).json({ error: 'Failed to analyze intent' });
    }
  }

  // Recommendations
  private async getUserRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const recommendations = await this.aiRepository.getUserRecommendations(userId, limit);
      
      res.json({ recommendations, count: recommendations.length });
    } catch (error) {
      this.logger.error('Error getting user recommendations:', error);
      res.status(500).json({ error: 'Failed to get recommendations' });
    }
  }

  private async acceptRecommendation(req: Request, res: Response): Promise<void> {
    try {
      const { recommendationId } = req.params;
      
      const recommendation = await this.aiRepository.updateRecommendationAcceptance(
        recommendationId,
        true
      );
      
      if (!recommendation) {
        res.status(404).json({ error: 'Recommendation not found' });
        return;
      }

      res.json({ success: true, recommendation });
    } catch (error) {
      this.logger.error('Error accepting recommendation:', error);
      res.status(500).json({ error: 'Failed to accept recommendation' });
    }
  }

  private async rejectRecommendation(req: Request, res: Response): Promise<void> {
    try {
      const { recommendationId } = req.params;
      
      const recommendation = await this.aiRepository.updateRecommendationAcceptance(
        recommendationId,
        false
      );
      
      if (!recommendation) {
        res.status(404).json({ error: 'Recommendation not found' });
        return;
      }

      res.json({ success: true, recommendation });
    } catch (error) {
      this.logger.error('Error rejecting recommendation:', error);
      res.status(500).json({ error: 'Failed to reject recommendation' });
    }
  }

  // Analytics
  private async getConversationAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      const analytics = await this.aiRepository.getConversationAnalytics(startDate, endDate);
      
      res.json({
        period: { startDate, endDate },
        analytics
      });
    } catch (error) {
      this.logger.error('Error getting conversation analytics:', error);
      res.status(500).json({ error: 'Failed to get conversation analytics' });
    }
  }

  private async getRecommendationAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      const analytics = await this.aiRepository.getRecommendationAnalytics(startDate, endDate);
      
      res.json({
        period: { startDate, endDate },
        analytics
      });
    } catch (error) {
      this.logger.error('Error getting recommendation analytics:', error);
      res.status(500).json({ error: 'Failed to get recommendation analytics' });
    }
  }

  // Webhook Handler
  private async handleIncomingMessage(req: Request, res: Response): Promise<void> {
    try {
      const { userId, message, channelId } = req.body;
      
      // Process the incoming message
      await this.processUserMessage(req, res);
      
    } catch (error) {
      this.logger.error('Error handling incoming message:', error);
      res.status(500).json({ error: 'Failed to handle incoming message' });
    }
  }

  // Placeholder methods for missing endpoints
  private async updateConversation(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Update conversation not implemented yet' });
  }

  private async endConversation(req: Request, res: Response): Promise<void> {
    res.json({ message: 'End conversation not implemented yet' });
  }

  private async addMessage(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Add message not implemented yet' });
  }

  private async getMessages(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Get messages not implemented yet' });
  }

  private async createPromptTemplate(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Create prompt template not implemented yet' });
  }

  private async getPromptTemplates(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Get prompt templates not implemented yet' });
  }

  private async updatePromptTemplate(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Update prompt template not implemented yet' });
  }

  private async getIntentAnalytics(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Intent analytics not implemented yet' });
  }
}

// Start service if run directly
if (require.main === module) {
  const service = new AIAssistantService();
  service.setupGracefulShutdown();
  service.start();
}
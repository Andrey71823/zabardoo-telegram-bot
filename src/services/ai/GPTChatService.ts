import { EventEmitter } from 'events';
import { logger } from '../../config/logger';

export interface ChatPersonality {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  emoji: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  response: string;
  personality: string;
  timestamp: Date;
}

export class GPTChatService extends EventEmitter {
  private personalities: Map<string, ChatPersonality> = new Map();
  private userConversations: Map<string, ChatMessage[]> = new Map();
  private userPersonalities: Map<string, string> = new Map();

  constructor() {
    super();
    this.initializePersonalities();
    logger.info('GPTChatService initialized with 3 personalities');
  }

  private initializePersonalities(): void {
    const personalities: ChatPersonality[] = [
      {
        id: 'cool',
        name: 'Cool bazaarGuru',
        description: 'Relaxed, trendy, uses modern slang',
        emoji: '😎',
        systemPrompt: `You are Cool bazaarGuru, a trendy and relaxed AI assistant for deal discovery in India. 
        You speak in a cool, modern way using current slang and emojis. You're knowledgeable about the latest trends, 
        brands, and what's popular among young Indians. Keep responses casual but helpful.`
      },
      {
        id: 'funny',
        name: 'Funny bazaarGuru',
        description: 'Humorous, witty, makes jokes',
        emoji: '😂',
        systemPrompt: `You are Funny bazaarGuru, a humorous AI assistant for deal discovery in India. 
        You love making jokes, puns, and keeping things light and entertaining. You use humor to make 
        deal hunting fun and engaging. Include funny observations about shopping and saving money.`
      },
      {
        id: 'informative',
        name: 'Expert bazaarGuru',
        description: 'Professional, detailed, educational',
        emoji: '🤓',
        systemPrompt: `You are Expert bazaarGuru, a professional and knowledgeable AI assistant for deal discovery in India. 
        You provide detailed, accurate information about products, deals, and shopping strategies. 
        You're educational and help users make informed decisions with facts and analysis.`
      }
    ];

    personalities.forEach(p => this.personalities.set(p.id, p));
  }

  async processMessage(userId: string, message: string, personalityId?: string): Promise<string> {
    try {
      // Get or set user's preferred personality
      if (personalityId) {
        this.userPersonalities.set(userId, personalityId);
      }
      
      const currentPersonality = this.userPersonalities.get(userId) || 'cool';
      const personality = this.personalities.get(currentPersonality);
      
      if (!personality) {
        throw new Error('Invalid personality');
      }

      // Get conversation history
      const history = this.userConversations.get(userId) || [];
      
      // Simulate GPT response (in production, call OpenAI API)
      const response = await this.generateResponse(message, personality, history);
      
      // Save conversation
      const chatMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        message,
        response,
        personality: currentPersonality,
        timestamp: new Date()
      };
      
      history.push(chatMessage);
      this.userConversations.set(userId, history.slice(-10)); // Keep last 10 messages
      
      logger.info(`GPT Chat: User ${userId} with ${personality.name}`);
      return response;
      
    } catch (error) {
      logger.error('GPTChatService error:', error);
      return 'Sorry, I encountered an error. Please try again! 😅';
    }
  }

  private async generateResponse(message: string, personality: ChatPersonality, history: ChatMessage[]): Promise<string> {
    // Mock GPT response based on personality
    const responses = {
      cool: [
        `Yo! That's a solid question! 😎 Let me break it down for you...`,
        `Dude, I got you covered! 🔥 Here's what's trending...`,
        `Ayy, that's what I'm talking about! 💯 Check this out...`,
        `Bro, you're asking the right questions! 🚀 Here's the deal...`
      ],
      funny: [
        `Haha, great question! 😂 Let me crack this deal code for you...`,
        `LOL, you're speaking my language! 🤣 Here's what I found...`,
        `That's funnier than my bank balance! 😆 But seriously, here's the scoop...`,
        `You know what's not a joke? These amazing deals! 😂 Check it out...`
      ],
      informative: [
        `Excellent question! 🤓 Based on my analysis, here's what you need to know...`,
        `That's a very insightful query. 📊 Let me provide you with detailed information...`,
        `I appreciate your thorough approach! 📚 Here are the key facts...`,
        `Great analytical thinking! 🔍 Allow me to explain the details...`
      ]
    };

    const personalityResponses = responses[personality.id as keyof typeof responses] || responses.cool;
    const baseResponse = personalityResponses[Math.floor(Math.random() * personalityResponses.length)];
    
    // Add context based on message content
    if (message.toLowerCase().includes('deal') || message.toLowerCase().includes('discount')) {
      return `${baseResponse}\n\n🎯 I found some amazing deals that match what you're looking for! The best part? You can earn cashback too! Want me to show you the top picks?`;
    } else if (message.toLowerCase().includes('help') || message.toLowerCase().includes('how')) {
      return `${baseResponse}\n\n💡 I'm here to help you save money and find the best deals in India! You can ask me about specific products, compare prices, or just chat about shopping. What would you like to know?`;
    } else {
      return `${baseResponse}\n\n🛍️ I love talking about deals and savings! Is there a specific product or store you're interested in? I can help you find the best offers and cashback opportunities!`;
    }
  }

  getPersonalities(): ChatPersonality[] {
    return Array.from(this.personalities.values());
  }

  getUserPersonality(userId: string): string {
    return this.userPersonalities.get(userId) || 'cool';
  }

  setUserPersonality(userId: string, personalityId: string): boolean {
    if (this.personalities.has(personalityId)) {
      this.userPersonalities.set(userId, personalityId);
      return true;
    }
    return false;
  }

  getUserConversationHistory(userId: string): ChatMessage[] {
    return this.userConversations.get(userId) || [];
  }

  clearUserHistory(userId: string): void {
    this.userConversations.delete(userId);
  }

  getStats(): any {
    return {
      totalPersonalities: this.personalities.size,
      activeUsers: this.userConversations.size,
      totalMessages: Array.from(this.userConversations.values()).reduce((sum, conv) => sum + conv.length, 0)
    };
  }
}
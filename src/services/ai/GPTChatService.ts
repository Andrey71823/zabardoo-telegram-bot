import { BaseService } from '../base/BaseService';
import { OpenAIService } from './OpenAIService';

interface ChatContext {
  userId: string;
  conversationHistory: ChatMessage[];
  userPreferences: UserPreferences;
  personality: 'cool' | 'funny' | 'informative';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface UserPreferences {
  favoriteCategories: string[];
  priceRange: { min: number; max: number };
  preferredStores: string[];
  language: 'en' | 'hi';
}

interface ChatResponse {
  message: string;
  suggestions?: string[];
  deals?: any[];
  actions?: ChatAction[];
}

interface ChatAction {
  type: 'show_deals' | 'add_favorite' | 'calculate_cashback' | 'show_profile';
  data: any;
}

export class GPTChatService extends BaseService {
  private openAIService: OpenAIService;
  private chatContexts: Map<string, ChatContext> = new Map();
  
  private promptTemplates = {
    cool: `You are Zabardoo, a cool and trendy AI assistant for deal discovery in India. 
    You help users find the best coupons and deals. Be casual, use modern slang, and keep it short.
    Always suggest specific deals when relevant. Use emojis sparingly but effectively.`,
    
    funny: `You are Zabardoo, a witty and humorous AI assistant for deal discovery in India.
    Make jokes about expensive prices, celebrate great deals, and keep users entertained.
    Use Indian humor and references. Always be helpful while being funny.`,
    
    informative: `You are Zabardoo, a knowledgeable and professional AI assistant for deal discovery in India.
    Provide detailed information about deals, cashback rates, and saving strategies.
    Be thorough and educational in your responses.`
  };

  private commonPrompts = {
    'best_gift_girlfriend': 'Find me the best gift deals for my girlfriend',
    'deals_groceries': 'Show me the best grocery deals available now',
    'best_cashback': 'Where can I get the best cashback rates right now?',
    'compare_stores': 'Compare cashback rates between different stores',
    'seasonal_deals': 'What are the best seasonal deals available?'
  };

  constructor() {
    super();
    this.openAIService = new OpenAIService();
  }

  async initializeChat(userId: string, preferences: UserPreferences): Promise<void> {
    const context: ChatContext = {
      userId,
      conversationHistory: [],
      userPreferences: preferences,
      personality: 'cool' // Default personality
    };
    
    this.chatContexts.set(userId, context);
    
    // Send welcome message
    const welcomeMessage = await this.generateWelcomeMessage(context);
    context.conversationHistory.push({
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date()
    });
  }

  async processMessage(userId: string, message: string): Promise<ChatResponse> {
    const context = this.chatContexts.get(userId);
    if (!context) {
      throw new Error('Chat context not found. Please initialize chat first.');
    }

    // Add user message to history
    context.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Check for common prompts
    const commonPrompt = this.detectCommonPrompt(message);
    if (commonPrompt) {
      return await this.handleCommonPrompt(context, commonPrompt);
    }

    // Generate AI response
    const response = await this.generateAIResponse(context, message);
    
    // Add assistant response to history
    context.conversationHistory.push({
      role: 'assistant',
      content: response.message,
      timestamp: new Date()
    });

    // Keep conversation history manageable (last 20 messages)
    if (context.conversationHistory.length > 20) {
      context.conversationHistory = context.conversationHistory.slice(-20);
    }

    return response;
  }

  async setPersonality(userId: string, personality: 'cool' | 'funny' | 'informative'): Promise<void> {
    const context = this.chatContexts.get(userId);
    if (context) {
      context.personality = personality;
    }
  }

  private async generateWelcomeMessage(context: ChatContext): Promise<string> {
    const { personality, userPreferences } = context;
    
    const personalityGreetings = {
      cool: "Hey! 👋 I'm Zabardoo, your deal-hunting buddy. What's up?",
      funny: "Namaste! 🙏 I'm Zabardoo, here to save your wallet from crying! 😄",
      informative: "Hello! I'm Zabardoo, your comprehensive deal discovery assistant."
    };

    return personalityGreetings[personality];
  }

  private detectCommonPrompt(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    for (const [key, prompt] of Object.entries(this.commonPrompts)) {
      if (lowerMessage.includes(key.replace('_', ' ')) || 
          lowerMessage.includes(prompt.toLowerCase().substring(0, 20))) {
        return key;
      }
    }
    
    return null;
  }

  private async handleCommonPrompt(context: ChatContext, promptKey: string): Promise<ChatResponse> {
    const responses = {
      'best_gift_girlfriend': {
        message: "Great choice! 💝 Here are some amazing gift deals for your girlfriend:",
        deals: [
          { name: "Nykaa Beauty Box", discount: "40% OFF", price: "₹1,199", cashback: "8%" },
          { name: "Myntra Fashion Jewelry", discount: "50% OFF", price: "₹899", cashback: "5%" },
          { name: "Amazon Perfume Collection", discount: "35% OFF", price: "₹2,499", cashback: "6%" }
        ],
        suggestions: ["Show more beauty deals", "Find jewelry offers", "Romantic dinner deals"]
      },
      
      'deals_groceries': {
        message: "🛒 Fresh grocery deals just for you:",
        deals: [
          { name: "BigBasket Essentials", discount: "25% OFF", price: "₹1,500", cashback: "3%" },
          { name: "Grofers Weekly Pack", discount: "30% OFF", price: "₹2,200", cashback: "4%" },
          { name: "Amazon Fresh Bundle", discount: "20% OFF", price: "₹1,800", cashback: "5%" }
        ],
        suggestions: ["Show organic options", "Find bulk deals", "Compare delivery times"]
      },
      
      'best_cashback': {
        message: "💰 Here are the highest cashback rates right now:",
        deals: [
          { name: "Flipkart Electronics", discount: "Up to 70% OFF", cashback: "12%" },
          { name: "Myntra Fashion", discount: "Up to 60% OFF", cashback: "10%" },
          { name: "Nykaa Beauty", discount: "Up to 50% OFF", cashback: "8%" }
        ],
        suggestions: ["Compare all stores", "Set cashback alerts", "Calculate potential savings"]
      }
    };

    return responses[promptKey] || {
      message: "I can help you with that! Let me find the best deals for you.",
      suggestions: ["Show popular deals", "Find category deals", "Get personalized recommendations"]
    };
  }

  private async generateAIResponse(context: ChatContext, message: string): Promise<ChatResponse> {
    const { personality, userPreferences, conversationHistory } = context;
    
    // Build conversation context for GPT
    const conversationContext = conversationHistory
      .slice(-10) // Last 10 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const systemPrompt = `${this.promptTemplates[personality]}

User preferences:
- Favorite categories: ${userPreferences.favoriteCategories.join(', ')}
- Price range: ₹${userPreferences.priceRange.min} - ₹${userPreferences.priceRange.max}
- Preferred stores: ${userPreferences.preferredStores.join(', ')}
- Language: ${userPreferences.language}

Recent conversation:
${conversationContext}

Current user message: ${message}

Respond as Zabardoo. If the user asks about deals, suggest specific Indian stores and realistic prices in rupees.
If they ask about cashback, mention realistic percentages (1-12%).
Keep responses under 200 words and always be helpful.`;

    try {
      const aiResponse = await this.openAIService.generateResponse(systemPrompt);
      
      // Parse response for actions
      const actions = this.extractActions(aiResponse);
      const deals = this.extractDeals(aiResponse);
      const suggestions = this.generateSuggestions(message);

      return {
        message: aiResponse,
        suggestions,
        deals,
        actions
      };
    } catch (error) {
      console.error('GPT API error:', error);
      
      // Fallback response
      return {
        message: "I'm having trouble connecting right now, but I can still help! What specific deals are you looking for?",
        suggestions: ["Electronics deals", "Fashion offers", "Food discounts", "Beauty products"]
      };
    }
  }

  private extractActions(response: string): ChatAction[] {
    const actions: ChatAction[] = [];
    
    if (response.toLowerCase().includes('show deals') || response.toLowerCase().includes('find deals')) {
      actions.push({ type: 'show_deals', data: {} });
    }
    
    if (response.toLowerCase().includes('add to favorites') || response.toLowerCase().includes('save this')) {
      actions.push({ type: 'add_favorite', data: {} });
    }
    
    if (response.toLowerCase().includes('cashback') || response.toLowerCase().includes('calculate')) {
      actions.push({ type: 'calculate_cashback', data: {} });
    }
    
    return actions;
  }

  private extractDeals(response: string): any[] {
    // Simple deal extraction - in production, this would be more sophisticated
    const deals = [];
    
    if (response.includes('₹')) {
      // Extract price mentions and create deal objects
      const priceMatches = response.match(/₹[\d,]+/g);
      if (priceMatches) {
        priceMatches.forEach((price, index) => {
          deals.push({
            name: `Deal ${index + 1}`,
            price: price,
            discount: '20% OFF',
            cashback: '5%'
          });
        });
      }
    }
    
    return deals;
  }

  private generateSuggestions(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('electronics') || lowerMessage.includes('phone') || lowerMessage.includes('laptop')) {
      return ["Show phone deals", "Find laptop offers", "Electronics cashback", "Compare prices"];
    }
    
    if (lowerMessage.includes('fashion') || lowerMessage.includes('clothes') || lowerMessage.includes('shoes')) {
      return ["Fashion deals", "Shoe offers", "Clothing discounts", "Accessories"];
    }
    
    if (lowerMessage.includes('food') || lowerMessage.includes('restaurant') || lowerMessage.includes('grocery')) {
      return ["Restaurant deals", "Grocery offers", "Food delivery", "Bulk discounts"];
    }
    
    return ["Popular deals", "Best cashback", "New offers", "My favorites"];
  }

  async getChatHistory(userId: string): Promise<ChatMessage[]> {
    const context = this.chatContexts.get(userId);
    return context ? context.conversationHistory : [];
  }

  async clearChatHistory(userId: string): Promise<void> {
    const context = this.chatContexts.get(userId);
    if (context) {
      context.conversationHistory = [];
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    const context = this.chatContexts.get(userId);
    if (context) {
      context.userPreferences = { ...context.userPreferences, ...preferences };
    }
  }

  async getActiveChats(): Promise<string[]> {
    return Array.from(this.chatContexts.keys());
  }

  async analyzeUserIntent(message: string): Promise<{
    intent: string;
    entities: any[];
    confidence: number;
  }> {
    // Simple intent analysis - in production, use NLP libraries
    const intents = {
      'find_deals': ['deal', 'offer', 'discount', 'coupon', 'sale'],
      'compare_prices': ['compare', 'vs', 'versus', 'better', 'cheaper'],
      'cashback_info': ['cashback', 'money back', 'refund', 'earn'],
      'product_search': ['find', 'search', 'looking for', 'need', 'want'],
      'help': ['help', 'how', 'what', 'explain', 'guide']
    };

    const lowerMessage = message.toLowerCase();
    let bestIntent = 'general';
    let maxMatches = 0;

    for (const [intent, keywords] of Object.entries(intents)) {
      const matches = keywords.filter(keyword => lowerMessage.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestIntent = intent;
      }
    }

    return {
      intent: bestIntent,
      entities: [], // Would extract entities like product names, prices, etc.
      confidence: maxMatches > 0 ? Math.min(maxMatches / 3, 1) : 0.1
    };
  }
}
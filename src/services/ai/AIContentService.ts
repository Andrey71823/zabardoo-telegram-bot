import { BaseService } from '../base/BaseService';
import { OpenAIService } from './OpenAIService';

interface ContentRequest {
  type: 'instagram_caption' | 'meme' | 'tiktok_script' | 'hashtags' | 'emoji_suggestion';
  context: {
    dealTitle?: string;
    storeName?: string;
    discount?: string;
    price?: string;
    category?: string;
    occasion?: string;
    mood?: 'funny' | 'exciting' | 'professional' | 'trendy';
    language?: string;
  };
  customPrompt?: string;
}

interface ContentResponse {
  content: string;
  hashtags?: string[];
  emojis?: string[];
  alternatives?: string[];
  metadata: {
    type: string;
    generatedAt: Date;
    language: string;
    mood: string;
  };
}

interface MemeTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  placeholders: string[];
  category: 'deal' | 'shopping' | 'savings' | 'funny' | 'trending';
  popularity: number;
}

interface InstagramTemplate {
  id: string;
  name: string;
  structure: string;
  occasion: string[];
  mood: string;
  example: string;
}

export class AIContentService extends BaseService {
  private openAIService: OpenAIService;
  private memeTemplates: Map<string, MemeTemplate> = new Map();
  private instagramTemplates: Map<string, InstagramTemplate> = new Map();
  private contentCache: Map<string, ContentResponse> = new Map();

  constructor() {
    super();
    this.openAIService = new OpenAIService();
    this.initializeMemeTemplates();
    this.initializeInstagramTemplates();
  }

  private initializeMemeTemplates(): void {
    const templates: MemeTemplate[] = [
      {
        id: 'drake_pointing',
        name: 'Drake Pointing',
        description: 'Drake rejecting vs approving format',
        template: 'Drake rejecting: {reject}\nDrake pointing: {approve}',
        placeholders: ['reject', 'approve'],
        category: 'deal',
        popularity: 95
      },
      {
        id: 'distracted_boyfriend',
        name: 'Distracted Boyfriend',
        description: 'Guy looking at another girl format',
        template: 'Boyfriend: {person}\nGirlfriend: {old_thing}\nOther girl: {new_thing}',
        placeholders: ['person', 'old_thing', 'new_thing'],
        category: 'shopping',
        popularity: 90
      },
      {
        id: 'expanding_brain',
        name: 'Expanding Brain',
        description: 'Four levels of enlightenment',
        template: 'Small brain: {level1}\nNormal brain: {level2}\nGlowing brain: {level3}\nGalaxy brain: {level4}',
        placeholders: ['level1', 'level2', 'level3', 'level4'],
        category: 'savings',
        popularity: 85
      },
      {
        id: 'woman_yelling_cat',
        name: 'Woman Yelling at Cat',
        description: 'Woman pointing vs confused cat',
        template: 'Woman: {complaint}\nCat: {response}',
        placeholders: ['complaint', 'response'],
        category: 'funny',
        popularity: 88
      },
      {
        id: 'this_is_fine',
        name: 'This is Fine',
        description: 'Dog in burning room saying everything is fine',
        template: 'Dog in fire: "{situation}"\nActual situation: {reality}',
        placeholders: ['situation', 'reality'],
        category: 'trending',
        popularity: 82
      }
    ];

    templates.forEach(template => {
      this.memeTemplates.set(template.id, template);
    });
  }

  private initializeInstagramTemplates(): void {
    const templates: InstagramTemplate[] = [
      {
        id: 'deal_announcement',
        name: 'Deal Announcement',
        structure: '{hook} {deal_details} {call_to_action} {hashtags}',
        occasion: ['sale', 'discount', 'new_product'],
        mood: 'exciting',
        example: '🔥 FLASH SALE ALERT! Get the Samsung Galaxy S24 at 28% OFF! Only ₹52,000 (was ₹72,000) + 8% cashback! 💰 Don\'t miss out - limited time only! 🏃‍♂️💨 #SamsungDeals #FlashSale #TechDeals #Savings'
      },
      {
        id: 'lifestyle_inspiration',
        name: 'Lifestyle Inspiration',
        structure: '{inspiration_quote} {product_connection} {lifestyle_benefit} {hashtags}',
        occasion: ['fashion', 'beauty', 'lifestyle'],
        mood: 'trendy',
        example: '✨ "Style is a way to say who you are without having to speak" ✨ Elevate your wardrobe with Zara\'s summer collection at 60% OFF! 👗 Express yourself for less 💫 #StyleInspiration #ZaraDeals #FashionForLess #SummerStyle'
      },
      {
        id: 'savings_celebration',
        name: 'Savings Celebration',
        structure: '{celebration} {savings_amount} {achievement} {motivation} {hashtags}',
        occasion: ['cashback', 'big_savings', 'milestone'],
        mood: 'exciting',
        example: '🎉 CELEBRATION TIME! Just saved ₹20,000 on my MacBook Air M3! 💻✨ That\'s a whole vacation fund right there! 🏖️ Who else is winning at the savings game? 💪 #SavingsWin #MacBookDeals #SmartShopping #MoneyGoals'
      },
      {
        id: 'tutorial_tips',
        name: 'Tutorial & Tips',
        structure: '{tip_intro} {step_by_step} {pro_tip} {hashtags}',
        occasion: ['how_to', 'tips', 'guide'],
        mood: 'professional',
        example: '💡 PRO TIP: How to maximize your cashback! 1️⃣ Stack store discounts with cashback offers 2️⃣ Use voice search for better deals 3️⃣ Set price alerts for wishlist items 🎯 Result: Save up to 50% more! #CashbackTips #SmartShopping #MoneyHacks #SavingsStrategy'
      },
      {
        id: 'funny_relatable',
        name: 'Funny & Relatable',
        structure: '{relatable_situation} {funny_twist} {product_solution} {hashtags}',
        occasion: ['humor', 'relatable', 'everyday'],
        mood: 'funny',
        example: '😅 Me: "I don\'t need anything from this sale" Also me: *adds 15 items to cart* 🛒 But hey, at least I got 40% OFF on everything! 🤷‍♀️💸 #ShoppingStruggles #SaleAddict #RelatableContent #ShoppingMemes'
      }
    ];

    templates.forEach(template => {
      this.instagramTemplates.set(template.id, template);
    });
  }

  // Main content generation methods
  async generateInstagramCaption(request: ContentRequest): Promise<ContentResponse> {
    const cacheKey = this.generateCacheKey(request);
    const cached = this.contentCache.get(cacheKey);
    if (cached) return cached;

    const { context } = request;
    const mood = context.mood || 'exciting';
    const language = context.language || 'en';

    // Select appropriate template
    const template = this.selectInstagramTemplate(context);
    
    // Generate content using AI
    const prompt = this.buildInstagramPrompt(context, template, mood, language);
    
    try {
      const aiResponse = await this.openAIService.generateResponse(prompt);
      const hashtags = this.generateHashtags(context);
      const emojis = this.suggestEmojis(context);
      
      const response: ContentResponse = {
        content: aiResponse,
        hashtags,
        emojis,
        alternatives: await this.generateAlternatives(prompt, 2),
        metadata: {
          type: 'instagram_caption',
          generatedAt: new Date(),
          language,
          mood
        }
      };

      this.contentCache.set(cacheKey, response);
      return response;
    } catch (error) {
      // Fallback to template-based generation
      return this.generateFallbackInstagramCaption(context, template, mood);
    }
  }

  async generateMeme(request: ContentRequest): Promise<ContentResponse> {
    const cacheKey = this.generateCacheKey(request);
    const cached = this.contentCache.get(cacheKey);
    if (cached) return cached;

    const { context } = request;
    const mood = context.mood || 'funny';
    const language = context.language || 'en';

    // Select meme template
    const template = this.selectMemeTemplate(context);
    
    // Generate meme content
    const prompt = this.buildMemePrompt(context, template, mood, language);
    
    try {
      const aiResponse = await this.openAIService.generateResponse(prompt);
      
      const response: ContentResponse = {
        content: this.formatMemeContent(aiResponse, template),
        alternatives: await this.generateMemeAlternatives(context, template, 3),
        metadata: {
          type: 'meme',
          generatedAt: new Date(),
          language,
          mood
        }
      };

      this.contentCache.set(cacheKey, response);
      return response;
    } catch (error) {
      // Fallback to template-based generation
      return this.generateFallbackMeme(context, template);
    }
  }

  async generateTikTokScript(request: ContentRequest): Promise<ContentResponse> {
    const { context } = request;
    const mood = context.mood || 'trendy';
    const language = context.language || 'en';

    const prompt = `Create a 30-60 second TikTok script about ${context.dealTitle} from ${context.storeName} with ${context.discount} discount.
    
    Requirements:
    - Hook viewers in first 3 seconds
    - Include trending phrases and sounds
    - Show the deal value clearly
    - End with strong call-to-action
    - Mood: ${mood}
    - Language: ${language}
    
    Format as: [Scene 1] [Scene 2] [Scene 3] with timing and actions.`;

    try {
      const aiResponse = await this.openAIService.generateResponse(prompt);
      
      return {
        content: aiResponse,
        hashtags: this.generateTikTokHashtags(context),
        alternatives: await this.generateAlternatives(prompt, 2),
        metadata: {
          type: 'tiktok_script',
          generatedAt: new Date(),
          language,
          mood
        }
      };
    } catch (error) {
      return this.generateFallbackTikTokScript(context);
    }
  }

  async generateHashtagSuggestions(request: ContentRequest): Promise<ContentResponse> {
    const { context } = request;
    const hashtags = this.generateHashtags(context);
    
    // Categorize hashtags
    const categorizedHashtags = {
      trending: hashtags.slice(0, 5),
      niche: hashtags.slice(5, 10),
      branded: hashtags.slice(10, 15),
      location: ['#IndiaDeals', '#MumbaiShopping', '#DelhiOffers'],
      community: ['#DealHunters', '#SavingsSquad', '#ShopSmart']
    };

    return {
      content: JSON.stringify(categorizedHashtags, null, 2),
      hashtags: hashtags,
      metadata: {
        type: 'hashtags',
        generatedAt: new Date(),
        language: context.language || 'en',
        mood: context.mood || 'professional'
      }
    };
  }

  async generateEmojiSuggestions(request: ContentRequest): Promise<ContentResponse> {
    const { context } = request;
    const emojis = this.suggestEmojis(context);
    
    const categorizedEmojis = {
      deals: ['🔥', '💥', '⚡', '🎯', '💰'],
      shopping: ['🛒', '🛍️', '💳', '🏪', '🎁'],
      emotions: ['😍', '🤩', '😱', '🥳', '💪'],
      categories: this.getCategoryEmojis(context.category),
      celebrations: ['🎉', '🎊', '✨', '🌟', '🚀']
    };

    return {
      content: JSON.stringify(categorizedEmojis, null, 2),
      emojis: emojis,
      metadata: {
        type: 'emoji_suggestion',
        generatedAt: new Date(),
        language: context.language || 'en',
        mood: context.mood || 'exciting'
      }
    };
  }

  // Helper methods
  private selectInstagramTemplate(context: any): InstagramTemplate {
    const templates = Array.from(this.instagramTemplates.values());
    
    // Filter by occasion
    let filtered = templates;
    if (context.occasion) {
      filtered = templates.filter(t => t.occasion.includes(context.occasion));
    }
    
    // Filter by mood
    if (context.mood && filtered.length > 1) {
      const moodFiltered = filtered.filter(t => t.mood === context.mood);
      if (moodFiltered.length > 0) {
        filtered = moodFiltered;
      }
    }
    
    // Return random from filtered or default
    return filtered[Math.floor(Math.random() * filtered.length)] || templates[0];
  }

  private selectMemeTemplate(context: any): MemeTemplate {
    const templates = Array.from(this.memeTemplates.values());
    
    // Filter by category
    let filtered = templates;
    if (context.category) {
      const categoryMap = {
        'electronics': 'deal',
        'fashion': 'shopping',
        'beauty': 'shopping',
        'food': 'funny'
      };
      const memeCategory = categoryMap[context.category as keyof typeof categoryMap] || 'deal';
      filtered = templates.filter(t => t.category === memeCategory);
    }
    
    // Sort by popularity and return top choice
    filtered.sort((a, b) => b.popularity - a.popularity);
    return filtered[0] || templates[0];
  }

  private buildInstagramPrompt(context: any, template: InstagramTemplate, mood: string, language: string): string {
    return `Create an engaging Instagram caption for a ${context.category} deal.
    
    Deal Details:
    - Product: ${context.dealTitle}
    - Store: ${context.storeName}
    - Discount: ${context.discount}
    - Price: ${context.price}
    - Occasion: ${context.occasion || 'general sale'}
    
    Requirements:
    - Mood: ${mood}
    - Language: ${language}
    - Include relevant emojis
    - Create urgency and excitement
    - Add value proposition
    - Keep under 150 words
    - End with call-to-action
    
    Template structure: ${template.structure}
    Example style: ${template.example}
    
    Generate 1 compelling caption:`;
  }

  private buildMemePrompt(context: any, template: MemeTemplate, mood: string, language: string): string {
    return `Create a funny meme about shopping/deals using the "${template.name}" format.
    
    Context:
    - Deal: ${context.dealTitle} at ${context.discount} off
    - Store: ${context.storeName}
    - Make it relatable to Indian shoppers
    - Mood: ${mood}
    - Language: ${language}
    
    Template: ${template.template}
    Placeholders to fill: ${template.placeholders.join(', ')}
    
    Create content for each placeholder that's funny and relevant to the deal.`;
  }

  private generateHashtags(context: any): string[] {
    const baseHashtags = ['#Deals', '#Savings', '#Shopping', '#Cashback', '#India'];
    
    // Category-specific hashtags
    const categoryHashtags = {
      electronics: ['#TechDeals', '#Electronics', '#Gadgets', '#TechSavings'],
      fashion: ['#FashionDeals', '#Style', '#Fashion', '#Clothing'],
      beauty: ['#BeautyDeals', '#Makeup', '#Skincare', '#Beauty'],
      food: ['#FoodDeals', '#FoodDelivery', '#Restaurants', '#FoodSavings']
    };
    
    // Store-specific hashtags
    const storeHashtags = {
      'Amazon India': ['#AmazonDeals', '#AmazonIndia'],
      'Flipkart': ['#FlipkartDeals', '#Flipkart'],
      'Myntra': ['#MyntraDeals', '#Myntra'],
      'Nykaa': ['#NykaaDeals', '#Nykaa']
    };
    
    let hashtags = [...baseHashtags];
    
    if (context.category && categoryHashtags[context.category as keyof typeof categoryHashtags]) {
      hashtags.push(...categoryHashtags[context.category as keyof typeof categoryHashtags]);
    }
    
    if (context.storeName && storeHashtags[context.storeName as keyof typeof storeHashtags]) {
      hashtags.push(...storeHashtags[context.storeName as keyof typeof storeHashtags]);
    }
    
    // Add trending hashtags
    hashtags.push('#SaleAlert', '#LimitedTime', '#DontMiss', '#ShopNow', '#BestPrice');
    
    return hashtags.slice(0, 15); // Limit to 15 hashtags
  }

  private generateTikTokHashtags(context: any): string[] {
    const tiktokHashtags = [
      '#DealsOfTheDay', '#ShoppingSeason', '#SavingsHack', '#DealAlert',
      '#ShopWithMe', '#SaleHaul', '#BudgetFinds', '#MoneySaving',
      '#IndianDeals', '#OnlineShopping', '#fy', '#foryou', '#viral'
    ];
    
    return tiktokHashtags;
  }

  private suggestEmojis(context: any): string[] {
    const baseEmojis = ['🔥', '💰', '🛒', '🎉', '⚡'];
    
    const categoryEmojis = {
      electronics: ['📱', '💻', '🎧', '📺', '⌚'],
      fashion: ['👗', '👟', '👕', '👜', '💄'],
      beauty: ['💄', '💅', '✨', '🌟', '💋'],
      food: ['🍔', '🍕', '🍜', '🥘', '🍰']
    };
    
    let emojis = [...baseEmojis];
    
    if (context.category && categoryEmojis[context.category as keyof typeof categoryEmojis]) {
      emojis.push(...categoryEmojis[context.category as keyof typeof categoryEmojis]);
    }
    
    return emojis;
  }

  private getCategoryEmojis(category?: string): string[] {
    const categoryEmojis = {
      electronics: ['📱', '💻', '🎧', '📺', '⌚', '📷', '🖥️'],
      fashion: ['👗', '👟', '👕', '👜', '🕶️', '⌚', '👔'],
      beauty: ['💄', '💅', '✨', '🌟', '💋', '🧴', '💆‍♀️'],
      food: ['🍔', '🍕', '🍜', '🥘', '🍰', '🍱', '🥗']
    };
    
    return categoryEmojis[category as keyof typeof categoryEmojis] || ['🛍️', '💝', '🎁'];
  }

  private async generateAlternatives(prompt: string, count: number): Promise<string[]> {
    const alternatives: string[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const alternative = await this.openAIService.generateResponse(prompt + ` (Alternative ${i + 1})`);
        alternatives.push(alternative);
      } catch (error) {
        // Skip failed alternatives
        continue;
      }
    }
    
    return alternatives;
  }

  private async generateMemeAlternatives(context: any, template: MemeTemplate, count: number): Promise<string[]> {
    const alternatives: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const altPrompt = this.buildMemePrompt(context, template, 'funny', context.language || 'en');
      try {
        const alternative = await this.openAIService.generateResponse(altPrompt);
        alternatives.push(this.formatMemeContent(alternative, template));
      } catch (error) {
        continue;
      }
    }
    
    return alternatives;
  }

  private formatMemeContent(content: string, template: MemeTemplate): string {
    // Format the AI response according to the meme template structure
    return `🎭 ${template.name} Meme:\n\n${content}\n\n#MemeAlert #${template.category.charAt(0).toUpperCase() + template.category.slice(1)}Memes #Zabardoo`;
  }

  private generateCacheKey(request: ContentRequest): string {
    return `${request.type}_${JSON.stringify(request.context)}_${request.customPrompt || ''}`;
  }

  // Fallback methods for when AI fails
  private generateFallbackInstagramCaption(context: any, template: InstagramTemplate, mood: string): ContentResponse {
    const fallbackCaptions = {
      exciting: `🔥 AMAZING DEAL ALERT! 🔥\n\nGet ${context.dealTitle} at ${context.discount} OFF! 💰\n\nOnly ₹${context.price} at ${context.storeName}! 🛒\n\nDon't miss out - grab yours now! 🏃‍♂️💨\n\n#Deals #Savings #${context.storeName?.replace(' ', '')} #LimitedTime`,
      funny: `Me: "I don't need anything"\nAlso me: *sees ${context.dealTitle} at ${context.discount} off* 😍\n\nWell, I NEED this now! 🛒💸\n\nAvailable at ${context.storeName} for just ₹${context.price}! \n\n#ShoppingStruggles #Relatable #Deals #${context.category}`,
      professional: `💼 Smart Shopping Alert:\n\n${context.dealTitle} now available at ${context.discount} discount.\n\nPrice: ₹${context.price}\nStore: ${context.storeName}\nCategory: ${context.category}\n\nMaximize your savings today.\n\n#SmartShopping #Deals #Savings #${context.category}`
    };
    
    return {
      content: fallbackCaptions[mood as keyof typeof fallbackCaptions] || fallbackCaptions.exciting,
      hashtags: this.generateHashtags(context),
      emojis: this.suggestEmojis(context),
      metadata: {
        type: 'instagram_caption',
        generatedAt: new Date(),
        language: context.language || 'en',
        mood
      }
    };
  }

  private generateFallbackMeme(context: any, template: MemeTemplate): ContentResponse {
    const fallbackMemes = {
      'drake_pointing': `Drake rejecting: Paying full price for ${context.dealTitle}\nDrake pointing: Getting it at ${context.discount} off from ${context.storeName}! 💰`,
      'distracted_boyfriend': `Boyfriend: Me\nGirlfriend: My current ${context.category}\nOther girl: ${context.dealTitle} at ${context.discount} off 😍`,
      'expanding_brain': `Small brain: Buying at full price\nNormal brain: Waiting for sales\nGlowing brain: Using cashback apps\nGalaxy brain: Getting ${context.dealTitle} at ${context.discount} off with extra cashback! 🧠✨`
    };
    
    return {
      content: this.formatMemeContent(fallbackMemes[template.id as keyof typeof fallbackMemes] || `Meme about ${context.dealTitle} deal!`, template),
      metadata: {
        type: 'meme',
        generatedAt: new Date(),
        language: context.language || 'en',
        mood: 'funny'
      }
    };
  }

  private generateFallbackTikTokScript(context: any): ContentResponse {
    const script = `[Scene 1 - Hook (0-3s)]
🎬 *Quick zoom on product* "Wait, did you see this deal?!"

[Scene 2 - Reveal (3-15s)]
📱 *Show ${context.dealTitle}*
"${context.storeName} just dropped ${context.discount} off!"
*Price reveal: ₹${context.price}*

[Scene 3 - Value (15-30s)]
💰 "That's literally ₹X saved!"
*Quick calculation or comparison*
"I can buy [something else] with that money!"

[Scene 4 - CTA (30-45s)]
🏃‍♂️ "Link in bio, but hurry!"
*Timer countdown effect*
"This won't last long!"

[Scene 5 - Outro (45-60s)]
✨ "Follow for more deals like this!"
*Quick montage of other deals*

#DealsOfTheDay #${context.category} #SavingsHack`;

    return {
      content: script,
      hashtags: this.generateTikTokHashtags(context),
      metadata: {
        type: 'tiktok_script',
        generatedAt: new Date(),
        language: context.language || 'en',
        mood: 'trendy'
      }
    };
  }

  // Analytics and management
  async getContentStats(): Promise<{
    totalGenerated: number;
    byType: Record<string, number>;
    byMood: Record<string, number>;
    popularTemplates: Array<{ name: string; usage: number }>;
  }> {
    const allContent = Array.from(this.contentCache.values());
    
    const byType = allContent.reduce((acc, content) => {
      acc[content.metadata.type] = (acc[content.metadata.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byMood = allContent.reduce((acc, content) => {
      acc[content.metadata.mood] = (acc[content.metadata.mood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalGenerated: allContent.length,
      byType,
      byMood,
      popularTemplates: [] // Would track template usage in production
    };
  }

  async clearCache(): Promise<void> {
    this.contentCache.clear();
  }

  async exportTemplates(): Promise<{
    memeTemplates: MemeTemplate[];
    instagramTemplates: InstagramTemplate[];
  }> {
    return {
      memeTemplates: Array.from(this.memeTemplates.values()),
      instagramTemplates: Array.from(this.instagramTemplates.values())
    };
  }
}
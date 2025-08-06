import { BaseService } from '../base/BaseService';
import { OpenAIService } from './OpenAIService';

interface ContentRequest {
  type: 'instagram_caption' | 'meme_text' | 'tiktok_script' | 'reels_idea' | 'hashtags' | 'product_description';
  context: {
    productName?: string;
    dealInfo?: string;
    festival?: string;
    mood?: 'funny' | 'serious' | 'trendy' | 'festive';
    targetAudience?: 'youth' | 'family' | 'professionals' | 'all';
    language?: 'en' | 'hi' | 'hinglish';
  };
  customPrompt?: string;
}

interface GeneratedContent {
  id: string;
  type: string;
  content: string;
  hashtags?: string[];
  metadata: {
    generatedAt: Date;
    userId: string;
    context: any;
    engagement?: {
      likes: number;
      shares: number;
      comments: number;
    };
  };
}

interface MemeTemplate {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  textPositions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    color: string;
    alignment: 'left' | 'center' | 'right';
  }>;
  category: 'deal' | 'festival' | 'funny' | 'trending';
  popularity: number;
}

export class ContentGenerationService extends BaseService {
  private openAIService: OpenAIService;
  private generatedContent: Map<string, GeneratedContent> = new Map();
  private memeTemplates: Map<string, MemeTemplate> = new Map();

  constructor() {
    super();
    this.openAIService = new OpenAIService();
    this.initializeMemeTemplates();
  }

  private initializeMemeTemplates(): void {
    const templates: MemeTemplate[] = [
      {
        id: 'drake_pointing',
        name: 'Drake Pointing',
        description: 'Classic Drake meme for comparing deals',
        imageUrl: '/meme-templates/drake.jpg',
        textPositions: [
          { x: 300, y: 100, width: 200, height: 80, fontSize: 24, color: '#000000', alignment: 'left' },
          { x: 300, y: 300, width: 200, height: 80, fontSize: 24, color: '#000000', alignment: 'left' }
        ],
        category: 'deal',
        popularity: 95
      },
      {
        id: 'distracted_boyfriend',
        name: 'Distracted Boyfriend',
        description: 'Perfect for showing better deals',
        imageUrl: '/meme-templates/distracted-boyfriend.jpg',
        textPositions: [
          { x: 50, y: 50, width: 150, height: 40, fontSize: 18, color: '#FFFFFF', alignment: 'center' },
          { x: 200, y: 200, width: 150, height: 40, fontSize: 18, color: '#FFFFFF', alignment: 'center' },
          { x: 400, y: 100, width: 150, height: 40, fontSize: 18, color: '#FFFFFF', alignment: 'center' }
        ],
        category: 'deal',
        popularity: 88
      },
      {
        id: 'expanding_brain',
        name: 'Expanding Brain',
        description: 'Show progression of deal hunting skills',
        imageUrl: '/meme-templates/expanding-brain.jpg',
        textPositions: [
          { x: 300, y: 50, width: 250, height: 60, fontSize: 20, color: '#000000', alignment: 'left' },
          { x: 300, y: 150, width: 250, height: 60, fontSize: 20, color: '#000000', alignment: 'left' },
          { x: 300, y: 250, width: 250, height: 60, fontSize: 20, color: '#000000', alignment: 'left' },
          { x: 300, y: 350, width: 250, height: 60, fontSize: 20, color: '#000000', alignment: 'left' }
        ],
        category: 'funny',
        popularity: 82
      },
      {
        id: 'indian_festival',
        name: 'Festival Celebration',
        description: 'Perfect for Diwali, Holi, and other festivals',
        imageUrl: '/meme-templates/festival.jpg',
        textPositions: [
          { x: 100, y: 400, width: 400, height: 100, fontSize: 28, color: '#FFD700', alignment: 'center' }
        ],
        category: 'festival',
        popularity: 90
      },
      {
        id: 'bollywood_reaction',
        name: 'Bollywood Reaction',
        description: 'Classic Bollywood reaction for deals',
        imageUrl: '/meme-templates/bollywood.jpg',
        textPositions: [
          { x: 50, y: 350, width: 500, height: 80, fontSize: 24, color: '#FFFFFF', alignment: 'center' }
        ],
        category: 'trending',
        popularity: 85
      }
    ];

    templates.forEach(template => {
      this.memeTemplates.set(template.id, template);
    });
  }

  // Instagram Caption Generation
  async generateInstagramCaption(request: ContentRequest): Promise<GeneratedContent> {
    const { context } = request;
    
    const prompts = {
      en: `Create an engaging Instagram caption for a deal post about ${context.productName || 'amazing deals'}. 
           Include: ${context.dealInfo || 'great discounts'}
           Mood: ${context.mood || 'trendy'}
           Target: ${context.targetAudience || 'all'}
           Make it catchy, include emojis, and encourage engagement.`,
      
      hi: `${context.productName || 'शानदार डील्स'} के लिए एक आकर्षक Instagram caption बनाएं।
           जानकारी: ${context.dealInfo || 'बेहतरीन छूट'}
           मूड: ${context.mood || 'trendy'}
           टारगेट: ${context.targetAudience || 'सभी'}
           इसे आकर्षक बनाएं, इमोजी शामिल करें, और engagement बढ़ाएं।`,
      
      hinglish: `Create a trendy Hinglish Instagram caption for ${context.productName || 'amazing deals'}.
                Mix Hindi and English naturally. Include: ${context.dealInfo || 'great discounts'}
                Make it relatable for Indian youth with emojis and trending phrases.`
    };

    const prompt = prompts[context.language || 'en'];
    
    try {
      const generatedText = await this.openAIService.generateResponse(prompt);
      const hashtags = await this.generateHashtags(context);
      
      const content: GeneratedContent = {
        id: this.generateId(),
        type: 'instagram_caption',
        content: generatedText,
        hashtags,
        metadata: {
          generatedAt: new Date(),
          userId: 'system',
          context
        }
      };

      this.generatedContent.set(content.id, content);
      return content;
    } catch (error) {
      // Fallback templates
      return this.getFallbackInstagramCaption(context);
    }
  }

  // Meme Text Generation
  async generateMemeText(templateId: string, context: ContentRequest['context']): Promise<GeneratedContent> {
    const template = this.memeTemplates.get(templateId);
    if (!template) {
      throw new Error('Meme template not found');
    }

    const memePrompts = {
      drake_pointing: `Create two contrasting texts for Drake meme about deals:
                      Top (rejected): Something expensive or bad deal
                      Bottom (preferred): ${context.productName || 'Great deal'} with ${context.dealInfo || 'amazing discount'}
                      Make it funny and relatable for Indian shoppers.`,
      
      distracted_boyfriend: `Create three texts for distracted boyfriend meme about deals:
                            Girlfriend (left): Current expensive option
                            Boyfriend (center): Indian shopper
                            Other woman (right): ${context.productName || 'Amazing deal'} with ${context.dealInfo || 'great discount'}
                            Make it humorous about deal hunting.`,
      
      expanding_brain: `Create four progressive texts about deal hunting intelligence:
                       Level 1: Basic shopping
                       Level 2: Using coupons
                       Level 3: Comparing prices
                       Level 4: Using Zabardoo for ${context.productName || 'best deals'} with ${context.dealInfo || 'maximum savings'}
                       Make it funny and progressive.`,
      
      indian_festival: `Create festive text for ${context.festival || 'festival'} deals:
                       Celebrate ${context.festival || 'festival'} with ${context.productName || 'amazing deals'}!
                       Include: ${context.dealInfo || 'special discounts'}
                       Make it festive and exciting in ${context.language === 'hi' ? 'Hindi' : 'Hinglish'}.`,
      
      bollywood_reaction: `Create a Bollywood-style reaction text for deals:
                          React to ${context.productName || 'amazing deals'} with ${context.dealInfo || 'incredible discounts'}
                          Use dramatic Bollywood expressions and make it entertaining.`
    };

    const prompt = memePrompts[templateId as keyof typeof memePrompts] || memePrompts.drake_pointing;
    
    try {
      const generatedText = await this.openAIService.generateResponse(prompt);
      
      const content: GeneratedContent = {
        id: this.generateId(),
        type: 'meme_text',
        content: generatedText,
        metadata: {
          generatedAt: new Date(),
          userId: 'system',
          context: { ...context, templateId }
        }
      };

      this.generatedContent.set(content.id, content);
      return content;
    } catch (error) {
      return this.getFallbackMemeText(templateId, context);
    }
  }

  // TikTok/Reels Script Generation
  async generateTikTokScript(request: ContentRequest): Promise<GeneratedContent> {
    const { context } = request;
    
    const scriptPrompts = {
      deal_reveal: `Create a 30-second TikTok script revealing ${context.productName || 'amazing deals'}:
                   Hook (0-3s): Attention grabbing opening
                   Build-up (3-15s): Create suspense about the deal
                   Reveal (15-25s): Show ${context.dealInfo || 'incredible discount'}
                   CTA (25-30s): Call to action
                   Include trending audio suggestions and visual cues.`,
      
      comparison: `Create a TikTok comparison script:
                  "POV: You're comparing prices vs using Zabardoo"
                  Show the difference with ${context.productName || 'popular products'}
                  Include: ${context.dealInfo || 'savings comparison'}
                  Make it relatable and shareable.`,
      
      tutorial: `Create a "How to save money" TikTok tutorial:
                Step 1: Finding deals the old way
                Step 2: Discovering Zabardoo
                Step 3: Getting ${context.dealInfo || 'maximum savings'} on ${context.productName || 'everything'}
                Make it educational but entertaining.`
    };

    const prompt = scriptPrompts.deal_reveal;
    
    try {
      const generatedScript = await this.openAIService.generateResponse(prompt);
      
      const content: GeneratedContent = {
        id: this.generateId(),
        type: 'tiktok_script',
        content: generatedScript,
        metadata: {
          generatedAt: new Date(),
          userId: 'system',
          context
        }
      };

      this.generatedContent.set(content.id, content);
      return content;
    } catch (error) {
      return this.getFallbackTikTokScript(context);
    }
  }

  // Hashtag Generation
  async generateHashtags(context: ContentRequest['context']): Promise<string[]> {
    const baseHashtags = [
      '#Zabardoo', '#DealsIndia', '#Savings', '#Cashback', '#Shopping'
    ];

    const categoryHashtags = {
      electronics: ['#Electronics', '#Gadgets', '#Tech', '#Mobile', '#Laptop'],
      fashion: ['#Fashion', '#Style', '#Outfit', '#Trending', '#OOTD'],
      beauty: ['#Beauty', '#Makeup', '#Skincare', '#BeautyDeals', '#Cosmetics'],
      food: ['#Food', '#Foodie', '#Delivery', '#Restaurant', '#Deals']
    };

    const festivalHashtags = {
      diwali: ['#Diwali', '#Festival', '#DiwaliDeals', '#Celebration', '#Lights'],
      holi: ['#Holi', '#Colors', '#HoliDeals', '#Festival', '#Celebration'],
      eid: ['#Eid', '#EidMubarak', '#Festival', '#Celebration', '#EidDeals']
    };

    const moodHashtags = {
      funny: ['#Funny', '#Meme', '#LOL', '#Hilarious', '#Comedy'],
      trendy: ['#Trending', '#Viral', '#Popular', '#Hot', '#Latest'],
      festive: ['#Festival', '#Celebration', '#Joy', '#Happy', '#Festive']
    };

    let hashtags = [...baseHashtags];

    // Add category-specific hashtags
    if (context.productName) {
      const category = this.detectCategory(context.productName);
      if (categoryHashtags[category as keyof typeof categoryHashtags]) {
        hashtags.push(...categoryHashtags[category as keyof typeof categoryHashtags]);
      }
    }

    // Add festival hashtags
    if (context.festival && festivalHashtags[context.festival as keyof typeof festivalHashtags]) {
      hashtags.push(...festivalHashtags[context.festival as keyof typeof festivalHashtags]);
    }

    // Add mood hashtags
    if (context.mood && moodHashtags[context.mood as keyof typeof moodHashtags]) {
      hashtags.push(...moodHashtags[context.mood as keyof typeof moodHashtags]);
    }

    // Add language-specific hashtags
    if (context.language === 'hi') {
      hashtags.push('#Hindi', '#India', '#Bharat');
    } else if (context.language === 'hinglish') {
      hashtags.push('#Hinglish', '#IndianYouth', '#Desi');
    }

    return hashtags.slice(0, 30); // Instagram limit
  }

  // Meme Template Management
  async getMemeTemplates(category?: string): Promise<MemeTemplate[]> {
    let templates = Array.from(this.memeTemplates.values());
    
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    
    return templates.sort((a, b) => b.popularity - a.popularity);
  }

  async createCustomMeme(templateId: string, texts: string[]): Promise<{
    success: boolean;
    imageUrl?: string;
    error?: string;
  }> {
    const template = this.memeTemplates.get(templateId);
    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    // In a real implementation, this would use image processing libraries
    // like Canvas API or external services like Imgflip API
    
    try {
      // Simulate meme creation
      const memeUrl = `/generated-memes/${this.generateId()}.jpg`;
      
      // Here you would:
      // 1. Load the template image
      // 2. Add text overlays at specified positions
      // 3. Apply styling (font, color, size)
      // 4. Save the generated meme
      // 5. Return the URL
      
      return {
        success: true,
        imageUrl: memeUrl
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to generate meme'
      };
    }
  }

  // Content Analytics
  async getContentAnalytics(userId?: string): Promise<{
    totalGenerated: number;
    byType: Record<string, number>;
    topPerforming: GeneratedContent[];
    engagementStats: {
      averageLikes: number;
      averageShares: number;
      averageComments: number;
    };
  }> {
    let contents = Array.from(this.generatedContent.values());
    
    if (userId) {
      contents = contents.filter(c => c.metadata.userId === userId);
    }

    const byType = contents.reduce((acc, content) => {
      acc[content.type] = (acc[content.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topPerforming = contents
      .filter(c => c.metadata.engagement)
      .sort((a, b) => {
        const aScore = (a.metadata.engagement?.likes || 0) + 
                      (a.metadata.engagement?.shares || 0) * 2 + 
                      (a.metadata.engagement?.comments || 0) * 3;
        const bScore = (b.metadata.engagement?.likes || 0) + 
                      (b.metadata.engagement?.shares || 0) * 2 + 
                      (b.metadata.engagement?.comments || 0) * 3;
        return bScore - aScore;
      })
      .slice(0, 10);

    const engagementContents = contents.filter(c => c.metadata.engagement);
    const engagementStats = {
      averageLikes: engagementContents.reduce((sum, c) => sum + (c.metadata.engagement?.likes || 0), 0) / engagementContents.length || 0,
      averageShares: engagementContents.reduce((sum, c) => sum + (c.metadata.engagement?.shares || 0), 0) / engagementContents.length || 0,
      averageComments: engagementContents.reduce((sum, c) => sum + (c.metadata.engagement?.comments || 0), 0) / engagementContents.length || 0
    };

    return {
      totalGenerated: contents.length,
      byType,
      topPerforming,
      engagementStats
    };
  }

  // Fallback Methods
  private getFallbackInstagramCaption(context: ContentRequest['context']): GeneratedContent {
    const templates = [
      `🔥 Amazing deals alert! Get ${context.productName || 'incredible products'} with ${context.dealInfo || 'huge discounts'}! 💰✨ Don't miss out! #Zabardoo #Deals #Savings`,
      `💫 Your wallet will thank you! ${context.productName || 'Best deals'} now available with ${context.dealInfo || 'maximum savings'}! 🛍️💝 #Shopping #DealsIndia`,
      `🎉 Festival of savings! ${context.productName || 'Everything you need'} at ${context.dealInfo || 'unbeatable prices'}! 🎊💸 #Cashback #Zabardoo`
    ];

    return {
      id: this.generateId(),
      type: 'instagram_caption',
      content: templates[Math.floor(Math.random() * templates.length)],
      hashtags: ['#Zabardoo', '#Deals', '#Savings', '#Shopping', '#India'],
      metadata: {
        generatedAt: new Date(),
        userId: 'system',
        context
      }
    };
  }

  private getFallbackMemeText(templateId: string, context: ContentRequest['context']): GeneratedContent {
    const fallbacks = {
      drake_pointing: `Paying full price\n\nUsing Zabardoo for ${context.productName || 'amazing deals'}`,
      distracted_boyfriend: `Old expensive store|Me|Zabardoo ${context.dealInfo || 'deals'}`,
      expanding_brain: `Regular shopping\nUsing coupons\nComparing prices\nZabardoo ${context.productName || 'deals'}`,
      indian_festival: `${context.festival || 'Festival'} Mubarak! 🎉\n${context.productName || 'Amazing deals'} with ${context.dealInfo || 'special discounts'}!`,
      bollywood_reaction: `When you see ${context.productName || 'deals'} with ${context.dealInfo || 'huge discounts'} on Zabardoo! 😱💰`
    };

    return {
      id: this.generateId(),
      type: 'meme_text',
      content: fallbacks[templateId as keyof typeof fallbacks] || fallbacks.drake_pointing,
      metadata: {
        generatedAt: new Date(),
        userId: 'system',
        context: { ...context, templateId }
      }
    };
  }

  private getFallbackTikTokScript(context: ContentRequest['context']): GeneratedContent {
    const script = `🎬 TikTok Script: Deal Reveal

Hook (0-3s): "Wait, you're still paying full price? 😱"

Build-up (3-15s): "Let me show you something that'll blow your mind... *dramatic pause*"

Reveal (15-25s): "${context.productName || 'These products'} with ${context.dealInfo || '50% OFF'} + cashback on Zabardoo! 🤯💰"

CTA (25-30s): "Link in bio! Your wallet will thank me later! 💸✨"

Audio: Trending dramatic reveal sound
Visual: Price comparison, shocked reactions, deal screenshots`;

    return {
      id: this.generateId(),
      type: 'tiktok_script',
      content: script,
      metadata: {
        generatedAt: new Date(),
        userId: 'system',
        context
      }
    };
  }

  // Utility Methods
  private detectCategory(productName: string): string {
    const categories = {
      electronics: ['phone', 'laptop', 'mobile', 'computer', 'tablet', 'headphone', 'speaker'],
      fashion: ['shirt', 'dress', 'shoe', 'bag', 'watch', 'clothes', 'fashion'],
      beauty: ['makeup', 'skincare', 'cosmetic', 'beauty', 'cream', 'lipstick'],
      food: ['food', 'restaurant', 'delivery', 'meal', 'snack', 'grocery']
    };

    const lowerProduct = productName.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerProduct.includes(keyword))) {
        return category;
      }
    }
    
    return 'general';
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public API Methods
  async generateContent(request: ContentRequest, userId: string): Promise<GeneratedContent> {
    switch (request.type) {
      case 'instagram_caption':
        return this.generateInstagramCaption(request);
      case 'meme_text':
        if (!request.context.templateId) {
          throw new Error('Template ID required for meme generation');
        }
        return this.generateMemeText(request.context.templateId, request.context);
      case 'tiktok_script':
        return this.generateTikTokScript(request);
      case 'hashtags':
        const hashtags = await this.generateHashtags(request.context);
        return {
          id: this.generateId(),
          type: 'hashtags',
          content: hashtags.join(' '),
          hashtags,
          metadata: {
            generatedAt: new Date(),
            userId,
            context: request.context
          }
        };
      default:
        throw new Error('Unsupported content type');
    }
  }

  async getGeneratedContent(userId?: string, type?: string): Promise<GeneratedContent[]> {
    let contents = Array.from(this.generatedContent.values());
    
    if (userId) {
      contents = contents.filter(c => c.metadata.userId === userId);
    }
    
    if (type) {
      contents = contents.filter(c => c.type === type);
    }
    
    return contents.sort((a, b) => b.metadata.generatedAt.getTime() - a.metadata.generatedAt.getTime());
  }

  async updateEngagement(contentId: string, engagement: {
    likes?: number;
    shares?: number;
    comments?: number;
  }): Promise<void> {
    const content = this.generatedContent.get(contentId);
    if (content) {
      content.metadata.engagement = {
        ...content.metadata.engagement,
        ...engagement
      };
      this.generatedContent.set(contentId, content);
    }
  }
}
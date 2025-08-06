import { EventEmitter } from 'events';
import { logger } from '../../config/logger';
import axios from 'axios';

export interface VoiceSearchResult {
  query: string;
  confidence: number;
  intent: 'search' | 'compare' | 'question' | 'command';
  entities: {
    product?: string;
    category?: string;
    brand?: string;
    priceRange?: { min: number; max: number };
    location?: string;
  };
  suggestions: string[];
}

export class VoiceProcessingService extends EventEmitter {
  private openaiApiKey: string;
  private speechToTextCache: Map<string, string> = new Map();

  constructor() {
    super();
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    logger.info('VoiceProcessingService: Initialized with AI voice processing! 🎤');
  }

  async processVoiceMessage(audioBuffer: Buffer, userId: string): Promise<VoiceSearchResult> {
    try {
      // Convert speech to text using OpenAI Whisper
      const transcript = await this.speechToText(audioBuffer);
      
      if (!transcript) {
        throw new Error('Could not transcribe audio');
      }

      // Process the transcript with NLP
      const result = await this.processVoiceQuery(transcript, userId);
      
      // Cache the result
      this.speechToTextCache.set(`${userId}_${Date.now()}`, transcript);
      
      this.emit('voiceProcessed', { userId, transcript, result });
      
      logger.info(`VoiceProcessingService: Processed voice message for user ${userId}: "${transcript}"`);
      
      return result;
      
    } catch (error) {
      logger.error('VoiceProcessingService: Error processing voice message:', error);
      throw error;
    }
  }

  private async speechToText(audioBuffer: Buffer): Promise<string> {
    try {
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' });
      formData.append('file', audioBlob, 'audio.ogg');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en'); // Can be dynamic based on user preference

      const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data.text;
      
    } catch (error) {
      logger.error('VoiceProcessingService: Speech-to-text error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  private async processVoiceQuery(transcript: string, userId: string): Promise<VoiceSearchResult> {
    try {
      const prompt = `
Analyze this voice search query for an Indian e-commerce coupon platform:
"${transcript}"

Extract:
1. Search intent (search/compare/question/command)
2. Product or service mentioned
3. Category (electronics, fashion, food, travel, etc.)
4. Brand name if mentioned
5. Price range if mentioned (in INR)
6. Location if mentioned
7. Confidence score (0-100)
8. 3 search suggestions

Respond in JSON format:
{
  "query": "cleaned search query",
  "confidence": 85,
  "intent": "search",
  "entities": {
    "product": "smartphone",
    "category": "electronics",
    "brand": "Samsung",
    "priceRange": {"min": 10000, "max": 30000},
    "location": "Mumbai"
  },
  "suggestions": ["Samsung Galaxy deals", "Best smartphone under 30000", "Electronics offers Mumbai"]
}
      `;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an expert at understanding Indian e-commerce voice searches. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const result = JSON.parse(response.data.choices[0].message.content);
      
      // Validate and clean the result
      return this.validateVoiceResult(result, transcript);
      
    } catch (error) {
      logger.error('VoiceProcessingService: NLP processing error:', error);
      
      // Fallback to simple keyword extraction
      return this.fallbackProcessing(transcript);
    }
  }

  private validateVoiceResult(result: any, originalTranscript: string): VoiceSearchResult {
    return {
      query: result.query || originalTranscript,
      confidence: Math.min(Math.max(result.confidence || 50, 0), 100),
      intent: ['search', 'compare', 'question', 'command'].includes(result.intent) ? result.intent : 'search',
      entities: {
        product: result.entities?.product || null,
        category: result.entities?.category || null,
        brand: result.entities?.brand || null,
        priceRange: result.entities?.priceRange || null,
        location: result.entities?.location || null
      },
      suggestions: Array.isArray(result.suggestions) ? result.suggestions.slice(0, 3) : []
    };
  }

  private fallbackProcessing(transcript: string): VoiceSearchResult {
    const lowerTranscript = transcript.toLowerCase();
    
    // Simple keyword matching for categories
    const categories = {
      'mobile': 'electronics',
      'phone': 'electronics',
      'laptop': 'electronics',
      'electronics': 'electronics',
      'fashion': 'fashion',
      'clothes': 'fashion',
      'shirt': 'fashion',
      'food': 'food',
      'restaurant': 'food',
      'travel': 'travel',
      'flight': 'travel',
      'hotel': 'travel'
    };

    // Simple brand detection
    const brands = ['samsung', 'apple', 'xiaomi', 'oneplus', 'nike', 'adidas', 'zara', 'h&m'];
    
    let category = null;
    let brand = null;
    
    for (const [keyword, cat] of Object.entries(categories)) {
      if (lowerTranscript.includes(keyword)) {
        category = cat;
        break;
      }
    }
    
    for (const b of brands) {
      if (lowerTranscript.includes(b)) {
        brand = b;
        break;
      }
    }

    // Extract price range
    const priceMatch = lowerTranscript.match(/(\d+)\s*(?:to|-)?\s*(\d+)?\s*(?:rupees?|rs?|inr)?/);
    let priceRange = null;
    
    if (priceMatch) {
      const min = parseInt(priceMatch[1]);
      const max = priceMatch[2] ? parseInt(priceMatch[2]) : min * 2;
      priceRange = { min, max };
    }

    return {
      query: transcript,
      confidence: 60,
      intent: 'search',
      entities: {
        product: null,
        category,
        brand,
        priceRange,
        location: null
      },
      suggestions: [
        transcript,
        category ? `${category} deals` : 'best deals',
        brand ? `${brand} offers` : 'top offers'
      ]
    };
  }

  async generateVoiceResponse(searchResult: VoiceSearchResult, deals: any[]): Promise<string> {
    try {
      const prompt = `
Generate a natural, conversational response for a voice search result:

User searched for: "${searchResult.query}"
Found ${deals.length} deals

Create a friendly, enthusiastic response that:
1. Acknowledges what they searched for
2. Mentions the number of deals found
3. Highlights the best deal briefly
4. Encourages action
5. Sounds natural when spoken aloud
6. Uses Indian context and expressions

Keep it under 100 words and make it exciting!
      `;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an enthusiastic Indian shopping assistant. Speak naturally and use expressions like "Awesome!", "Great choice!", "Perfect timing!"' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 150
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content;
      
    } catch (error) {
      logger.error('VoiceProcessingService: Error generating voice response:', error);
      
      // Fallback response
      return `Great! I found ${deals.length} amazing deals for "${searchResult.query}". Check them out below! 🎉`;
    }
  }

  // Voice command processing
  async processVoiceCommand(transcript: string, userId: string): Promise<{ action: string; parameters: any }> {
    const lowerTranscript = transcript.toLowerCase();
    
    // Command patterns
    const commands = [
      { pattern: /show\s+my\s+profile/i, action: 'show_profile', parameters: {} },
      { pattern: /check\s+my\s+balance/i, action: 'check_balance', parameters: {} },
      { pattern: /daily\s+quest/i, action: 'show_quest', parameters: {} },
      { pattern: /leaderboard/i, action: 'show_leaderboard', parameters: {} },
      { pattern: /help/i, action: 'show_help', parameters: {} },
      { pattern: /settings/i, action: 'show_settings', parameters: {} }
    ];

    for (const command of commands) {
      if (command.pattern.test(transcript)) {
        logger.info(`VoiceProcessingService: Voice command detected: ${command.action}`);
        return { action: command.action, parameters: command.parameters };
      }
    }

    // Default to search if no command matched
    return { action: 'search', parameters: { query: transcript } };
  }

  // Get recent voice searches for a user
  getRecentVoiceSearches(userId: string, limit: number = 5): string[] {
    const searches: string[] = [];
    
    for (const [key, transcript] of this.speechToTextCache.entries()) {
      if (key.startsWith(userId)) {
        searches.push(transcript);
      }
    }
    
    return searches.slice(-limit);
  }

  // Clear cache periodically
  clearOldCache(): void {
    const oneHourAgo = Date.now() - 3600000;
    
    for (const [key] of this.speechToTextCache.entries()) {
      const timestamp = parseInt(key.split('_')[1]);
      if (timestamp < oneHourAgo) {
        this.speechToTextCache.delete(key);
      }
    }
  }
}
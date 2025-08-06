import { EventEmitter } from 'events';
import { logger } from '../../config/logger';
import axios from 'axios';

export interface ProductRecognitionResult {
  productName: string;
  category: string;
  brand?: string;
  confidence: number;
  suggestedSearches: string[];
  estimatedPrice?: { min: number; max: number };
  features: string[];
  similarProducts: string[];
}

export interface ImageAnalysisResult {
  isProduct: boolean;
  productCount: number;
  dominantColors: string[];
  text?: string;
  objects: DetectedObject[];
}

export interface DetectedObject {
  name: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export class ImageRecognitionService extends EventEmitter {
  private openaiApiKey: string;
  private recognitionCache: Map<string, ProductRecognitionResult> = new Map();

  constructor() {
    super();
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    logger.info('ImageRecognitionService: Initialized with AI image recognition! 📸');
  }

  async recognizeProduct(imageBuffer: Buffer, userId: string): Promise<ProductRecognitionResult> {
    try {
      // Convert image to base64
      const base64Image = imageBuffer.toString('base64');
      const imageHash = this.generateImageHash(base64Image);
      
      // Check cache first
      if (this.recognitionCache.has(imageHash)) {
        const cached = this.recognitionCache.get(imageHash)!;
        logger.info(`ImageRecognitionService: Using cached result for user ${userId}`);
        return cached;
      }

      // Analyze image with OpenAI Vision
      const result = await this.analyzeImageWithAI(base64Image);
      
      // Cache the result
      this.recognitionCache.set(imageHash, result);
      
      this.emit('productRecognized', { userId, result });
      
      logger.info(`ImageRecognitionService: Recognized product for user ${userId}: ${result.productName}`);
      
      return result;
      
    } catch (error) {
      logger.error('ImageRecognitionService: Error recognizing product:', error);
      throw error;
    }
  }

  private async analyzeImageWithAI(base64Image: string): Promise<ProductRecognitionResult> {
    try {
      const prompt = `
Analyze this product image for an Indian e-commerce platform. Identify:

1. Product name and type
2. Category (electronics, fashion, home, beauty, sports, books, etc.)
3. Brand if visible
4. Key features and specifications
5. Estimated price range in INR
6. Confidence level (0-100)
7. 5 suggested search queries
8. 3 similar product suggestions

Focus on Indian market context and pricing.

Respond in JSON format:
{
  "productName": "Samsung Galaxy S24",
  "category": "electronics",
  "brand": "Samsung",
  "confidence": 92,
  "estimatedPrice": {"min": 65000, "max": 85000},
  "features": ["5G", "108MP Camera", "6.2 inch Display"],
  "suggestedSearches": ["Samsung Galaxy deals", "5G smartphones under 80000", "Samsung mobile offers"],
  "similarProducts": ["iPhone 15", "OnePlus 12", "Google Pixel 8"]
}
      `;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const result = JSON.parse(response.data.choices[0].message.content);
      return this.validateRecognitionResult(result);
      
    } catch (error) {
      logger.error('ImageRecognitionService: AI analysis error:', error);
      
      // Fallback to basic analysis
      return this.fallbackRecognition();
    }
  }

  private validateRecognitionResult(result: any): ProductRecognitionResult {
    return {
      productName: result.productName || 'Unknown Product',
      category: result.category || 'general',
      brand: result.brand || undefined,
      confidence: Math.min(Math.max(result.confidence || 50, 0), 100),
      estimatedPrice: result.estimatedPrice || undefined,
      features: Array.isArray(result.features) ? result.features : [],
      suggestedSearches: Array.isArray(result.suggestedSearches) ? result.suggestedSearches.slice(0, 5) : [],
      similarProducts: Array.isArray(result.similarProducts) ? result.similarProducts.slice(0, 3) : []
    };
  }

  private fallbackRecognition(): ProductRecognitionResult {
    return {
      productName: 'Product',
      category: 'general',
      confidence: 30,
      features: [],
      suggestedSearches: [
        'Best deals today',
        'Popular products',
        'Trending offers'
      ],
      similarProducts: []
    };
  }

  async analyzeImageContent(imageBuffer: Buffer): Promise<ImageAnalysisResult> {
    try {
      const base64Image = imageBuffer.toString('base64');
      
      const prompt = `
Analyze this image and provide:
1. Is this a product image? (true/false)
2. How many products are visible?
3. Dominant colors in the image
4. Any text visible in the image
5. Objects detected with confidence scores

Respond in JSON format:
{
  "isProduct": true,
  "productCount": 1,
  "dominantColors": ["blue", "white", "black"],
  "text": "Samsung Galaxy",
  "objects": [
    {"name": "smartphone", "confidence": 95, "boundingBox": {"x": 10, "y": 20, "width": 200, "height": 300}}
  ]
}
      `;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'low'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.2
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const result = JSON.parse(response.data.choices[0].message.content);
      
      return {
        isProduct: result.isProduct || false,
        productCount: result.productCount || 0,
        dominantColors: Array.isArray(result.dominantColors) ? result.dominantColors : [],
        text: result.text || undefined,
        objects: Array.isArray(result.objects) ? result.objects : []
      };
      
    } catch (error) {
      logger.error('ImageRecognitionService: Content analysis error:', error);
      
      return {
        isProduct: false,
        productCount: 0,
        dominantColors: [],
        objects: []
      };
    }
  }

  async generateProductDescription(recognitionResult: ProductRecognitionResult): Promise<string> {
    try {
      const prompt = `
Create an engaging product description for:
Product: ${recognitionResult.productName}
Category: ${recognitionResult.category}
Brand: ${recognitionResult.brand || 'Unknown'}
Features: ${recognitionResult.features.join(', ')}

Make it:
1. Exciting and appealing
2. Highlight key benefits
3. Include Indian context
4. Mention potential savings
5. Under 100 words
6. Use emojis appropriately

Write as if you're a enthusiastic shopping assistant!
      `;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an enthusiastic Indian shopping assistant who loves helping people find great deals.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 200
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content;
      
    } catch (error) {
      logger.error('ImageRecognitionService: Error generating description:', error);
      
      // Fallback description
      return `🎯 Great choice! I found this ${recognitionResult.productName} for you. Let me search for the best deals and offers available right now! 💰`;
    }
  }

  async findSimilarProducts(recognitionResult: ProductRecognitionResult): Promise<string[]> {
    // This would integrate with your product database
    // For now, return the similar products from recognition
    return recognitionResult.similarProducts;
  }

  async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
    try {
      const base64Image = imageBuffer.toString('base64');
      
      const prompt = `
Extract all visible text from this image. Include:
1. Product names
2. Brand names
3. Prices
4. Specifications
5. Any other readable text

Return only the extracted text, separated by commas.
      `;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content || '';
      
    } catch (error) {
      logger.error('ImageRecognitionService: Text extraction error:', error);
      return '';
    }
  }

  // Utility methods
  private generateImageHash(base64Image: string): string {
    // Simple hash for caching (in production, use a proper hash function)
    return Buffer.from(base64Image.substring(0, 100)).toString('base64');
  }

  // Get recognition history for a user
  getRecognitionHistory(userId: string, limit: number = 10): ProductRecognitionResult[] {
    // This would be stored in database in production
    // For now, return empty array
    return [];
  }

  // Clear old cache entries
  clearOldCache(): void {
    if (this.recognitionCache.size > 1000) {
      // Keep only the most recent 500 entries
      const entries = Array.from(this.recognitionCache.entries());
      this.recognitionCache.clear();
      
      entries.slice(-500).forEach(([key, value]) => {
        this.recognitionCache.set(key, value);
      });
      
      logger.info('ImageRecognitionService: Cleared old cache entries');
    }
  }

  // Validate image format and size
  validateImage(imageBuffer: Buffer): { valid: boolean; error?: string } {
    if (imageBuffer.length > 10 * 1024 * 1024) { // 10MB limit
      return { valid: false, error: 'Image too large (max 10MB)' };
    }

    if (imageBuffer.length < 1024) { // 1KB minimum
      return { valid: false, error: 'Image too small' };
    }

    // Check for common image headers
    const header = imageBuffer.toString('hex', 0, 4);
    const validHeaders = ['ffd8', '8950', '4749', '424d']; // JPEG, PNG, GIF, BMP
    
    if (!validHeaders.some(h => header.startsWith(h))) {
      return { valid: false, error: 'Invalid image format' };
    }

    return { valid: true };
  }
}
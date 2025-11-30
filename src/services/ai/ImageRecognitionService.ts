import { EventEmitter } from 'events';
import axios from 'axios';
import { logger } from '../../config/logger';

interface ImageRecognitionOptions {
  mimeType?: string;
  filePath?: string;
}

export interface ImageRecognitionResult {
  productName: string | null;
  brand: string | null;
  category: string | null;
  confidence: number;
  searchQuery: string | null;
  keywords: string[];
  similarProducts: string[];
  summary: string | null;
  raw: any;
}

interface GeminiResponseTextPart {
  text?: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiResponseTextPart[] };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

export class ImageRecognitionService extends EventEmitter {
  private readonly enabled: boolean;
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly endpoint: string;

  constructor(options: { apiKey?: string; model?: string } = {}) {
    super();
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    this.model = options.model || process.env.GEMINI_MODEL || 'gemini-flash-latest';
    this.endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    this.enabled = Boolean(this.apiKey);
    if (this.enabled) {
      logger.info(`ImageRecognitionService: Gemini model ${this.model} ready`);
    } else {
      logger.warn('ImageRecognitionService: GEMINI_API_KEY not provided, running in fallback mode');
    }
  }

  validateImage(imageBuffer: Buffer): { valid: boolean; error?: string } {
    if (!imageBuffer || imageBuffer.length === 0) {
      return { valid: false, error: 'Empty image file' };
    }
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return { valid: false, error: 'Image too large (max 10MB)' };
    }
    return { valid: true };
  }

  private detectMimeType(filename?: string, fallback?: string): string {
    if (fallback) {
      return fallback;
    }
    if (!filename) {
      return 'image/jpeg';
    }
    const lower = filename.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.bmp')) return 'image/bmp';
    return 'image/jpeg';
  }

  private buildPrompt(): string {
    return [
      'You are an e-commerce product expert.',
      'Look at the supplied product photo and respond ONLY with compact JSON that follows this schema:',
      '{"productName":string,"brand":string|null,"category":string,"confidence":number,"searchQuery":string,"keywords":string[],"similarProducts":string[],"summary":string}',
      'All numbers must be decimals between 0 and 1 where relevant. The response must be valid JSON with double quotes and no comments.'
    ].join(' ');
  }

  private extractText(response: GeminiResponse): string | null {
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const textPart = parts.find(part => typeof part.text === 'string');
    return textPart?.text ?? null;
  }

  private parseResponseText(raw: string | null): any {
    if (!raw) {
      return null;
    }
    let cleaned = raw.trim();
    if (!cleaned) {
      return null;
    }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace >= firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
    try {
      return JSON.parse(cleaned);
    } catch (error) {
      logger.error('ImageRecognitionService: failed to parse Gemini response', { error, cleaned });
      return null;
    }
  }

  private buildRecognition(parsed: any): ImageRecognitionResult {
    return {
      productName: parsed?.productName ?? null,
      brand: parsed?.brand ?? null,
      category: parsed?.category ?? null,
      confidence: typeof parsed?.confidence === 'number' ? Math.min(Math.max(parsed.confidence, 0), 1) : 0,
      searchQuery: parsed?.searchQuery ?? parsed?.productName ?? null,
      keywords: Array.isArray(parsed?.keywords) ? parsed.keywords.filter(Boolean) : [],
      similarProducts: Array.isArray(parsed?.similarProducts) ? parsed.similarProducts.filter(Boolean) : [],
      summary: parsed?.summary ?? null,
      raw: parsed
    };
  }

  private async callGemini(imagePart: { data: string; mimeType: string }): Promise<ImageRecognitionResult | null> {
    if (!this.enabled || !this.apiKey) {
      return null;
    }

    try {
      const payload = {
        contents: [
          {
            parts: [
              { inlineData: imagePart },
              { text: this.buildPrompt() }
            ]
          }
        ]
      };

      const response = await axios.post<GeminiResponse>(`${this.endpoint}?key=${this.apiKey}`, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const text = this.extractText(response.data);
      const parsed = this.parseResponseText(text);
      if (!parsed) {
        return null;
      }
      return this.buildRecognition(parsed);
    } catch (error) {
      logger.error('ImageRecognitionService: Gemini API error', error);
      return null;
    }
  }

  async recognizeProduct(imageBuffer: Buffer, userId: string, options: ImageRecognitionOptions = {}): Promise<ImageRecognitionResult> {
    const validation = this.validateImage(imageBuffer);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const mimeType = this.detectMimeType(options.filePath, options.mimeType);
    const imagePart = {
      data: imageBuffer.toString('base64'),
      mimeType
    };

    const recognition = await this.callGemini(imagePart);
    if (recognition) {
      this.emit('productRecognized', { userId, result: recognition });
      return recognition;
    }

    return {
      productName: null,
      brand: null,
      category: null,
      confidence: 0,
      searchQuery: null,
      keywords: [],
      similarProducts: [],
      summary: 'Unable to analyse the image',
      raw: null
    };
  }

  async generateProductDescription(result: ImageRecognitionResult | null): Promise<string> {
    if (!result) {
      return 'I could not recognise the product in the image.';
    }
    const parts = [] as string[];
    if (result.productName) {
      parts.push(`This looks like ${result.productName}`);
    }
    if (result.brand) {
      parts.push(`from ${result.brand}`);
    }
    if (result.category) {
      parts.push(`in the ${result.category} category`);
    }
    return parts.length ? `${parts.join(' ')}.` : 'I analysed the image but could not confidently identify the product.';
  }

  destroy(): void {
    this.removeAllListeners();
    logger.info('ImageRecognitionService destroyed');
  }
}

export default ImageRecognitionService;



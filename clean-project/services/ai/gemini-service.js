/**
 * Gemini AI Service для распознавания изображений и генерации поисковых запросов
 */
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not set - AI features disabled');
      this.enabled = false;
      return;
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Используем gemini-2.5-flash для мультимодальности (текст + изображения)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    this.enabled = true;
    console.log('✅ Gemini AI Service initialized');
  }

  /**
   * Распознать изображение и вернуть ключевые слова для поиска товаров
   * @param {Buffer|string} imageData - Buffer изображения или base64 строка
   * @param {string} mimeType - тип изображения (image/jpeg, image/png)
   * @returns {Promise<{keywords: string[], description: string, category: string}>}
   */
  async analyzeProductImage(imageData, mimeType = 'image/jpeg', userCaption = null) {
    if (!this.enabled) {
      return { keywords: [], description: 'AI disabled', category: 'general' };
    }

    try {
      // Конвертируем Buffer в base64 если нужно
      const base64Data = Buffer.isBuffer(imageData) 
        ? imageData.toString('base64')
        : imageData;

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      };

      // Если есть подпись от пользователя — учитываем её
      const captionContext = userCaption 
        ? `\n\nUser also provided this text with the image: "${userCaption}"\nUse this information to better identify the product (it might be model name, brand, or what they're looking for).`
        : '';

      const prompt = `You are a shopping assistant. Analyze this product image and respond in JSON format only:
{
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "description": "brief product description in English",
  "category": "one of: electronics, fashion, beauty, home, sports, food, general",
  "brand": "brand name if visible, or null",
  "color": "main color if relevant",
  "suggestedSearch": "best search query for finding this product"
}

Focus on identifying:
- Product type (what is it?)
- Brand if visible
- Key features
- Category for shopping${captionContext}

Return ONLY valid JSON, no markdown.`;

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      // Парсим JSON из ответа
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          keywords: parsed.keywords || [],
          description: parsed.description || '',
          category: parsed.category || 'general',
          brand: parsed.brand,
          color: parsed.color,
          suggestedSearch: parsed.suggestedSearch || parsed.keywords?.join(' ') || ''
        };
      }

      // Fallback если JSON не распарсился
      return {
        keywords: text.split(/[,\s]+/).filter(w => w.length > 2).slice(0, 5),
        description: text.substring(0, 100),
        category: 'general',
        suggestedSearch: text.substring(0, 50)
      };

    } catch (error) {
      console.error('Gemini image analysis error:', error.message);
      return { 
        keywords: [], 
        description: 'Could not analyze image', 
        category: 'general',
        error: error.message 
      };
    }
  }

  /**
   * Скачать изображение из Telegram и проанализировать
   * @param {string} fileUrl - URL файла от Telegram API
   * @param {string} userCaption - подпись пользователя к фото (опционально)
   * @returns {Promise<{keywords: string[], description: string, category: string}>}
   */
  async analyzeImageFromUrl(fileUrl, userCaption = null) {
    try {
      const response = await axios.get(fileUrl, { 
        responseType: 'arraybuffer',
        timeout: 10000
      });
      
      const buffer = Buffer.from(response.data);
      
      // Определяем MIME type по расширению файла (Telegram часто возвращает octet-stream)
      let mimeType = 'image/jpeg';
      if (fileUrl.endsWith('.png')) {
        mimeType = 'image/png';
      } else if (fileUrl.endsWith('.webp')) {
        mimeType = 'image/webp';
      } else if (fileUrl.endsWith('.gif')) {
        mimeType = 'image/gif';
      }
      
      return await this.analyzeProductImage(buffer, mimeType, userCaption);
    } catch (error) {
      console.error('Error downloading image:', error.message);
      return { 
        keywords: [], 
        description: 'Could not download image', 
        category: 'general',
        error: error.message 
      };
    }
  }

  /**
   * Улучшить поисковый запрос пользователя
   * @param {string} query - исходный запрос
   * @param {string} language - язык пользователя
   * @returns {Promise<{enhanced: string, keywords: string[], category: string}>}
   */
  async enhanceSearchQuery(query, language = 'en') {
    if (!this.enabled || !query) {
      return { enhanced: query, keywords: [query], category: 'general' };
    }

    try {
      const prompt = `User is searching for products. Their query: "${query}"

Return JSON only:
{
  "enhanced": "improved search query in English",
  "keywords": ["keyword1", "keyword2"],
  "category": "one of: electronics, fashion, beauty, home, sports, food, general",
  "intent": "what user is looking for"
}

Handle queries in any language (Russian, Hindi, English, Hinglish).
Return ONLY valid JSON.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          enhanced: parsed.enhanced || query,
          keywords: parsed.keywords || [query],
          category: parsed.category || 'general',
          intent: parsed.intent
        };
      }

      return { enhanced: query, keywords: [query], category: 'general' };

    } catch (error) {
      console.error('Gemini query enhancement error:', error.message);
      return { enhanced: query, keywords: [query], category: 'general' };
    }
  }

  /**
   * Анализ запроса когда ничего не найдено — даёт подсказки пользователю
   */
  async analyzeFailedSearch(query, language = 'en') {
    if (!this.enabled || !query) {
      return null;
    }

    try {
      const prompt = `User searched for "${query}" but no products were found.

Analyze what they might be looking for and suggest how to improve the search.
Consider: maybe it's a brand, model, category, or specific product type.

Return JSON only:
{
  "understood": "what you think user is looking for (in ${language === 'ru' ? 'Russian' : language === 'hi' ? 'Hindi' : 'English'})",
  "category": "likely category: electronics, fashion, beauty, home, sports, food, general",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "exampleQueries": ["better query 1", "better query 2"],
  "tip": "helpful tip for the user (in ${language === 'ru' ? 'Russian' : language === 'hi' ? 'Hindi' : 'English'})"
}

Return ONLY valid JSON.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;

    } catch (error) {
      console.error('Gemini search analysis error:', error.message);
      return null;
    }
  }

  /**
   * Транскрибировать аудио (если Gemini поддерживает) или вернуть fallback
   * Примечание: для голоса лучше использовать Google Speech-to-Text
   */
  async transcribeAudio(audioBuffer, mimeType = 'audio/ogg') {
    // Gemini 1.5 поддерживает аудио, но для Telegram voice лучше Speech-to-Text
    // Это заглушка - реализуем через Google Speech API
    return {
      text: '',
      error: 'Use Google Speech-to-Text for voice messages'
    };
  }
}

module.exports = GeminiService;

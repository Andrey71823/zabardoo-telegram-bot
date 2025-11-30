/**
 * Voice Service для распознавания голосовых сообщений
 * Использует Google Speech-to-Text API
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class VoiceService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY; // Используем тот же ключ для Speech API
    this.enabled = !!this.apiKey;
    
    // Поддерживаемые языки
    this.languages = {
      'ru': 'ru-RU',
      'en': 'en-IN',
      'hi': 'hi-IN'
    };
    
    if (this.enabled) {
      console.log('✅ Voice Service initialized');
    }
  }

  /**
   * Конвертировать OGG в формат для распознавания
   * Telegram отправляет голосовые в формате OGG Opus
   */
  async convertOggToWav(oggBuffer) {
    // Для простоты возвращаем как есть - Gemini может работать с OGG
    return oggBuffer;
  }

  /**
   * Распознать голосовое сообщение через Gemini
   * Gemini 1.5 поддерживает аудио напрямую
   */
  async transcribeWithGemini(audioBuffer, mimeType = 'audio/ogg') {
    if (!this.enabled) {
      return { text: '', error: 'Voice service disabled' };
    }

    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const audioPart = {
        inlineData: {
          data: audioBuffer.toString('base64'),
          mimeType: mimeType
        }
      };

      const prompt = `Transcribe this audio message. The user is searching for products.
Return JSON only:
{
  "text": "transcribed text",
  "language": "detected language code (ru, en, hi)",
  "confidence": 0.95
}

If audio is unclear, try your best guess. Return ONLY valid JSON.`;

      const result = await model.generateContent([prompt, audioPart]);
      const response = await result.response;
      const responseText = response.text();

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          text: parsed.text || '',
          language: parsed.language || 'en',
          confidence: parsed.confidence || 0.8
        };
      }

      return { text: responseText.trim(), language: 'en', confidence: 0.5 };

    } catch (error) {
      console.error('Voice transcription error:', error.message);
      return { text: '', error: error.message };
    }
  }

  /**
   * Скачать голосовое сообщение из Telegram и распознать
   */
  async transcribeFromUrl(fileUrl) {
    try {
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
        timeout: 15000
      });

      const buffer = Buffer.from(response.data);
      const mimeType = response.headers['content-type'] || 'audio/ogg';

      return await this.transcribeWithGemini(buffer, mimeType);

    } catch (error) {
      console.error('Error downloading voice:', error.message);
      return { text: '', error: error.message };
    }
  }
}

module.exports = VoiceService;

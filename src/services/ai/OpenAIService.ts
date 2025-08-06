import axios from 'axios';
import { logger } from '../../config/logger';
import { UserIntent, AIMessage } from '../../models/AIAssistant';
import { recordTelegramApiCall } from '../../config/monitoring';

export class OpenAIService {
  private apiKey: string;
  private baseURL: string = 'https://api.openai.com/v1';
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-3.5-turbo') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateResponse(
    messages: AIMessage[],
    userContext: any,
    systemPrompt?: string
  ): Promise<{
    response: string;
    intent: UserIntent;
    recommendations: any[];
  }> {
    try {
      const prompt = this.buildPrompt(messages, userContext, systemPrompt);
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: prompt,
          max_tokens: 500,
          temperature: 0.7,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      
      // Parse response for intent and recommendations
      const intent = await this.extractIntent(messages[messages.length - 1].content);
      const recommendations = await this.extractRecommendations(aiResponse, userContext);

      recordTelegramApiCall('openai_completion', true);
      
      return {
        response: aiResponse,
        intent,
        recommendations
      };

    } catch (error) {
      logger.error('Error generating AI response:', error);
      recordTelegramApiCall('openai_completion', false);
      
      return {
        response: this.getFallbackResponse(messages[messages.length - 1].content),
        intent: { intent: 'unknown', confidence: 0, entities: [], context: { conversationStage: 'inquiry' } },
        recommendations: []
      };
    }
  }

  private buildPrompt(messages: AIMessage[], userContext: any, systemPrompt?: string): any[] {
    const systemMessage = systemPrompt || this.getDefaultSystemPrompt(userContext);
    
    const prompt = [
      {
        role: 'system',
        content: systemMessage
      }
    ];

    // Add conversation history (last 10 messages)
    const recentMessages = messages.slice(-10);
    for (const message of recentMessages) {
      if (message.role !== 'system') {
        prompt.push({
          role: message.role,
          content: message.content
        });
      }
    }

    return prompt;
  }

  private getDefaultSystemPrompt(userContext: any): string {
    const { userProfile } = userContext;
    
    return `Ты - персональный AI-помощник по купонам и скидкам для индийского рынка в Telegram боте Zabardoo.

ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ:
- Имя: ${userProfile.name}
- Предпочтения: ${userProfile.preferences.join(', ')}
- История покупок: ${userProfile.purchaseHistory.length} покупок
- Lifetime Value: ₹${userProfile.lifetimeValue}
- Риск оттока: ${(userProfile.churnRisk * 100).toFixed(1)}%

ТВОЯ РОЛЬ:
- Помогай находить лучшие купоны и скидки
- Давай персонализированные рекомендации
- Отвечай на вопросы о товарах и магазинах
- Будь дружелюбным и полезным

ПРАВИЛА:
1. Отвечай на русском языке
2. Используй эмодзи для лучшего восприятия
3. Предлагай конкретные купоны когда это уместно
4. Учитывай предпочтения пользователя
5. Будь кратким но информативным
6. Фокусируйся на индийских магазинах (Flipkart, Amazon India, Myntra, etc.)
7. Указывай цены в рупиях (₹)

ПОПУЛЯРНЫЕ МАГАЗИНЫ В ИНДИИ:
- Flipkart (электроника, мода)
- Amazon India (все категории)
- Myntra (мода, красота)
- Nykaa (красота, косметика)
- BigBasket (продукты)
- Swiggy (еда)
- MakeMyTrip (путешествия)

Отвечай естественно и помогай пользователю экономить деньги!`;
  }

  async extractIntent(userMessage: string): Promise<UserIntent> {
    try {
      const intentPrompt = `Проанализируй сообщение пользователя и определи его намерение:

Сообщение: "${userMessage}"

Возможные намерения:
- greeting: приветствие
- coupon_search: поиск купонов/скидок
- product_inquiry: вопрос о товаре
- store_inquiry: вопрос о магазине
- price_comparison: сравнение цен
- support: техподдержка
- general: общий вопрос

Ответь в формате JSON:
{
  "intent": "название_намерения",
  "confidence": 0.95,
  "entities": [
    {"type": "category", "value": "электроника", "confidence": 0.9}
  ],
  "conversationStage": "inquiry"
}`;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: intentPrompt }],
          max_tokens: 200,
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = JSON.parse(response.data.choices[0].message.content);
      return {
        intent: result.intent,
        confidence: result.confidence,
        entities: result.entities || [],
        context: {
          conversationStage: result.conversationStage || 'inquiry'
        }
      };

    } catch (error) {
      logger.error('Error extracting intent:', error);
      return {
        intent: 'general',
        confidence: 0.5,
        entities: [],
        context: { conversationStage: 'inquiry' }
      };
    }
  }

  private async extractRecommendations(aiResponse: string, userContext: any): Promise<any[]> {
    // Simple keyword-based recommendation extraction
    const recommendations = [];
    
    if (aiResponse.includes('купон') || aiResponse.includes('скидка')) {
      // This would typically query the coupon database
      recommendations.push({
        type: 'coupon',
        reason: 'AI рекомендация на основе разговора',
        confidence: 0.8
      });
    }

    return recommendations;
  }

  private getFallbackResponse(userMessage: string): string {
    const fallbackResponses = [
      "Извините, у меня временные технические проблемы. Попробуйте переформулировать ваш вопрос.",
      "Я не смог обработать ваш запрос. Можете задать вопрос по-другому?",
      "Простите за неудобства. Давайте попробуем еще раз - что именно вас интересует?",
      "У меня сейчас проблемы с обработкой запроса. Напишите, пожалуйста, что вы ищете."
    ];

    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }

  async generateCouponRecommendation(
    userProfile: any,
    availableCoupons: any[]
  ): Promise<{
    recommendedCoupons: any[];
    personalizedMessage: string;
  }> {
    try {
      const prompt = `Ты - эксперт по купонам. Порекомендуй лучшие купоны для пользователя.

ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ:
- Предпочтения: ${userProfile.preferences.join(', ')}
- Бюджет: ₹${userProfile.lifetimeValue}
- История: ${userProfile.purchaseHistory.length} покупок

ДОСТУПНЫЕ КУПОНЫ:
${availableCoupons.slice(0, 10).map(coupon => 
  `- ${coupon.title}: ${coupon.discount_value}% скидка в ${coupon.store}`
).join('\n')}

Выбери 3 лучших купона и объясни почему они подходят этому пользователю.
Ответь в формате JSON:
{
  "recommendedCoupons": ["id1", "id2", "id3"],
  "personalizedMessage": "Персональное сообщение с рекомендациями"
}`;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 400,
          temperature: 0.5
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = JSON.parse(response.data.choices[0].message.content);
      return result;

    } catch (error) {
      logger.error('Error generating coupon recommendation:', error);
      return {
        recommendedCoupons: availableCoupons.slice(0, 3).map(c => c.id),
        personalizedMessage: "Вот несколько отличных предложений специально для вас!"
      };
    }
  }

  async generatePersonalizedGreeting(userProfile: any): Promise<string> {
    try {
      const prompt = `Создай персональное приветствие для пользователя купонного бота.

ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ:
- Имя: ${userProfile.name}
- Предпочтения: ${userProfile.preferences.join(', ')}
- Количество покупок: ${userProfile.purchaseHistory.length}
- Время суток: ${new Date().getHours()}

Создай дружелюбное приветствие на русском языке с эмодзи, которое:
1. Обращается к пользователю по имени
2. Учитывает время суток
3. Упоминает его интересы
4. Предлагает помощь с купонами
5. Не превышает 100 слов`;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0.8
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;

    } catch (error) {
      logger.error('Error generating personalized greeting:', error);
      return `Привет, ${userProfile.name}! 👋 Рад видеть вас снова. Готов помочь найти лучшие купоны и скидки! 🛍️`;
    }
  }
}
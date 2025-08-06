import { BaseService } from '../base/BaseService';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  isRTL: boolean;
  isActive: boolean;
}

interface Translation {
  key: string;
  language: string;
  value: string;
  context?: string;
  pluralForms?: Record<string, string>;
}

interface UserLanguagePreference {
  userId: string;
  languageCode: string;
  setAt: Date;
  autoDetected: boolean;
  region?: string;
}

export class LanguageService extends BaseService {
  private languages: Map<string, Language> = new Map();
  private translations: Map<string, Map<string, Translation>> = new Map();
  private userPreferences: Map<string, UserLanguagePreference> = new Map();
  private defaultLanguage = 'en';

  constructor() {
    super();
    this.initializeLanguages();
    this.loadTranslations();
  }

  private initializeLanguages(): void {
    const supportedLanguages: Language[] = [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '🇺🇸',
        isRTL: false,
        isActive: true
      },
      {
        code: 'hi',
        name: 'Hindi',
        nativeName: 'हिन्दी',
        flag: '🇮🇳',
        isRTL: false,
        isActive: true
      },
      {
        code: 'bn',
        name: 'Bengali',
        nativeName: 'বাংলা',
        flag: '🇧🇩',
        isRTL: false,
        isActive: true
      },
      {
        code: 'te',
        name: 'Telugu',
        nativeName: 'తెలుగు',
        flag: '🇮🇳',
        isRTL: false,
        isActive: true
      },
      {
        code: 'ta',
        name: 'Tamil',
        nativeName: 'தமிழ்',
        flag: '🇮🇳',
        isRTL: false,
        isActive: true
      },
      {
        code: 'mr',
        name: 'Marathi',
        nativeName: 'मराठी',
        flag: '🇮🇳',
        isRTL: false,
        isActive: true
      },
      {
        code: 'gu',
        name: 'Gujarati',
        nativeName: 'ગુજરાતી',
        flag: '🇮🇳',
        isRTL: false,
        isActive: true
      },
      {
        code: 'kn',
        name: 'Kannada',
        nativeName: 'ಕನ್ನಡ',
        flag: '🇮🇳',
        isRTL: false,
        isActive: true
      }
    ];

    supportedLanguages.forEach(lang => {
      this.languages.set(lang.code, lang);
    });
  }

  private loadTranslations(): void {
    // English translations (base)
    const englishTranslations = new Map<string, Translation>();
    
    const enTranslations = [
      { key: 'welcome_message', value: '🎉 Welcome to Zabardoo Enhanced Bot, {name}! 🌟' },
      { key: 'ai_powered_assistant', value: '🚀 I\'m your AI-powered deal discovery assistant!' },
      { key: 'voice_search', value: '🎤 Voice Search - Send me a voice message!' },
      { key: 'image_recognition', value: '📸 Image Recognition - Send me a product photo!' },
      { key: 'gamification', value: '🎮 Gamification - Earn XP and unlock achievements!' },
      { key: 'smart_notifications', value: '🔔 Smart Notifications - Get personalized deal alerts!' },
      { key: 'cashback_tracking', value: '💰 Cashback Tracking - Track your savings!' },
      { key: 'find_deals', value: '🔍 Find Deals' },
      { key: 'my_profile', value: '🎮 My Profile' },
      { key: 'guide', value: '📖 Guide' },
      { key: 'cashback', value: '💰 Cashback' },
      { key: 'settings', value: '⚙️ Settings' },
      { key: 'help', value: '🆘 Help' },
      { key: 'language_selector', value: '🌐 Language / भाषा' },
      { key: 'select_language', value: 'Select your preferred language:' },
      { key: 'language_changed', value: 'Language changed to English! 🇺🇸' },
      { key: 'electronics', value: '📱 Electronics' },
      { key: 'fashion', value: '👗 Fashion' },
      { key: 'beauty', value: '💄 Beauty' },
      { key: 'food', value: '🍔 Food' },
      { key: 'stores', value: '🏪 Stores' },
      { key: 'hot_deals', value: '🔥 Hot Deals' },
      { key: 'ai_recommendations', value: '🤖 AI Recommendations' },
      { key: 'voice_processing', value: '🎤 Processing your voice message...' },
      { key: 'photo_processing', value: '📸 Analyzing your product photo...' },
      { key: 'deals_found', value: '🔍 Found these amazing deals:' },
      { key: 'best_deal', value: '💰 Best Deal:' },
      { key: 'cashback_earned', value: 'Cashback earned:' },
      { key: 'xp_awarded', value: '+{amount} XP for {action}!' },
      { key: 'level_up', value: '🎉 LEVEL UP! Level {oldLevel} → Level {newLevel}' },
      { key: 'popular_stores', value: '🏪 Popular Indian Stores' },
      { key: 'ecommerce_giants', value: '🛍️ E-Commerce Giants:' },
      { key: 'beauty_personal_care', value: '💄 Beauty & Personal Care:' },
      { key: 'department_stores', value: '🏬 Department Stores:' },
      { key: 'food_grocery', value: '🍔 Food & Grocery:' },
      { key: 'pro_tip', value: '💡 Pro Tip:' },
      { key: 'voice_photo_search', value: '🎤 Send voice message or 📸 photo for personalized store recommendations!' }
    ];

    enTranslations.forEach(t => {
      englishTranslations.set(t.key, {
        key: t.key,
        language: 'en',
        value: t.value
      });
    });

    this.translations.set('en', englishTranslations);

    // Hindi translations
    const hindiTranslations = new Map<string, Translation>();
    
    const hiTranslations = [
      { key: 'welcome_message', value: '🎉 Zabardoo Enhanced Bot में आपका स्वागत है, {name}! 🌟' },
      { key: 'ai_powered_assistant', value: '🚀 मैं आपका AI-powered डील खोजने वाला सहायक हूँ!' },
      { key: 'voice_search', value: '🎤 वॉयस सर्च - मुझे वॉयस मैसेज भेजें!' },
      { key: 'image_recognition', value: '📸 इमेज पहचान - मुझे प्रोडक्ट की फोटो भेजें!' },
      { key: 'gamification', value: '🎮 गेमिफिकेशन - XP कमाएं और अचीवमेंट्स अनलॉक करें!' },
      { key: 'smart_notifications', value: '🔔 स्मार्ट नोटिफिकेशन - व्यक्तिगत डील अलर्ट पाएं!' },
      { key: 'cashback_tracking', value: '💰 कैशबैक ट्रैकिंग - अपनी बचत ट्रैक करें!' },
      { key: 'find_deals', value: '🔍 डील खोजें' },
      { key: 'my_profile', value: '🎮 मेरी प्रोफाइल' },
      { key: 'guide', value: '📖 गाइड' },
      { key: 'cashback', value: '💰 कैशबैक' },
      { key: 'settings', value: '⚙️ सेटिंग्स' },
      { key: 'help', value: '🆘 सहायता' },
      { key: 'language_selector', value: '🌐 भाषा / Language' },
      { key: 'select_language', value: 'अपनी पसंदीदा भाषा चुनें:' },
      { key: 'language_changed', value: 'भाषा हिंदी में बदल गई! 🇮🇳' },
      { key: 'electronics', value: '📱 इलेक्ट्रॉनिक्स' },
      { key: 'fashion', value: '👗 फैशन' },
      { key: 'beauty', value: '💄 ब्यूटी' },
      { key: 'food', value: '🍔 खाना' },
      { key: 'stores', value: '🏪 स्टोर्स' },
      { key: 'hot_deals', value: '🔥 हॉट डील्स' },
      { key: 'ai_recommendations', value: '🤖 AI सिफारिशें' },
      { key: 'voice_processing', value: '🎤 आपका वॉयस मैसेज प्रोसेस कर रहे हैं...' },
      { key: 'photo_processing', value: '📸 आपकी प्रोडक्ट फोटो का विश्लेषण कर रहे हैं...' },
      { key: 'deals_found', value: '🔍 ये शानदार डील्स मिलीं:' },
      { key: 'best_deal', value: '💰 बेस्ट डील:' },
      { key: 'cashback_earned', value: 'कैशबैक मिला:' },
      { key: 'xp_awarded', value: '+{amount} XP {action} के लिए!' },
      { key: 'level_up', value: '🎉 लेवल अप! लेवल {oldLevel} → लेवल {newLevel}' },
      { key: 'popular_stores', value: '🏪 लोकप्रिय भारतीय स्टोर्स' },
      { key: 'ecommerce_giants', value: '🛍️ ई-कॉमर्स दिग्गज:' },
      { key: 'beauty_personal_care', value: '💄 ब्यूटी और पर्सनल केयर:' },
      { key: 'department_stores', value: '🏬 डिपार्टमेंट स्टोर्स:' },
      { key: 'food_grocery', value: '🍔 खाना और किराना:' },
      { key: 'pro_tip', value: '💡 प्रो टिप:' },
      { key: 'voice_photo_search', value: '🎤 वॉयस मैसेज भेजें या 📸 फोटो भेजें व्यक्तिगत स्टोर सिफारिशों के लिए!' }
    ];

    hiTranslations.forEach(t => {
      hindiTranslations.set(t.key, {
        key: t.key,
        language: 'hi',
        value: t.value
      });
    });

    this.translations.set('hi', hindiTranslations);
  }

  // Public API Methods
  async getSupportedLanguages(): Promise<Language[]> {
    return Array.from(this.languages.values()).filter(lang => lang.isActive);
  }

  async getUserLanguage(userId: string): Promise<string> {
    const preference = this.userPreferences.get(userId);
    return preference?.languageCode || this.defaultLanguage;
  }

  async setUserLanguage(userId: string, languageCode: string, autoDetected: boolean = false): Promise<boolean> {
    if (!this.languages.has(languageCode)) {
      return false;
    }

    const preference: UserLanguagePreference = {
      userId,
      languageCode,
      setAt: new Date(),
      autoDetected
    };

    this.userPreferences.set(userId, preference);
    return true;
  }

  async translate(key: string, languageCode?: string, params?: Record<string, string>): Promise<string> {
    const lang = languageCode || this.defaultLanguage;
    const langTranslations = this.translations.get(lang);
    
    if (!langTranslations) {
      // Fallback to default language
      const defaultTranslations = this.translations.get(this.defaultLanguage);
      const translation = defaultTranslations?.get(key);
      return this.interpolate(translation?.value || key, params);
    }

    const translation = langTranslations.get(key);
    if (!translation) {
      // Fallback to default language
      const defaultTranslations = this.translations.get(this.defaultLanguage);
      const defaultTranslation = defaultTranslations?.get(key);
      return this.interpolate(defaultTranslation?.value || key, params);
    }

    return this.interpolate(translation.value, params);
  }

  async translateForUser(userId: string, key: string, params?: Record<string, string>): Promise<string> {
    const userLang = await this.getUserLanguage(userId);
    return this.translate(key, userLang, params);
  }

  async getLanguageKeyboard(userId: string): Promise<any> {
    const currentLang = await this.getUserLanguage(userId);
    const languages = await this.getSupportedLanguages();

    const keyboard = {
      inline_keyboard: []
    };

    // Create rows of 2 languages each
    for (let i = 0; i < languages.length; i += 2) {
      const row = [];
      
      for (let j = i; j < Math.min(i + 2, languages.length); j++) {
        const lang = languages[j];
        const isSelected = lang.code === currentLang;
        
        row.push({
          text: `${lang.flag} ${lang.nativeName}${isSelected ? ' ✓' : ''}`,
          callback_data: `lang_${lang.code}`
        });
      }
      
      keyboard.inline_keyboard.push(row);
    }

    // Add back button
    keyboard.inline_keyboard.push([
      {
        text: await this.translateForUser(userId, 'back', {}),
        callback_data: 'back_to_main'
      }
    ]);

    return keyboard;
  }

  async detectLanguageFromText(text: string): Promise<string> {
    // Simple language detection based on character sets
    // In production, use a proper language detection library
    
    const hindiPattern = /[\u0900-\u097F]/;
    const bengaliPattern = /[\u0980-\u09FF]/;
    const teluguPattern = /[\u0C00-\u0C7F]/;
    const tamilPattern = /[\u0B80-\u0BFF]/;
    const marathiPattern = /[\u0900-\u097F]/; // Similar to Hindi
    const gujaratiPattern = /[\u0A80-\u0AFF]/;
    const kannadaPattern = /[\u0C80-\u0CFF]/;

    if (hindiPattern.test(text)) return 'hi';
    if (bengaliPattern.test(text)) return 'bn';
    if (teluguPattern.test(text)) return 'te';
    if (tamilPattern.test(text)) return 'ta';
    if (gujaratiPattern.test(text)) return 'gu';
    if (kannadaPattern.test(text)) return 'kn';

    return 'en'; // Default to English
  }

  async autoDetectAndSetLanguage(userId: string, text: string): Promise<string> {
    const detectedLang = await this.detectLanguageFromText(text);
    const currentLang = await this.getUserLanguage(userId);

    if (detectedLang !== currentLang && detectedLang !== 'en') {
      await this.setUserLanguage(userId, detectedLang, true);
      return detectedLang;
    }

    return currentLang;
  }

  // Utility methods
  private interpolate(text: string, params?: Record<string, string>): string {
    if (!params) return text;

    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] || match;
    });
  }

  async addTranslation(key: string, languageCode: string, value: string, context?: string): Promise<void> {
    let langTranslations = this.translations.get(languageCode);
    
    if (!langTranslations) {
      langTranslations = new Map();
      this.translations.set(languageCode, langTranslations);
    }

    langTranslations.set(key, {
      key,
      language: languageCode,
      value,
      context
    });
  }

  async getTranslationStats(): Promise<{
    totalKeys: number;
    languageStats: Record<string, { translated: number; missing: number; percentage: number }>;
  }> {
    const baseTranslations = this.translations.get(this.defaultLanguage);
    const totalKeys = baseTranslations?.size || 0;

    const languageStats: Record<string, { translated: number; missing: number; percentage: number }> = {};

    for (const [langCode, langTranslations] of this.translations.entries()) {
      const translated = langTranslations.size;
      const missing = totalKeys - translated;
      const percentage = totalKeys > 0 ? Math.round((translated / totalKeys) * 100) : 0;

      languageStats[langCode] = {
        translated,
        missing,
        percentage
      };
    }

    return {
      totalKeys,
      languageStats
    };
  }

  async exportTranslations(languageCode?: string): Promise<Record<string, any>> {
    if (languageCode) {
      const langTranslations = this.translations.get(languageCode);
      if (!langTranslations) return {};

      const result: Record<string, string> = {};
      for (const [key, translation] of langTranslations.entries()) {
        result[key] = translation.value;
      }
      return result;
    }

    // Export all languages
    const result: Record<string, Record<string, string>> = {};
    
    for (const [langCode, langTranslations] of this.translations.entries()) {
      result[langCode] = {};
      for (const [key, translation] of langTranslations.entries()) {
        result[langCode][key] = translation.value;
      }
    }

    return result;
  }

  async importTranslations(data: Record<string, Record<string, string>>): Promise<void> {
    for (const [langCode, translations] of Object.entries(data)) {
      for (const [key, value] of Object.entries(translations)) {
        await this.addTranslation(key, langCode, value);
      }
    }
  }

  // Regional and cultural adaptations
  async getRegionalContent(userId: string, contentType: 'greetings' | 'festivals' | 'currency' | 'dateFormat'): Promise<any> {
    const userLang = await this.getUserLanguage(userId);
    
    const regionalContent = {
      greetings: {
        en: ['Hello', 'Hi', 'Good morning', 'Good evening'],
        hi: ['नमस्ते', 'नमस्कार', 'सुप्रभात', 'शुभ संध्या'],
        bn: ['নমস্কার', 'হ্যালো', 'সুপ্রভাত', 'শুভ সন্ধ্যা'],
        te: ['నమస్కారం', 'హలో', 'శుభోదయం', 'శుభ సాయంత్రం'],
        ta: ['வணக்கம்', 'ஹலோ', 'காலை வணக்கம்', 'மாலை வணக்கம்'],
        mr: ['नमस्कार', 'हॅलो', 'सुप्रभात', 'शुभ संध्या'],
        gu: ['નમસ્તે', 'હેલો', 'સુપ્રભાત', 'શુભ સાંજ'],
        kn: ['ನಮಸ್ಕಾರ', 'ಹಲೋ', 'ಶುಭೋದಯ', 'ಶುಭ ಸಂಜೆ']
      },
      festivals: {
        en: ['Diwali', 'Holi', 'Eid', 'Christmas', 'Dussehra'],
        hi: ['दिवाली', 'होली', 'ईद', 'क्रिसमस', 'दशहरा'],
        bn: ['দীপাবলি', 'হোলি', 'ঈদ', 'ক্রিসমাস', 'দশহরা'],
        te: ['దీపావళి', 'హోలీ', 'ఈద్', 'క్రిస్మస్', 'దశహరా'],
        ta: ['தீபாவளி', 'ஹோலி', 'ஈத்', 'கிறிஸ்மஸ்', 'தசரா'],
        mr: ['दिवाळी', 'होळी', 'ईद', 'ख्रिसमस', 'दसरा'],
        gu: ['દિવાળી', 'હોળી', 'ઈદ', 'ક્રિસમસ', 'દશેરા'],
        kn: ['ದೀಪಾವಳಿ', 'ಹೋಳಿ', 'ಈದ್', 'ಕ್ರಿಸ್ಮಸ್', 'ದಸರಾ']
      },
      currency: {
        en: '₹',
        hi: '₹',
        bn: '₹',
        te: '₹',
        ta: '₹',
        mr: '₹',
        gu: '₹',
        kn: '₹'
      },
      dateFormat: {
        en: 'DD/MM/YYYY',
        hi: 'DD/MM/YYYY',
        bn: 'DD/MM/YYYY',
        te: 'DD/MM/YYYY',
        ta: 'DD/MM/YYYY',
        mr: 'DD/MM/YYYY',
        gu: 'DD/MM/YYYY',
        kn: 'DD/MM/YYYY'
      }
    };

    return regionalContent[contentType]?.[userLang] || regionalContent[contentType]?.['en'];
  }
}
import { EventEmitter } from 'events';
import { logger } from '../../config/logger';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  emoji: string;
  isActive: boolean;
  region: string;
}

export interface Translation {
  key: string;
  language: string;
  value: string;
  context?: string;
}

export class LanguageService extends EventEmitter {
  private languages: Map<string, Language> = new Map();
  private translations: Map<string, Map<string, string>> = new Map();
  private userLanguages: Map<string, string> = new Map();

  constructor() {
    super();
    this.initializeLanguages();
    this.initializeTranslations();
    logger.info('LanguageService initialized with 9 Indian languages');
  }

  private initializeLanguages(): void {
    const languages: Language[] = [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        emoji: '🇺🇸',
        isActive: true,
        region: 'Global'
      },
      {
        code: 'hi',
        name: 'Hindi',
        nativeName: 'हिंदी',
        emoji: '🇮🇳',
        isActive: true,
        region: 'North India'
      },
      {
        code: 'bn',
        name: 'Bengali',
        nativeName: 'বাংলা',
        emoji: '🇧🇩',
        isActive: true,
        region: 'West Bengal, Bangladesh'
      },
      {
        code: 'te',
        name: 'Telugu',
        nativeName: 'తెలుగు',
        emoji: '🏛️',
        isActive: true,
        region: 'Andhra Pradesh, Telangana'
      },
      {
        code: 'ta',
        name: 'Tamil',
        nativeName: 'தமிழ்',
        emoji: '🏺',
        isActive: true,
        region: 'Tamil Nadu'
      },
      {
        code: 'gu',
        name: 'Gujarati',
        nativeName: 'ગુજરાતી',
        emoji: '🦚',
        isActive: true,
        region: 'Gujarat'
      },
      {
        code: 'kn',
        name: 'Kannada',
        nativeName: 'ಕನ್ನಡ',
        emoji: '🌺',
        isActive: true,
        region: 'Karnataka'
      },
      {
        code: 'ml',
        name: 'Malayalam',
        nativeName: 'മലയാളം',
        emoji: '🥥',
        isActive: true,
        region: 'Kerala'
      },
      {
        code: 'mr',
        name: 'Marathi',
        nativeName: 'मराठी',
        emoji: '🏔️',
        isActive: true,
        region: 'Maharashtra'
      }
    ];

    languages.forEach(lang => this.languages.set(lang.code, lang));
  }

  private initializeTranslations(): void {
    // Common UI translations
    const commonTranslations = {
      // Welcome messages
      'welcome.title': {
        en: 'Welcome to Zabardoo Enhanced Bot',
        hi: 'ज़बरदू एन्हांस्ड बॉट में आपका स्वागत है',
        bn: 'জাবারদু এনহান্সড বটে স্বাগতম',
        te: 'జబర్దూ ఎన్హాన్స్డ్ బాట్‌కు స్వాగతం',
        ta: 'ஜபர்தூ மேம்படுத்தப்பட்ட போட்டிற்கு வரவேற்கிறோம்',
        gu: 'ઝબરદૂ એન્હાન્સ્ડ બોટમાં આપનું સ્વાગત છે',
        kn: 'ಜಬರ್ದೂ ವರ್ಧಿತ ಬಾಟ್‌ಗೆ ಸ್ವಾಗತ',
        ml: 'സബർദൂ എൻഹാൻസ്ഡ് ബോട്ടിലേക്ക് സ്വാഗതം',
        mr: 'झबरदू एन्हान्स्ड बॉटमध्ये आपले स्वागत आहे'
      },
      
      // Button labels
      'button.find_deals': {
        en: '🔍 Find Deals',
        hi: '🔍 डील खोजें',
        bn: '🔍 ডিল খুঁজুন',
        te: '🔍 డీల్స్ కనుగొనండి',
        ta: '🔍 ஒப்பந்தங்களைக் கண்டறியவும்',
        gu: '🔍 ડીલ્સ શોધો',
        kn: '🔍 ಡೀಲ್‌ಗಳನ್ನು ಹುಡುಕಿ',
        ml: '🔍 ഡീലുകൾ കണ്ടെത്തുക',
        mr: '🔍 डील शोधा'
      },

      'button.my_profile': {
        en: '🎮 My Profile',
        hi: '🎮 मेरी प्रोफाइल',
        bn: '🎮 আমার প্রোফাইল',
        te: '🎮 నా ప్రొఫైల్',
        ta: '🎮 எனது சுயவிவரம்',
        gu: '🎮 મારી પ્રોફાઇલ',
        kn: '🎮 ನನ್ನ ಪ್ರೊಫೈಲ್',
        ml: '🎮 എന്റെ പ്രൊഫൈൽ',
        mr: '🎮 माझे प्रोफाइल'
      },

      'button.cashback': {
        en: '💰 Cashback',
        hi: '💰 कैशबैक',
        bn: '💰 ক্যাশব্যাক',
        te: '💰 క్యాష్‌బ్యాక్',
        ta: '💰 பணத்தைத் திரும்பப் பெறுதல்',
        gu: '💰 કેશબેક',
        kn: '💰 ಕ್ಯಾಶ್‌ಬ್ಯಾಕ್',
        ml: '💰 ക്യാഷ്ബാക്ക്',
        mr: '💰 कॅशबॅक'
      },

      'button.ask_zabardoo': {
        en: '🧠 Ask Zabardoo',
        hi: '🧠 ज़बरदू से पूछें',
        bn: '🧠 জাবারদুকে জিজ্ঞাসা করুন',
        te: '🧠 జబర్దూని అడగండి',
        ta: '🧠 ஜபர்தூவிடம் கேளுங்கள்',
        gu: '🧠 ઝબરદૂને પૂછો',
        kn: '🧠 ಜಬರ್ದೂನನ್ನು ಕೇಳಿ',
        ml: '🧠 സബർദൂവിനോട് ചോദിക്കുക',
        mr: '🧠 झबरदूला विचारा'
      },

      'button.random_deal': {
        en: '🎲 Random Deal',
        hi: '🎲 रैंडम डील',
        bn: '🎲 র্যান্ডম ডিল',
        te: '🎲 రాండమ్ డీల్',
        ta: '🎲 சீரற்ற ஒப்பந்தம்',
        gu: '🎲 રેન્ડમ ડીલ',
        kn: '🎲 ರ್ಯಾಂಡಮ್ ಡೀಲ್',
        ml: '🎲 റാൻഡം ഡീൽ',
        mr: '🎲 रँडम डील'
      },

      'button.language': {
        en: '🌐 Language',
        hi: '🌐 भाषा',
        bn: '🌐 ভাষা',
        te: '🌐 భాష',
        ta: '🌐 மொழி',
        gu: '🌐 ભાષા',
        kn: '🌐 ಭಾಷೆ',
        ml: '🌐 ഭാഷ',
        mr: '🌐 भाषा'
      },

      // Messages
      'message.ai_assistant': {
        en: "I'm your personal shopping AI! I can help you find deals, compare prices, and save money.",
        hi: 'मैं आपका व्यक्तिगत शॉपिंग AI हूं! मैं आपको डील खोजने, कीमतों की तुलना करने और पैसे बचाने में मदद कर सकता हूं।',
        bn: 'আমি আপনার ব্যক্তিগত শপিং AI! আমি আপনাকে ডিল খুঁজে পেতে, দাম তুলনা করতে এবং অর্থ সাশ্রয় করতে সাহায্য করতে পারি।',
        te: 'నేను మీ వ్యక్తిగత షాపింగ్ AI! నేను మీకు డీల్స్ కనుగొనడంలో, ధరలను పోల్చడంలో మరియు డబ్బు ఆదా చేయడంలో సహాయపడగలను.',
        ta: 'நான் உங்கள் தனிப்பட்ட ஷாப்பிங் AI! நான் உங்களுக்கு ஒப்பந்தங்களைக் கண்டறிய, விலைகளை ஒப்பிட்டு, பணத்தை மிச்சப்படுத்த உதவ முடியும்.',
        gu: 'હું તમારો વ્યક્તિગત શોપિંગ AI છું! હું તમને ડીલ્સ શોધવામાં, કિંમતોની તુલના કરવામાં અને પૈસા બચાવવામાં મદદ કરી શકું છું.',
        kn: 'ನಾನು ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಶಾಪಿಂಗ್ AI! ನಾನು ನಿಮಗೆ ಡೀಲ್‌ಗಳನ್ನು ಹುಡುಕಲು, ಬೆಲೆಗಳನ್ನು ಹೋಲಿಸಲು ಮತ್ತು ಹಣವನ್ನು ಉಳಿಸಲು ಸಹಾಯ ಮಾಡಬಹುದು.',
        ml: 'ഞാൻ നിങ്ങളുടെ വ്യക്തിഗത ഷോപ്പിംഗ് AI ആണ്! ഡീലുകൾ കണ്ടെത്താനും വിലകൾ താരതമ്യം ചെയ്യാനും പണം ലാഭിക്കാനും എനിക്ക് നിങ്ങളെ സഹായിക്കാൻ കഴിയും.',
        mr: 'मी तुमचा वैयक्तिक शॉपिंग AI आहे! मी तुम्हाला डील शोधण्यात, किंमतींची तुलना करण्यात आणि पैसे वाचवण्यात मदत करू शकतो.'
      },

      // Festival greetings
      'festival.diwali': {
        en: '🪔 Happy Diwali! Special festival deals await you!',
        hi: '🪔 दिवाली की शुभकामनाएं! विशेष त्योहारी डील आपका इंतजार कर रही हैं!',
        bn: '🪔 শুভ দীপাবলী! বিশেষ উৎসবের ডিল আপনার জন্য অপেক্ষা করছে!',
        te: '🪔 దీపావళి శుభాకాంక్షలు! ప్రత్యేక పండుగ డీల్స్ మిమ్మల్ని ఎదురుచూస్తున్నాయి!',
        ta: '🪔 தீபாவளி வாழ்த்துக்கள்! சிறப்பு பண்டிகை ஒப்பந்தங்கள் உங்களுக்காக காத்திருக்கின்றன!',
        gu: '🪔 દિવાળીની શુભેચ્છાઓ! ખાસ તહેવારી ડીલ્સ તમારી રાહ જોઈ રહી છે!',
        kn: '🪔 ದೀಪಾವಳಿ ಶುಭಾಶಯಗಳು! ವಿಶೇಷ ಹಬ್ಬದ ಡೀಲ್‌ಗಳು ನಿಮಗಾಗಿ ಕಾಯುತ್ತಿವೆ!',
        ml: '🪔 ദീപാവലി ആശംസകൾ! പ്രത്യേക ഉത്സവ ഡീലുകൾ നിങ്ങൾക്കായി കാത്തിരിക്കുന്നു!',
        mr: '🪔 दिवाळीच्या शुभेच्छा! विशेष सणाच्या डील तुमची वाट पाहत आहेत!'
      }
    };

    // Initialize translation maps
    Object.entries(commonTranslations).forEach(([key, translations]) => {
      Object.entries(translations).forEach(([lang, value]) => {
        if (!this.translations.has(lang)) {
          this.translations.set(lang, new Map());
        }
        this.translations.get(lang)!.set(key, value);
      });
    });
  }

  setUserLanguage(userId: string, languageCode: string): boolean {
    if (this.languages.has(languageCode)) {
      this.userLanguages.set(userId, languageCode);
      this.emit('languageChanged', { userId, languageCode });
      logger.info(`Language set to ${languageCode} for user ${userId}`);
      return true;
    }
    return false;
  }

  getUserLanguage(userId: string): string {
    return this.userLanguages.get(userId) || 'en';
  }

  detectLanguage(text: string): string {
    // Simple language detection based on character sets
    const hindiPattern = /[\u0900-\u097F]/;
    const bengaliPattern = /[\u0980-\u09FF]/;
    const teluguPattern = /[\u0C00-\u0C7F]/;
    const tamilPattern = /[\u0B80-\u0BFF]/;
    const gujaratiPattern = /[\u0A80-\u0AFF]/;
    const kannadaPattern = /[\u0C80-\u0CFF]/;
    const malayalamPattern = /[\u0D00-\u0D7F]/;
    const marathiPattern = /[\u0900-\u097F]/; // Same as Hindi, would need more sophisticated detection

    if (hindiPattern.test(text)) return 'hi';
    if (bengaliPattern.test(text)) return 'bn';
    if (teluguPattern.test(text)) return 'te';
    if (tamilPattern.test(text)) return 'ta';
    if (gujaratiPattern.test(text)) return 'gu';
    if (kannadaPattern.test(text)) return 'kn';
    if (malayalamPattern.test(text)) return 'ml';
    if (marathiPattern.test(text)) return 'mr';

    return 'en'; // Default to English
  }

  translate(key: string, userId?: string, fallback?: string): string {
    const userLang = userId ? this.getUserLanguage(userId) : 'en';
    const langTranslations = this.translations.get(userLang);
    
    if (langTranslations && langTranslations.has(key)) {
      return langTranslations.get(key)!;
    }

    // Fallback to English
    const englishTranslations = this.translations.get('en');
    if (englishTranslations && englishTranslations.has(key)) {
      return englishTranslations.get(key)!;
    }

    return fallback || key;
  }

  getAvailableLanguages(): Language[] {
    return Array.from(this.languages.values()).filter(lang => lang.isActive);
  }

  getLanguageInfo(code: string): Language | undefined {
    return this.languages.get(code);
  }

  formatCurrency(amount: number, userId?: string): string {
    const userLang = userId ? this.getUserLanguage(userId) : 'en';
    
    // Indian Rupee formatting
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);

    return formatted;
  }

  formatDate(date: Date, userId?: string): string {
    const userLang = userId ? this.getUserLanguage(userId) : 'en';
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    return new Intl.DateTimeFormat(userLang === 'en' ? 'en-IN' : userLang, options).format(date);
  }

  getFestivalGreeting(userId?: string): string | null {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // Check for major Indian festivals (simplified)
    if ((month === 10 || month === 11) && day >= 20 && day <= 25) {
      // Diwali period (approximate)
      return this.translate('festival.diwali', userId);
    }

    return null;
  }

  getRegionalPreferences(userId?: string): any {
    const userLang = userId ? this.getUserLanguage(userId) : 'en';
    const language = this.languages.get(userLang);
    
    if (!language) return null;

    // Return regional preferences based on language
    const regionalData = {
      hi: { region: 'North India', popularStores: ['Flipkart', 'Amazon', 'Myntra'], currency: 'INR' },
      bn: { region: 'West Bengal', popularStores: ['Flipkart', 'Amazon', 'Nykaa'], currency: 'INR' },
      te: { region: 'South India', popularStores: ['Amazon', 'Flipkart', 'BigBasket'], currency: 'INR' },
      ta: { region: 'Tamil Nadu', popularStores: ['Amazon', 'Flipkart', 'Saravana Stores'], currency: 'INR' },
      gu: { region: 'Gujarat', popularStores: ['Reliance Digital', 'Flipkart', 'Amazon'], currency: 'INR' },
      kn: { region: 'Karnataka', popularStores: ['Amazon', 'Flipkart', 'BigBasket'], currency: 'INR' },
      ml: { region: 'Kerala', popularStores: ['Amazon', 'Flipkart', 'Lulu Mall'], currency: 'INR' },
      mr: { region: 'Maharashtra', popularStores: ['Flipkart', 'Amazon', 'BigBazaar'], currency: 'INR' }
    };

    return regionalData[userLang as keyof typeof regionalData] || regionalData.hi;
  }

  getStats(): any {
    const totalLanguages = this.languages.size;
    const activeLanguages = Array.from(this.languages.values()).filter(lang => lang.isActive).length;
    const totalUsers = this.userLanguages.size;
    
    const languageDistribution = new Map<string, number>();
    Array.from(this.userLanguages.values()).forEach(lang => {
      languageDistribution.set(lang, (languageDistribution.get(lang) || 0) + 1);
    });

    return {
      totalLanguages,
      activeLanguages,
      totalUsers,
      languageDistribution: Object.fromEntries(languageDistribution),
      totalTranslations: Array.from(this.translations.values()).reduce((sum, langMap) => sum + langMap.size, 0)
    };
  }
}
#!/usr/bin/env node

// Test English Menu Bot - Verify menu is working correctly
const https = require('https');
const querystring = require('querystring');

class TestEnglishMenuBot {
  constructor(token) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
    this.offset = 0;
    this.isRunning = false;
  }

  async makeRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const postData = querystring.stringify(params);
      
      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${this.token}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.ok) {
              resolve(result.result);
            } else {
              reject(new Error(result.description || 'API Error'));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async sendMessage(chatId, text, replyMarkup = null) {
    const params = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    };
    
    if (replyMarkup) {
      params.reply_markup = JSON.stringify(replyMarkup);
    }
    
    return this.makeRequest('sendMessage', params);
  }

  // CORRECT English menu (matches your requirements)
  getEnglishMenu() {
    return {
      keyboard: [
        ['🔍 Find Deals', '🎮 My Profile', '📖 Guide'],
        ['💰 Cashback', '🎲 Random Deal', '🧠 Ask bazaarGuru'],
        ['⚙️ Settings', '🌐 Language', '🆘 Help']
      ],
      resize_keyboard: true,
      persistent: true
    };
  }

  // Inline menu (for top buttons)
  getInlineMenu() {
    return {
      inline_keyboard: [
        [
          { text: '🔍 Find Deals', callback_data: 'find_deals' },
          { text: '🎮 My Profile', callback_data: 'profile' },
          { text: '📖 Guide', callback_data: 'guide' }
        ],
        [
          { text: '💰 Cashback', callback_data: 'cashback' },
          { text: '🎲 Random Deal', callback_data: 'random_deal' },
          { text: '🧠 Ask bazaarGuru', callback_data: 'ask_bazaarGuru' }
        ],
        [
          { text: '⚙️ Settings', callback_data: 'settings' },
          { text: '🌐 Language', callback_data: 'language' },
          { text: '🆘 Help', callback_data: 'help' }
        ]
      ]
    };
  }

  async start() {
    console.log('🚀 Starting English Menu Test Bot...');
    console.log('📱 Testing English menu: Find Deals, My Profile, Guide, etc.');
    
    this.isRunning = true;
    this.pollUpdates();
  }

  async pollUpdates() {
    while (this.isRunning) {
      try {
        const updates = await this.makeRequest('getUpdates', {
          offset: this.offset,
          timeout: 30
        });

        for (const update of updates) {
          this.offset = update.update_id + 1;
          await this.handleUpdate(update);
        }
      } catch (error) {
        console.error('❌ Error polling updates:', error.message);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  async handleUpdate(update) {
    if (update.message) {
      await this.handleMessage(update.message);
    } else if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
    }
  }

  async handleMessage(message) {
    const chatId = message.chat.id;
    const text = message.text;
    const userName = message.from.first_name || 'User';

    console.log(`💬 ${userName}: ${text}`);

    if (text === '/start') {
      const welcomeMessage = `🎉 <b>Welcome ${userName}!</b>

✅ <b>English Menu Test Bot</b>

This bot tests the CORRECT English menu structure:

<b>🔝 Top Menu (Inline):</b>
🔍 Find Deals | 🎮 My Profile | 📖 Guide
💰 Cashback | 🎲 Random Deal | 🧠 Ask bazaarGuru  
⚙️ Settings | 🌐 Language | 🆘 Help

<b>📱 Bottom Menu (ReplyKeyboard):</b>
Same buttons but as persistent keyboard

<b>🎯 Test Instructions:</b>
1. Check that bottom menu shows English buttons
2. Try clicking bottom menu buttons
3. Try inline buttons above
4. Verify no Russian text appears

Ready to test! 🚀`;

      // Send with inline menu
      await this.sendMessage(chatId, welcomeMessage, this.getInlineMenu());
      
      // Set English bottom menu
      await this.sendMessage(chatId, '📱 <b>English bottom menu activated!</b>\n\nTry the buttons below:', this.getEnglishMenu());
      
      console.log(`✅ ${userName} - English menu sent successfully!`);
      
    } else {
      // Handle menu button presses
      await this.handleMenuPress(message);
    }
  }

  async handleMenuPress(message) {
    const chatId = message.chat.id;
    const text = message.text;
    const userName = message.from.first_name || 'User';
    
    let responseText = '';
    let isEnglishButton = false;

    switch (text) {
      case '🔍 Find Deals':
        responseText = `✅ <b>CORRECT!</b> English button: Find Deals\n\n🎁 +5 XP for using English menu!`;
        isEnglishButton = true;
        break;

      case '🎮 My Profile':
        responseText = `✅ <b>CORRECT!</b> English button: My Profile\n\n🎁 +3 XP for profile check!`;
        isEnglishButton = true;
        break;

      case '📖 Guide':
        responseText = `✅ <b>CORRECT!</b> English button: Guide\n\n🎁 +2 XP for reading guide!`;
        isEnglishButton = true;
        break;

      case '💰 Cashback':
        responseText = `✅ <b>CORRECT!</b> English button: Cashback\n\n🎁 +4 XP for cashback check!`;
        isEnglishButton = true;
        break;

      case '🎲 Random Deal':
        responseText = `✅ <b>CORRECT!</b> English button: Random Deal\n\n🎁 +7 XP for random deal!`;
        isEnglishButton = true;
        break;

      case '🧠 Ask bazaarGuru':
        responseText = `✅ <b>CORRECT!</b> English button: Ask bazaarGuru\n\n🎁 +8 XP for AI assistant!`;
        isEnglishButton = true;
        break;

      case '⚙️ Settings':
        responseText = `✅ <b>CORRECT!</b> English button: Settings\n\n🎁 +3 XP for settings!`;
        isEnglishButton = true;
        break;

      case '🌐 Language':
        responseText = `✅ <b>CORRECT!</b> English button: Language\n\n🎁 +3 XP for language!`;
        isEnglishButton = true;
        break;

      case '🆘 Help':
        responseText = `✅ <b>CORRECT!</b> English button: Help\n\n🎁 +2 XP for help!`;
        isEnglishButton = true;
        break;

      // Check for Russian buttons (should not appear)
      case '🔍 Поиск товаров':
      case '📱 Смартфоны':
      case '💻 Ноутбуки':
      case '🏠 Товары для дома':
      case '💬 Пожелание':
      case '😋 Жалоба':
      case 'ℹ️ Помощь':
        responseText = `❌ <b>ERROR!</b> Russian button detected: "${text}"\n\n🚨 This should be English! Menu needs fixing.`;
        console.log(`🚨 RUSSIAN BUTTON DETECTED: ${text} from ${userName}`);
        break;

      default:
        responseText = `💬 <b>Message:</b> "${text}"\n\n${isEnglishButton ? '✅ English menu working!' : 'ℹ️ Free text message'}`;
        break;
    }

    // Always respond with English menu
    await this.sendMessage(chatId, responseText, this.getEnglishMenu());
    
    if (isEnglishButton) {
      console.log(`✅ ${userName} used English button: ${text}`);
    }
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const userName = callbackQuery.from.first_name || 'User';

    const responseText = `✅ <b>Inline Button Test</b>

You clicked: <b>${data}</b>

🎁 +5 XP for using inline menu!

Both inline and bottom menus are working in English! 🎉`;

    try {
      await this.makeRequest('editMessageText', {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        text: responseText,
        parse_mode: 'HTML',
        reply_markup: JSON.stringify(this.getInlineMenu())
      });
    } catch (error) {
      await this.sendMessage(chatId, responseText, this.getEnglishMenu());
    }

    await this.makeRequest('answerCallbackQuery', {
      callback_query_id: callbackQuery.id
    });

    console.log(`✅ ${userName} used inline button: ${data}`);
  }

  stop() {
    console.log('🛑 Stopping test bot...');
    this.isRunning = false;
  }
}

// Start the test bot
const token = process.env.TELEGRAM_BOT_TOKEN || '8381471660:AAEK_I4XHl3emmH1s5K_hwuzMeNQbjtqsB0';

console.log('🧪 English Menu Test Bot');
console.log('========================');
console.log('This bot will test that the menu is properly in English');
console.log('');
console.log('✅ Expected English buttons:');
console.log('   🔍 Find Deals');
console.log('   🎮 My Profile');
console.log('   📖 Guide');
console.log('   💰 Cashback');
console.log('   🎲 Random Deal');
console.log('   🧠 Ask bazaarGuru');
console.log('   ⚙️ Settings');
console.log('   🌐 Language');
console.log('   🆘 Help');
console.log('');
console.log('❌ Should NOT see Russian buttons like:');
console.log('   🔍 Поиск товаров');
console.log('   📱 Смартфоны');
console.log('   💻 Ноутбуки');
console.log('   etc.');
console.log('');

const bot = new TestEnglishMenuBot(token);
bot.start().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test bot...');
  bot.stop();
  process.exit(0);
});
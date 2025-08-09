#!/usr/bin/env node

// Fix Bottom Menu - Replace Russian ReplyKeyboard with English
const https = require('https');
const querystring = require('querystring');

class FixBottomMenuBot {
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

  // CORRECT English bottom menu (ReplyKeyboard)
  getEnglishBottomKeyboard() {
    return {
      keyboard: [
        [
          { text: '🔍 Find Deals' },
          { text: '🎮 My Profile' },
          { text: '📖 Guide' }
        ],
        [
          { text: '💰 Cashback' },
          { text: '🎲 Random Deal' },
          { text: '🧠 Ask Zabardoo' }
        ],
        [
          { text: '⚙️ Settings' },
          { text: '🌐 Language' },
          { text: '🆘 Help' }
        ]
      ],
      resize_keyboard: true,
      persistent: true
    };
  }

  // CORRECT English inline menu (same as screenshot)
  getEnglishInlineKeyboard() {
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
          { text: '🧠 Ask Zabardoo', callback_data: 'ask_zabardoo' }
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
    console.log('🚀 Starting Bottom Menu Fix Bot...');
    
    this.isRunning = true;
    console.log('✅ Bot started - will fix bottom menu!');
    console.log('📱 English bottom menu: Find Deals, My Profile, Guide, Cashback, Random Deal, Ask Zabardoo, Settings, Language, Help');
    
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
    const userName = message.from.first_name || 'Andre_web';

    if (text === '/start') {
      // Send welcome message with BOTH menus
      const welcomeMessage = `🔍 <b>Top Deals for ${userName}!</b>

🎯 <b>Hot Deals Right Now:</b>
📱 Samsung Galaxy S24 - 28% OFF (₹52,000)
👟 Nike Air Max - 35% OFF (₹5,200)
💻 MacBook Air M3 - 15% OFF (₹85,000)
👗 Zara Dress Collection - 40% OFF
🎧 Sony WH-1000XM5 - 25% OFF (₹22,500)

💰 All with cashback up to 8%!
🎁 +5 XP for browsing deals!

🎤📸 <b>SMART SEARCH:</b> Send voice message or photo for personalized results!

Choose a category below for more specific deals:`;

      // Send with inline menu first
      await this.sendMessage(chatId, welcomeMessage, this.getEnglishInlineKeyboard());
      
      // Then send a message with English bottom menu to set it
      await this.sendMessage(chatId, '📱 <b>English menu is now active!</b>\n\nUse the buttons below or the inline menu above.', this.getEnglishBottomKeyboard());

      console.log(`✅ ${userName} - sent message with ENGLISH bottom menu!`);
      
    } else {
      // Handle bottom menu button presses
      await this.handleBottomMenuPress(message);
    }
  }

  async handleBottomMenuPress(message) {
    const chatId = message.chat.id;
    const text = message.text;
    let responseText = '';

    switch (text) {
      case '🔍 Find Deals':
        responseText = `🔍 <b>Find Deals</b>

You pressed the bottom menu button: Find Deals

🎁 +5 XP for using English menu!`;
        break;

      case '🎮 My Profile':
        responseText = `🎮 <b>My Profile</b>

You pressed the bottom menu button: My Profile

🎁 +3 XP for checking profile!`;
        break;

      case '📖 Guide':
        responseText = `📖 <b>Guide</b>

You pressed the bottom menu button: Guide

🎁 +2 XP for reading guide!`;
        break;

      case '💰 Cashback':
        responseText = `💰 <b>Cashback</b>

You pressed the bottom menu button: Cashback

🎁 +4 XP for checking cashback!`;
        break;

      case '🎲 Random Deal':
        responseText = `🎲 <b>Random Deal</b>

You pressed the bottom menu button: Random Deal

🎁 +7 XP for random deal!`;
        break;

      case '🧠 Ask Zabardoo':
        responseText = `🧠 <b>Ask Zabardoo</b>

You pressed the bottom menu button: Ask Zabardoo

🎁 +8 XP for AI assistant!`;
        break;

      case '⚙️ Settings':
        responseText = `⚙️ <b>Settings</b>

You pressed the bottom menu button: Settings

🎁 +3 XP for settings!`;
        break;

      case '🌐 Language':
        responseText = `🌐 <b>Language</b>

You pressed the bottom menu button: Language

🎁 +3 XP for language!`;
        break;

      case '🆘 Help':
        responseText = `🆘 <b>Help</b>

You pressed the bottom menu button: Help

🎁 +2 XP for help!`;
        break;

      default:
        responseText = `💬 <b>Message Received</b>

You sent: "${text}"

🎁 +1 XP for interaction!`;
        break;
    }

    // Always send with English bottom menu
    await this.sendMessage(chatId, responseText, this.getEnglishBottomKeyboard());
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;

    let responseText = `🤖 <b>Inline Button Pressed</b>

You clicked: ${data}

🎁 +5 XP for using inline menu!

The bottom menu is now in English!`;

    // Edit message with inline menu
    try {
      await this.makeRequest('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: responseText,
        parse_mode: 'HTML',
        reply_markup: JSON.stringify(this.getEnglishInlineKeyboard())
      });
    } catch (error) {
      await this.sendMessage(chatId, responseText, this.getEnglishBottomKeyboard());
    }

    // Answer callback query
    try {
      await this.makeRequest('answerCallbackQuery', {
        callback_query_id: callbackQuery.id
      });
    } catch (error) {
      console.error('Error answering callback query:', error.message);
    }
  }

  stop() {
    console.log('🛑 Stopping bot...');
    this.isRunning = false;
  }
}

// Start the bot
const token = process.env.TELEGRAM_BOT_TOKEN || '7315076864:AAGZ5N4dwhUrSw2tygw4wiCPY74cROKWzsE';

const bot = new FixBottomMenuBot(token);
bot.start().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  bot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  bot.stop();
  process.exit(0);
});
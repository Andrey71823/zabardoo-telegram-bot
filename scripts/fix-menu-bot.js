#!/usr/bin/env node

// Bot to fix persistent menu programmatically
const https = require('https');
const querystring = require('querystring');

class MenuFixBot {
  constructor(token) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
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

  async setChatMenuButton() {
    try {
      console.log('🔧 Setting English menu button...');
      
      const result = await this.makeRequest('setChatMenuButton', {
        menu_button: JSON.stringify({
          type: 'commands'
        })
      });
      
      console.log('✅ Menu button set to commands');
      return result;
    } catch (error) {
      console.error('❌ Failed to set menu button:', error.message);
    }
  }

  async setMyCommands() {
    try {
      console.log('🔧 Setting English bot commands...');
      
      const commands = [
        { command: 'start', description: '🚀 Start bot and show main menu' },
        { command: 'deals', description: '🔍 Find best deals and discounts' },
        { command: 'profile', description: '🎮 My profile, level and achievements' },
        { command: 'guide', description: '📖 Complete guide for all functions' },
        { command: 'cashback', description: '💰 My cashback and balance' },
        { command: 'random', description: '🎲 Get random deal surprise' },
        { command: 'ai', description: '🧠 Ask bazaarGuru AI assistant' },
        { command: 'settings', description: '⚙️ Notification settings' },
        { command: 'language', description: '🌐 Change language' },
        { command: 'help', description: '🆘 Show help and support' }
      ];

      const result = await this.makeRequest('setMyCommands', {
        commands: JSON.stringify(commands)
      });
      
      console.log('✅ English commands set successfully!');
      console.log('📋 Commands:', commands.map(c => `/${c.command} - ${c.description}`).join('\n   '));
      
      return result;
    } catch (error) {
      console.error('❌ Failed to set commands:', error.message);
    }
  }

  async deleteChatMenuButton() {
    try {
      console.log('🗑️ Removing old menu button...');
      
      const result = await this.makeRequest('setChatMenuButton', {
        menu_button: JSON.stringify({
          type: 'default'
        })
      });
      
      console.log('✅ Old menu button removed');
      return result;
    } catch (error) {
      console.error('❌ Failed to remove menu button:', error.message);
    }
  }

  async fixMenu() {
    console.log('🚀 Starting menu fix process...');
    
    // Step 1: Remove old menu
    await this.deleteChatMenuButton();
    
    // Step 2: Set English commands
    await this.setMyCommands();
    
    // Step 3: Set menu to use commands
    await this.setChatMenuButton();
    
    console.log('');
    console.log('✅ Menu fix completed!');
    console.log('📱 Your bot now has English menu commands');
    console.log('🔄 Restart your chat with the bot to see changes');
    console.log('');
    console.log('🎯 New English menu:');
    console.log('   🔍 /deals - Find best deals');
    console.log('   🎮 /profile - My profile');
    console.log('   📖 /guide - Complete guide');
    console.log('   💰 /cashback - My cashback');
    console.log('   🎲 /random - Random deal');
    console.log('   🧠 /ai - Ask bazaarGuru AI');
    console.log('   ⚙️ /settings - Settings');
    console.log('   🌐 /language - Language');
    console.log('   🆘 /help - Help');
  }
}

// Fix the menu
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌ Please set TELEGRAM_BOT_TOKEN environment variable');
  process.exit(1);
}

const menuFixer = new MenuFixBot(token);
menuFixer.fixMenu().then(() => {
  console.log('🎉 Menu fix process completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Menu fix failed:', error);
  process.exit(1);
});
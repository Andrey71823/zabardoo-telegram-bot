#!/usr/bin/env node

require('dotenv').config();
const SmartSearchService = require('../../services/smart-search-service');
const BaseBot = require('./bazaarguru-wow-bot');

class BazaarGuruSmartBot extends BaseBot {
  constructor(token) {
    super(token);
    try {
      this.smartSearch = new SmartSearchService();
    } catch (e) {
      console.error('SmartSearch initialization failed:', e.message);
    }
  }
}

if (require.main === module) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || process.env.BAZAARGURU_TELEGRAM_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not set.');
    process.exit(1);
  }
  // eslint-disable-next-line no-new
  new BazaarGuruSmartBot(token);
}

module.exports = BazaarGuruSmartBot;

const { chromium, firefox, webkit } = require('playwright');
const { getEnvironmentConfig } = require('../config/environment');

const BROWSER_TYPES = { chromium, firefox, webkit };

class BrowserManager {
  initialize() {
    this.config = getEnvironmentConfig();
    this.browserType = BROWSER_TYPES[this.config.browser];
    if (!this.browserType) {
      throw new Error(`Unsupported browser: ${this.config.browser}.`);
    }
  }

  async getBrowser() {
    if (!this.config) this.initialize();
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await this.browserType.launch({ headless: this.config.headless });
    }
    return this.browser;
  }

  async createContext() {
    const browser = await this.getBrowser();
    const context = await browser.newContext();
    try {
      context.setDefaultTimeout(this.config.defaultTimeoutMs);
      context.setDefaultNavigationTimeout(this.config.navigationTimeoutMs);
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
      return context;
    } catch (error) {
      await context.close().catch(() => {});
      throw error;
    }
  }

  async close() {
    const browser = this.browser;
    if (browser && browser.isConnected()) await browser.close();
    this.browser = undefined;
  }
}

module.exports = { BrowserManager };

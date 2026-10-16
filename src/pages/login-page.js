const { expect } = require('playwright/test');
const { getLoginConfig } = require('../config/login-config');

class LoginPage {
  constructor(page, config = getLoginConfig()) {
    this.page = page;
    this.config = config;
    this.usernameInput = page.locator(config.usernameSelector);
    this.passwordInput = page.locator(config.passwordSelector);
    this.submitButton = page.locator(config.submitSelector);
    this.successIndicator = page.locator(config.successSelector);
    this.errorIndicator = page.locator(config.errorSelector);
  }

  async open() {
    await this.page.goto(this.config.loginUrl);
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async signIn(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectSignedIn() {
    await expect(this.successIndicator).toBeVisible();
  }

  async expectSignInRejected() {
    await expect(this.errorIndicator).toBeVisible();
  }
}

module.exports = { LoginPage };

const { expect } = require('playwright/test');
const { getEventHubConfig } = require('../config/eventhub.config');

class LoginPage {
  constructor(page, config = getEventHubConfig()) {
    this.page = page;
    this.config = config;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.loginButton = page.locator('#login-btn');
    this.browseEventsLink = page.getByRole('link', { name: 'Browse Events', exact: true });
  }

  async open() {
    await this.page.goto(new URL('/login', `${this.config.baseUrl}/`).toString());
  }

  async signIn() {
    await this.emailInput.fill(this.config.username);
    await this.passwordInput.fill(this.config.password);
    await this.loginButton.click();
    await expect(this.browseEventsLink).toBeVisible();
  }
}

async function login(page) {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.signIn();
  return loginPage;
}

module.exports = { LoginPage, login };

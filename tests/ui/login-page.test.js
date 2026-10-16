const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');
const { getLoginConfig } = require('../../src/config/login-config');
const { LoginPage } = require('../../src/pages/login-page');

const TEST_SELECTORS = {
  usernameSelector: '#fixture-username',
  passwordSelector: '#fixture-password',
  submitSelector: '#fixture-submit',
  successSelector: '#fixture-success',
  errorSelector: '#fixture-error',
};

const loginFixture = `
  <form id="fixture-form">
    <input id="fixture-username" />
    <input id="fixture-password" type="password" />
    <button id="fixture-submit" type="submit">Submit</button>
  </form>
  <p id="fixture-success" hidden>Signed in</p>
  <p id="fixture-error" hidden>Rejected</p>
  <script>
    document.querySelector('#fixture-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const accepted =
        document.querySelector('#fixture-username').value === 'fixture-user' &&
        document.querySelector('#fixture-password').value === 'fixture-valid';
      document.querySelector(accepted ? '#fixture-success' : '#fixture-error').hidden = false;
    });
  </script>
`;

let browser;

before(async () => {
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  if (browser) await browser.close();
});

async function createFixturePage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route('http://fixture.invalid/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: loginFixture }),
  );
  const config = {
    ...TEST_SELECTORS,
    loginUrl: 'http://fixture.invalid/login',
  };
  return { context, page, loginPage: new LoginPage(page, config) };
}

test('login config reports missing application details without guessing values', () => {
  assert.throws(
    () => getLoginConfig({ baseUrl: '' }, {}),
    (error) =>
      error.message.includes('BASE_URL') &&
      error.message.includes('APP_LOGIN_PATH') &&
      error.message.includes('LOGIN_USERNAME_SELECTOR'),
  );
});

test('login config builds the login URL from supplied application values', () => {
  const config = getLoginConfig(
    { baseUrl: 'https://app.example.test/' },
    {
      APP_LOGIN_PATH: '/account/sign-in',
      LOGIN_USERNAME_SELECTOR: '[name="account"]',
      LOGIN_PASSWORD_SELECTOR: '[name="passcode"]',
      LOGIN_SUBMIT_SELECTOR: 'button[type="submit"]',
      LOGIN_SUCCESS_SELECTOR: '[data-state="authenticated"]',
      LOGIN_ERROR_SELECTOR: '[data-state="rejected"]',
      TEST_USERNAME: 'dedicated-user',
      TEST_PASSWORD: 'fixture-secret',
      TEST_INVALID_PASSWORD: 'fixture-invalid-secret',
    },
  );
  assert.equal(config.loginUrl, 'https://app.example.test/account/sign-in');
  assert.equal(config.usernameSelector, '[name="account"]');
});

test('LoginPage submits valid credentials and waits for the success indicator', async () => {
  const { context, loginPage } = await createFixturePage();
  try {
    await loginPage.open();
    await loginPage.signIn('fixture-user', 'fixture-valid');
    await loginPage.expectSignedIn();
  } finally {
    await context.close();
  }
});

test('LoginPage submits an invalid password and waits for the rejection indicator', async () => {
  const { context, loginPage } = await createFixturePage();
  try {
    await loginPage.open();
    await loginPage.signIn('fixture-user', 'fixture-invalid');
    await loginPage.expectSignInRejected();
  } finally {
    await context.close();
  }
});

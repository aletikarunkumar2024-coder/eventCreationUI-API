const assert = require('node:assert/strict');
const test = require('node:test');
const { getEventHubConfig } = require('../../src/config/eventhub.config');

const environment = {
  environment: 'qa',
  baseUrl: 'https://eventhub.example.test/',
};
const validEnv = {
  TEST_USERNAME: 'test-user',
  TEST_PASSWORD: 'test-password',
  EVENT_CITY: 'Test City',
  EVENT_VENUE: 'Test Venue',
  TEST_CUSTOMER_NAME: 'Test Customer',
  TEST_CUSTOMER_EMAIL: 'customer@example.test',
  TEST_CUSTOMER_PHONE: '1234567890',
};

test('returns normalized EventHub configuration from provided values', () => {
  const config = getEventHubConfig(environment, validEnv);

  assert.equal(config.baseUrl, 'https://eventhub.example.test');
  assert.equal(config.username, validEnv.TEST_USERNAME);
  assert.equal(config.city, validEnv.EVENT_CITY);
  assert.equal(config.eventDescription, '');
});

test('reports missing required variable names', () => {
  assert.throws(
    () => getEventHubConfig({ ...environment, baseUrl: '' }, {}),
    /BASE_URL, TEST_USERNAME, TEST_PASSWORD, EVENT_CITY, EVENT_VENUE, TEST_CUSTOMER_NAME, TEST_CUSTOMER_EMAIL, TEST_CUSTOMER_PHONE/,
  );
});

test('rejects invalid and non-HTTP base URLs', () => {
  assert.throws(
    () => getEventHubConfig({ ...environment, baseUrl: 'not a URL' }, validEnv),
    /valid absolute EventHub URL/,
  );
  assert.throws(
    () => getEventHubConfig({ ...environment, baseUrl: 'file:///eventhub' }, validEnv),
    /HTTP or HTTPS/,
  );
});

test('prevents event creation in production', () => {
  assert.throws(
    () => getEventHubConfig({ ...environment, environment: 'production' }, validEnv),
    /disabled when TEST_ENV=production/,
  );
});

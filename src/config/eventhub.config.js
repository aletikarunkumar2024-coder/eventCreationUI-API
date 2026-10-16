const { getEnvironmentConfig } = require('./environment');

const REQUIRED_VARIABLES = {
  username: 'TEST_USERNAME',
  password: 'TEST_PASSWORD',
  city: 'EVENT_CITY',
  venue: 'EVENT_VENUE',
  customerName: 'TEST_CUSTOMER_NAME',
  customerEmail: 'TEST_CUSTOMER_EMAIL',
  customerPhone: 'TEST_CUSTOMER_PHONE',
};

function getEventHubConfig(environment = getEnvironmentConfig(), env = process.env) {
  const baseUrl = environment.baseUrl.trim();
  const entries = Object.entries(REQUIRED_VARIABLES).map(([key, variable]) => [
    key,
    env[variable]?.trim() || '',
    variable,
  ]);
  const config = Object.fromEntries(entries.map(([key, value]) => [key, value]));
  const missing = entries.filter(([, value]) => !value).map(([, , variable]) => variable);

  if (!baseUrl) missing.unshift('BASE_URL');
  if (missing.length) {
    throw new Error(
      `EventHub booking requires configuration: ${[...new Set(missing)].join(', ')}. ` +
        'Set these values in the untracked .env file using an authorized test account and dedicated test data.',
    );
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(baseUrl);
  } catch (error) {
    throw new Error('BASE_URL must be a valid absolute EventHub URL.', { cause: error });
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('BASE_URL must use HTTP or HTTPS.');
  }
  if (environment.environment === 'production') {
    throw new Error('Event creation is disabled when TEST_ENV=production.');
  }

  return {
    ...config,
    baseUrl: parsedUrl.toString().replace(/\/$/, ''),
    eventDescription: env.EVENT_DESCRIPTION?.trim() || '',
  };
}

module.exports = { getEventHubConfig };

const ENVIRONMENTS = new Set(['local', 'qa', 'staging', 'production']);
const BROWSERS = new Set(['chromium', 'firefox', 'webkit']);

function positiveInteger(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function boolean(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  throw new Error(`${name} must be "true" or "false".`);
}

function browserHeadless() {
  const headedValue = process.env.PLAYWRIGHT_HEADED;
  if (headedValue !== undefined && headedValue !== '') {
    return !boolean('PLAYWRIGHT_HEADED', false);
  }
  return boolean('HEADLESS', true);
}

function getEnvironmentConfig() {
  const environment = (process.env.TEST_ENV || 'local').toLowerCase();
  const browser = (process.env.BROWSER || 'chromium').toLowerCase();

  if (!ENVIRONMENTS.has(environment)) {
    throw new Error(`TEST_ENV must be one of: ${[...ENVIRONMENTS].join(', ')}.`);
  }
  if (!BROWSERS.has(browser)) {
    throw new Error(`BROWSER must be one of: ${[...BROWSERS].join(', ')}.`);
  }

  return {
    environment,
    browser,
    headless: browserHeadless(),
    defaultTimeoutMs: positiveInteger('DEFAULT_TIMEOUT_MS', 10000),
    navigationTimeoutMs: positiveInteger('NAVIGATION_TIMEOUT_MS', 30000),
    apiTimeoutMs: positiveInteger('API_TIMEOUT_MS', 30000),
    baseUrl: process.env.BASE_URL || '',
    apiBaseUrl: process.env.API_BASE_URL || process.env.BASE_URL || '',
  };
}

module.exports = { getEnvironmentConfig };

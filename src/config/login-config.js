const { getEnvironmentConfig } = require('./environment');

const LOGIN_SETTINGS = [
  ['APP_LOGIN_PATH', 'loginPath'],
  ['LOGIN_USERNAME_SELECTOR', 'usernameSelector'],
  ['LOGIN_PASSWORD_SELECTOR', 'passwordSelector'],
  ['LOGIN_SUBMIT_SELECTOR', 'submitSelector'],
  ['LOGIN_SUCCESS_SELECTOR', 'successSelector'],
  ['LOGIN_ERROR_SELECTOR', 'errorSelector'],
  ['TEST_USERNAME', 'username'],
  ['TEST_PASSWORD', 'password'],
  ['TEST_INVALID_PASSWORD', 'invalidPassword'],
];

function getLoginConfig(environment = getEnvironmentConfig(), env = process.env) {
  const missing = [];
  const config = { baseUrl: environment.baseUrl };

  if (!config.baseUrl) missing.push('BASE_URL');
  for (const [environmentName, configName] of LOGIN_SETTINGS) {
    const value = env[environmentName]?.trim();
    if (!value) {
      missing.push(environmentName);
    } else {
      config[configName] = value;
    }
  }

  if (missing.length) {
    throw new Error(
      `Login scenarios require application configuration: ${missing.join(', ')}. ` +
        'Set these values in the untracked .env file using application-approved selectors and a dedicated test account.',
    );
  }

  let loginUrl;
  try {
    loginUrl = new URL(config.loginPath, config.baseUrl);
  } catch (error) {
    throw new Error('BASE_URL and APP_LOGIN_PATH must form a valid application URL.', {
      cause: error,
    });
  }
  if (!['http:', 'https:'].includes(loginUrl.protocol)) {
    throw new Error('BASE_URL must use HTTP or HTTPS.');
  }

  return { ...config, loginUrl: loginUrl.toString() };
}

module.exports = { getLoginConfig };

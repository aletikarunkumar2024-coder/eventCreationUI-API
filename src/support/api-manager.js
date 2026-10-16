const { request } = require('playwright');
const { getEnvironmentConfig } = require('../config/environment');

function getApiHeaders() {
  const rawHeaders = process.env.API_HEADERS_JSON;
  if (!rawHeaders) return {};

  let headers;
  try {
    headers = JSON.parse(rawHeaders);
  } catch (error) {
    throw new Error('API_HEADERS_JSON must contain a valid JSON object.', { cause: error });
  }
  if (!headers || Array.isArray(headers) || typeof headers !== 'object') {
    throw new Error('API_HEADERS_JSON must contain a valid JSON object.');
  }
  for (const [name, value] of Object.entries(headers)) {
    if (typeof value !== 'string') {
      throw new Error(`API_HEADERS_JSON value for "${name}" must be a string.`);
    }
  }
  return headers;
}

class ApiManager {
  initialize() {
    this.config = getEnvironmentConfig();
    this.headers = getApiHeaders();
    if (!this.contexts) this.contexts = new Set();
  }

  async createContext() {
    if (!this.config) this.initialize();
    if (!this.config.apiBaseUrl) {
      throw new Error('API_BASE_URL (or BASE_URL) is required for @api and @e2e scenarios.');
    }

    const apiContext = await request.newContext({
      baseURL: this.config.apiBaseUrl,
      timeout: this.config.apiTimeoutMs,
      extraHTTPHeaders: this.headers,
    });
    this.contexts.add(apiContext);
    return apiContext;
  }

  async closeContext(apiContext) {
    if (!apiContext || !this.contexts?.has(apiContext)) return;
    await apiContext.dispose();
    this.contexts.delete(apiContext);
  }

  async closeAll() {
    if (!this.contexts?.size) return;
    const contexts = [...this.contexts];
    const results = await Promise.allSettled(contexts.map((context) => context.dispose()));
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') this.contexts.delete(contexts[index]);
    });
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length) {
      throw new AggregateError(
        failures.map((failure) => failure.reason),
        `Failed to dispose ${failures.length} API request context(s).`,
      );
    }
  }
}

module.exports = { ApiManager };

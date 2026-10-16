const assert = require('node:assert/strict');
const test = require('node:test');
const { getEnvironmentConfig } = require('../../src/config/environment');

function withBrowserSettings(settings, callback) {
  const names = ['PLAYWRIGHT_HEADED', 'HEADLESS'];
  const previous = new Map(names.map((name) => [name, process.env[name]]));

  for (const name of names) delete process.env[name];
  Object.assign(process.env, settings);

  try {
    callback();
  } finally {
    for (const name of names) {
      if (previous.get(name) === undefined) delete process.env[name];
      else process.env[name] = previous.get(name);
    }
  }
}

test('browser defaults to headless when no mode is configured', () => {
  withBrowserSettings({}, () => {
    assert.equal(getEnvironmentConfig().headless, true);
  });
});

test('PLAYWRIGHT_HEADED true launches headed even when HEADLESS is true', () => {
  withBrowserSettings({ PLAYWRIGHT_HEADED: 'true', HEADLESS: 'true' }, () => {
    assert.equal(getEnvironmentConfig().headless, false);
  });
});

test('PLAYWRIGHT_HEADED false keeps headless mode even when HEADLESS is false', () => {
  withBrowserSettings({ PLAYWRIGHT_HEADED: 'false', HEADLESS: 'false' }, () => {
    assert.equal(getEnvironmentConfig().headless, true);
  });
});

test('invalid PLAYWRIGHT_HEADED values fail configuration validation', () => {
  withBrowserSettings({ PLAYWRIGHT_HEADED: 'yes' }, () => {
    assert.throws(() => getEnvironmentConfig(), /PLAYWRIGHT_HEADED must be "true" or "false"/);
  });
});

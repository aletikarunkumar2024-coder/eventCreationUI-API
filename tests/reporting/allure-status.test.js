const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '../..');
const cucumberCli = path.join(
  projectRoot,
  'node_modules',
  '@cucumber',
  'cucumber',
  'bin',
  'cucumber.js',
);
const cucumberConfig = path.join(__dirname, 'fixtures', 'cucumber.js');

test('Allure maps setup-hook failures to failed while preserving pending and skipped statuses', (context) => {
  const resultsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'allure-cucumber-status-'));
  context.after(() => fs.rmSync(resultsDirectory, { recursive: true, force: true }));

  const secret = 'allure-status-regression-secret';
  const run = spawnSync(
    process.execPath,
    [cucumberCli, '--config', path.relative(projectRoot, cucumberConfig)],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        ALLURE_STATUS_TEST_RESULTS: resultsDirectory,
        TEST_PASSWORD: secret,
      },
    },
  );

  assert.equal(run.error, undefined, run.error?.message);
  assert.equal(run.status, 1);

  const results = fs
    .readdirSync(resultsDirectory)
    .filter((file) => file.endsWith('-result.json'))
    .map((file) => JSON.parse(fs.readFileSync(path.join(resultsDirectory, file), 'utf8')));
  assert.equal(results.length, 3, 'Cucumber must execute all three status regression scenarios.');
  const statusOf = (name) => results.find((result) => result.name === name)?.status;
  const failedResult = results.find(
    (result) => result.name === 'A failed setup hook produces a failed Allure result',
  );

  assert.equal(statusOf('A failed setup hook produces a failed Allure result'), 'failed');
  assert.match(failedResult.statusDetails.message, /Setup configuration failure/);
  assert.equal(statusOf('A pending scenario remains skipped in Allure'), 'skipped');
  assert.equal(
    statusOf('An intentionally skipped setup hook remains skipped in Allure'),
    'skipped',
  );

  const reportText = fs
    .readdirSync(resultsDirectory)
    .map((file) => fs.readFileSync(path.join(resultsDirectory, file)))
    .join('\n');
  assert.equal(
    reportText.includes(secret),
    false,
    'Allure output must not contain configured secrets.',
  );
});

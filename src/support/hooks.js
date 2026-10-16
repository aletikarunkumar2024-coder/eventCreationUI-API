const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  After,
  AfterAll,
  AfterStep,
  Before,
  BeforeAll,
  BeforeStep,
  Status,
  setDefaultTimeout,
} = require('@cucumber/cucumber');
const { getEnvironmentConfig } = require('../config/environment');
const { redactSensitive, safeErrorMessage } = require('../utils/diagnostics');
const { ApiManager } = require('./api-manager');
const { BrowserManager } = require('./browser-manager');
require('./world');

const browserManager = new BrowserManager();
const apiManager = new ApiManager();
const resourcesTag = '@ui or @api or @e2e';
const uiTag = '@ui or @e2e';
const apiTag = '@api or @e2e';
const secretValues = () => [process.env.TEST_PASSWORD, process.env.TEST_USERNAME];

setDefaultTimeout(getEnvironmentConfig().defaultTimeoutMs);

BeforeAll(async function () {
  browserManager.initialize();
  apiManager.initialize();
});

AfterAll(async function () {
  const failures = [];
  for (const cleanup of [() => browserManager.close(), () => apiManager.closeAll()]) {
    try {
      await cleanup();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length) {
    throw new AggregateError(failures, 'Worker-level resource cleanup failed.');
  }
});

Before(function ({ pickle }) {
  this.scenarioName = pickle.name;
  this.scenarioTags = pickle.tags.map(({ name }) => name);
});

Before({ tags: uiTag }, async function () {
  this.browser = await browserManager.getBrowser();
  this.context = await browserManager.createContext();
  this.traceStarted = true;
  this.page = await this.context.newPage();
});

Before({ tags: apiTag }, async function () {
  this.api = await apiManager.createContext();
});

BeforeStep({ tags: resourcesTag }, function ({ pickleStep }) {
  this.currentStep = pickleStep.text;
});

AfterStep({ tags: resourcesTag }, async function ({ result }) {
  if (result.status !== Status.FAILED) return;

  const diagnostic = redactSensitive(
    { scenario: this.scenarioName, step: this.currentStep, status: result.status },
    secretValues(),
  );
  try {
    await this.attach(JSON.stringify(diagnostic, null, 2), 'application/json');
  } catch {
    // A failed attachment must not obscure the step failure.
  }
});

async function attachFailureScreenshot(world, errors) {
  if (!world.page) return;
  try {
    const image = await world.page.screenshot({ fullPage: true });
    await world.attach(image, 'image/png');
  } catch (error) {
    errors.push(`Screenshot capture/attachment failed: ${safeErrorMessage(error, secretValues())}`);
  }
}

async function attachApiFailureDiagnostics(world, errors) {
  if (!world.apiResponse) return;
  try {
    const response = world.apiResponse;
    const body = await response.text();
    let parsedBody = body;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      // Keep plain-text error bodies readable.
    }
    const diagnostics = redactSensitive(
      {
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: await response.headers(),
        body: parsedBody,
      },
      secretValues(),
    );
    await world.attach(JSON.stringify(diagnostics, null, 2), 'application/json');
  } catch (error) {
    errors.push(`API diagnostics failed: ${safeErrorMessage(error, secretValues())}`);
  }
}

async function stopTrace(world, failed, errors) {
  if (!world.context || !world.traceStarted) return;
  world.traceStarted = false;
  let traceDirectory;
  try {
    if (failed) {
      traceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'cucumber-playwright-trace-'));
      const tracePath = path.join(traceDirectory, 'trace.zip');
      await world.context.tracing.stop({ path: tracePath });
      await world.attach(await fs.readFile(tracePath), 'application/zip');
    } else {
      await world.context.tracing.stop();
    }
  } catch (error) {
    errors.push(`Trace finalization/attachment failed: ${safeErrorMessage(error, secretValues())}`);
  } finally {
    if (traceDirectory) {
      try {
        await fs.rm(traceDirectory, { recursive: true, force: true });
      } catch (error) {
        errors.push(`Temporary trace cleanup failed: ${safeErrorMessage(error, secretValues())}`);
      }
    }
  }
}

After({ tags: resourcesTag }, async function ({ result, error }) {
  const failed = result?.status === Status.FAILED || Boolean(error);
  const cleanupErrors = [];
  if (failed && this.page) await attachFailureScreenshot(this, cleanupErrors);
  if (failed) await attachApiFailureDiagnostics(this, cleanupErrors);
  await stopTrace(this, failed, cleanupErrors);

  for (const cleanup of [
    async () => {
      if (this.context) await this.context.close();
    },
    async () => {
      if (this.api) await apiManager.closeContext(this.api);
    },
  ]) {
    try {
      await cleanup();
    } catch (cleanupError) {
      cleanupErrors.push(safeErrorMessage(cleanupError, secretValues()));
    }
  }

  this.page = undefined;
  this.context = undefined;
  this.api = undefined;
  this.apiResponse = undefined;

  if (cleanupErrors.length) {
    const diagnostic = cleanupErrors.join('\n');
    if (failed) {
      try {
        await this.attach(`Resource cleanup diagnostics:\n${diagnostic}`, 'text/plain');
      } catch {
        // Preserve the original scenario failure if cleanup diagnostics cannot be attached.
      }
    } else {
      throw new AggregateError(
        cleanupErrors.map((message) => new Error(message)),
        'Scenario resource cleanup failed.',
      );
    }
  }
});

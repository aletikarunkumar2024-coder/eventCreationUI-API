const AllureCucumberReporter = require('allure-cucumberjs/reporter');
const { Stage, Status } = require('allure-js-commons');
const { safeErrorMessage } = require('../utils/diagnostics');

function configuredSecrets() {
  return Object.entries(process.env)
    .filter(
      ([name, value]) =>
        value &&
        /password|passwd|token|secret|authorization|cookie|api[_-]?key|credential/i.test(name),
    )
    .map(([, value]) => value);
}

function getSanitizedFailure(result) {
  const exception = result.exception || {};
  const secrets = configuredSecrets();
  const message = safeErrorMessage(
    result.message || exception.message || 'Cucumber hook failed.',
    secrets,
  );
  const trace = safeErrorMessage(exception.stackTrace || '', secrets);
  return {
    message,
    trace,
  };
}

function sanitizeHookResult(result) {
  if (result.status !== 'FAILED') return result;

  const failure = getSanitizedFailure(result);
  return {
    ...result,
    message: failure.message,
    exception: result.exception
      ? {
          ...result.exception,
          message: failure.message,
          stackTrace: failure.trace,
        }
      : result.exception,
  };
}

class StatusAwareAllureCucumberReporter extends AllureCucumberReporter {
  constructor(options) {
    super(options);
    this.failedHookResults = new Map();
  }

  onTestStepFinished(data) {
    const testStep = this.testStepMap.get(data.testStepId);
    const isFailedHook = testStep?.hookId && data.testStepResult.status === 'FAILED';

    if (isFailedHook) {
      const hook = this.beforeHooks[testStep.hookId] || this.afterHooks[testStep.hookId];
      const failure = getSanitizedFailure(data.testStepResult);
      this.failedHookResults.set(data.testCaseStartedId, {
        hookName: hook?.name || 'Cucumber hook',
        ...failure,
      });
    }

    const safeData = isFailedHook
      ? { ...data, testStepResult: sanitizeHookResult(data.testStepResult) }
      : data;
    super.onTestStepFinished(safeData);
  }

  onTestCaseFinished(data) {
    const failure = this.failedHookResults.get(data.testCaseStartedId);
    if (failure) {
      const testUuid = this.testResultUuids.get(data.testCaseStartedId);
      if (!testUuid) {
        throw new Error('Unable to map a failed Cucumber hook to its Allure test result.');
      }

      const start = Date.now();
      const stepUuid = this.allureRuntime.startStep(testUuid, undefined, {
        name: `Setup hook failed: ${failure.hookName}`,
        start,
      });
      if (!stepUuid) {
        throw new Error('Unable to create an Allure failure step for the failed Cucumber hook.');
      }
      this.allureRuntime.updateStep(stepUuid, (step) => {
        step.status = Status.FAILED;
        step.stage = Stage.FINISHED;
        step.statusDetails = failure;
      });
      this.allureRuntime.stopStep(stepUuid, { stop: Date.now() });
      this.failedHookResults.delete(data.testCaseStartedId);
    }

    super.onTestCaseFinished(data);
  }
}

module.exports = StatusAwareAllureCucumberReporter;

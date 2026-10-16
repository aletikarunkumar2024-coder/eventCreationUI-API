const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

test('VS Code scenario commands launch the project runner with Node and the selected line', async () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const featurePath = path.join(projectRoot, 'features', 'e2e', 'event-booking.feature');
  const uri = { fsPath: featurePath, toString: () => featurePath };
  const folder = { uri: { fsPath: projectRoot } };
  const commands = new Map();
  const tasks = [];
  const debugConfigurations = [];

  class Task {
    constructor(scope, taskFolder, name, source, execution, problemMatchers) {
      Object.assign(this, { scope, folder: taskFolder, name, source, execution, problemMatchers });
    }
  }

  class ProcessExecution {
    constructor(command, args, options) {
      Object.assign(this, { command, args, options });
    }
  }

  class CodeLens {
    constructor(range, command) {
      Object.assign(this, { range, command });
    }
  }

  const vscode = {
    workspace: {
      getWorkspaceFolder: () => folder,
      openTextDocument: async () => ({
        lineAt: () => ({
          text: '  Scenario: Create a new event, book one ticket, and verify that one seat is deducted',
        }),
      }),
    },
    tasks: {
      executeTask: async (task) => tasks.push(task),
    },
    debug: {
      startDebugging: async (taskFolder, configuration) => {
        debugConfigurations.push({ folder: taskFolder, configuration });
        return true;
      },
    },
    languages: {
      registerCodeLensProvider: () => ({ dispose() {} }),
    },
    commands: {
      registerCommand: (name, callback) => {
        commands.set(name, callback);
        return { dispose() {} };
      },
    },
    Task,
    ProcessExecution,
    CodeLens,
    Range: class Range {},
  };

  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (request === 'vscode') return vscode;
    return originalLoad.call(this, request, parent, isMain);
  };

  const extensionPath = path.resolve(
    __dirname,
    '../../vscode-extension/cucumber-scenario-runner/extension.js',
  );
  delete require.cache[extensionPath];

  try {
    const extension = require(extensionPath);
    extension.activate({ subscriptions: [] });

    await commands.get('cucumberScenarioRunner.run')(uri, 3);
    const runTask = tasks[0];
    assert.equal(runTask.execution.command, 'node');
    assert.equal(runTask.execution.options.cwd, projectRoot);
    assert.deepEqual(runTask.execution.args, [
      path.join(projectRoot, 'scripts', 'run-e2e-debug.js'),
      '--feature',
      path.join('features', 'e2e', 'event-booking.feature'),
      '--line',
      '4',
      '--run',
    ]);

    await commands.get('cucumberScenarioRunner.debug')(uri, 3);
    const { configuration } = debugConfigurations[0];
    assert.equal(configuration.type, 'node');
    assert.equal(configuration.request, 'launch');
    assert.equal(configuration.program, path.join(projectRoot, 'scripts', 'run-e2e-debug.js'));
    assert.deepEqual(configuration.args, [
      '--feature',
      path.join('features', 'e2e', 'event-booking.feature'),
      '--line',
      '4',
      '--node-debug',
    ]);
    assert.equal(Object.hasOwn(configuration, 'runtimeExecutable'), false);
  } finally {
    Module._load = originalLoad;
    delete require.cache[extensionPath];
  }
});

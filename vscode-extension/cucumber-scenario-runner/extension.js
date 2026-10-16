const path = require('node:path');
const vscode = require('vscode');

const SCENARIO_PATTERN = /^\s*Scenario(?: Outline| Template)?:\s*(.+)$/;

function scenarioAtLine(document, line) {
  const match = document.lineAt(line).text.match(SCENARIO_PATTERN);
  return match?.[1]?.trim() || `line ${line + 1}`;
}

async function scenarioArguments(uri, line) {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder) throw new Error('Open the project folder before running a Cucumber scenario.');

  const projectRoot = folder.uri.fsPath;
  const featurePath = path.relative(projectRoot, uri.fsPath);
  if (
    featurePath.startsWith(`..${path.sep}`) ||
    featurePath === '..' ||
    path.isAbsolute(featurePath) ||
    path.extname(featurePath) !== '.feature'
  ) {
    throw new Error('The selected feature must be inside the current workspace folder.');
  }

  const document = await vscode.workspace.openTextDocument(uri);
  return {
    folder,
    projectRoot,
    featurePath,
    scenarioName: scenarioAtLine(document, line),
    line: line + 1,
  };
}

function commandArguments(selection, mode) {
  return [
    path.join(selection.projectRoot, 'scripts', 'run-e2e-debug.js'),
    '--feature',
    selection.featurePath,
    '--line',
    String(selection.line),
    mode,
  ];
}

async function runScenario(uri, line) {
  const selection = await scenarioArguments(uri, line);
  const task = new vscode.Task(
    { type: 'cucumberScenario' },
    selection.folder,
    `Run: ${selection.scenarioName}`,
    'Cucumber Scenario',
    new vscode.ProcessExecution('node', commandArguments(selection, '--run'), {
      cwd: selection.projectRoot,
    }),
    [],
  );
  await vscode.tasks.executeTask(task);
}

async function debugScenario(uri, line) {
  const selection = await scenarioArguments(uri, line);
  const started = await vscode.debug.startDebugging(selection.folder, {
    name: `Debug: ${selection.scenarioName}`,
    type: 'node',
    request: 'launch',
    program: path.join(selection.projectRoot, 'scripts', 'run-e2e-debug.js'),
    args: ['--feature', selection.featurePath, '--line', String(selection.line), '--node-debug'],
    cwd: selection.projectRoot,
    autoAttachChildProcesses: true,
    console: 'integratedTerminal',
    internalConsoleOptions: 'neverOpen',
  });
  if (!started) {
    throw new Error(`VS Code could not start debugging "${selection.scenarioName}".`);
  }
}

function activate(context) {
  const selector = [{ language: 'cucumber', scheme: 'file' }];
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(selector, {
      provideCodeLenses(document) {
        const lenses = [];
        for (let line = 0; line < document.lineCount; line += 1) {
          const match = document.lineAt(line).text.match(SCENARIO_PATTERN);
          if (!match) continue;
          const range = new vscode.Range(line, 0, line, document.lineAt(line).text.length);
          lenses.push(
            new vscode.CodeLens(range, {
              title: '$(play) Run Scenario',
              command: 'cucumberScenarioRunner.run',
              arguments: [document.uri, line],
            }),
            new vscode.CodeLens(range, {
              title: '$(debug-alt) Debug Scenario',
              command: 'cucumberScenarioRunner.debug',
              arguments: [document.uri, line],
            }),
          );
        }
        return lenses;
      },
    }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberScenarioRunner.run', runScenario),
    vscode.commands.registerCommand('cucumberScenarioRunner.debug', debugScenario),
  );
}

function deactivate() {}

module.exports = { activate, deactivate };

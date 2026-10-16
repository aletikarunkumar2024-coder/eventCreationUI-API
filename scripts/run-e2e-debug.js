const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const loaded = dotenv.config({ path: envPath, quiet: true });

function readArguments(args) {
  const options = { mode: 'inspector' };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--run') {
      options.mode = 'run';
    } else if (argument === '--node-debug') {
      options.mode = 'node-debug';
    } else if (argument === '--dry-run') {
      options.dryRun = true;
    } else if (argument === '--feature' || argument === '--line' || argument === '--name') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${argument} requires a value.`);
      }
      options[argument.slice(2)] = value;
      index += 1;
    } else {
      throw new Error(`Unsupported debug-runner argument: ${argument}`);
    }
  }
  return options;
}

function getScenarioSelection(options) {
  const defaultFeature = path.join('features', 'e2e', 'event-booking.feature');
  const feature = options.feature || defaultFeature;
  const absoluteFeature = path.resolve(projectRoot, feature);
  const relativeFeature = path.relative(projectRoot, absoluteFeature);
  if (
    relativeFeature.startsWith(`..${path.sep}`) ||
    relativeFeature === '..' ||
    path.isAbsolute(relativeFeature) ||
    path.extname(absoluteFeature) !== '.feature'
  ) {
    throw new Error('--feature must point to a .feature file inside the project.');
  }

  let scenarioPath = relativeFeature.split(path.sep).join('/');
  if (options.line !== undefined) {
    const line = Number(options.line);
    if (!Number.isInteger(line) || line < 1) {
      throw new Error('--line must be a positive, one-based line number.');
    }
    scenarioPath += `:${line}`;
  } else if (!options.name && !options.feature) {
    options.name = 'Create a new event, book one ticket, and verify that one seat is deducted';
  }

  return { scenarioPath, name: options.name };
}

let options;
try {
  options = readArguments(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (loaded.error && loaded.error.code !== 'ENOENT') {
  console.error(`Unable to load environment configuration: ${loaded.error.message}`);
  process.exit(1);
}

const defaultFeature = path.join('features', 'e2e', 'event-booking.feature');
const selectedFeature = path.resolve(projectRoot, options.feature || defaultFeature);
const isEventHubScenario =
  path.relative(projectRoot, selectedFeature).split(path.sep).join('/') ===
  'features/e2e/event-booking.feature';
const requiredVariables = isEventHubScenario
  ? [
      'BASE_URL',
      'TEST_USERNAME',
      'TEST_PASSWORD',
      'EVENT_CITY',
      'EVENT_VENUE',
      'TEST_CUSTOMER_NAME',
      'TEST_CUSTOMER_EMAIL',
      'TEST_CUSTOMER_PHONE',
    ]
  : [];
const missingVariables = requiredVariables.filter((name) => !process.env[name]?.trim());

if (missingVariables.length) {
  console.error(`Missing required EventHub configuration: ${missingVariables.join(', ')}`);
  process.exit(1);
}

let selection;
try {
  selection = getScenarioSelection(options);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const cucumberCli = path.join(
  projectRoot,
  'node_modules',
  '@cucumber',
  'cucumber',
  'bin',
  'cucumber.js',
);
const environment = {
  ...process.env,
  CUCUMBER_SCENARIO_PATH: selection.scenarioPath,
  CUCUMBER_PARALLEL: '0',
  PLAYWRIGHT_HEADED: 'true',
};
const cucumberArguments = [cucumberCli];
cucumberArguments.push('--format', 'summary');
if (selection.name) {
  cucumberArguments.push('--name', `^${selection.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}
if (options.dryRun) cucumberArguments.push('--dry-run');

if (options.mode === 'inspector') {
  environment.PWDEBUG = '1';
  environment.DEFAULT_TIMEOUT_MS = '3600000';
} else if (options.mode === 'node-debug') {
  environment.PWDEBUG = '0';
  environment.DEFAULT_TIMEOUT_MS = '3600000';
}

const result = spawnSync(process.execPath, cucumberArguments, {
  cwd: projectRoot,
  env: environment,
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Unable to start the focused Cucumber run: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);

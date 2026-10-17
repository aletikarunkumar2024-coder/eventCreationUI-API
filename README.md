# Playwright + Cucumber Automation Framework

A JavaScript automation framework foundation for browser UI, HTTP API, and combined
end-to-end tests using Playwright and Cucumber.

## Prerequisites

- Node.js 22 or 24 (Node.js 24 LTS recommended)
- npm
- Java 8 or newer (only required to generate/open the Allure HTML report)
- An approved non-production application environment and dedicated test account

## Setup

```powershell
npm ci
npm run install:browsers
Copy-Item .env.example .env
```

Populate `.env` only with approved application URLs and dedicated test credentials.
The example intentionally contains no real endpoints, selectors, credentials, or
application behavior. Do not run destructive tests against production.

## Commands

| Command                                                                              | Purpose                                                      |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `npm test`                                                                           | Run all discovered Cucumber features                         |
| `npm run test:ui`                                                                    | Run scenarios tagged `@ui`                                   |
| `npm run test:ui:unit`                                                               | Run browser-backed LoginPage tests on a synthetic fixture    |
| `npm run test:api`                                                                   | Run scenarios tagged `@api`                                  |
| `npm run test:e2e`                                                                   | Run scenarios tagged `@e2e`                                  |
| `npm run test:e2e:scenario -- --name "Scenario name"`                                | Run one named scenario in headed mode                        |
| `npm run test:e2e:scenario -- --feature features/e2e/event-booking.feature --line 4` | Run one scenario by feature line in headed mode              |
| `npm run test:e2e:debug`                                                             | Debug the default EventHub scenario in headed Inspector mode |
| `npm run test:e2e:utils`                                                             | Run event-booking date and seat parsing tests                |
| `npm run test:smoke`                                                                 | Run scenarios tagged `@smoke`                                |
| `npm run test:regression`                                                            | Run scenarios tagged `@regression`                           |
| `npm run test:parallel`                                                              | Run scenarios with four Cucumber workers                     |
| `npm run report:allure`                                                              | Generate an Allure report from collected results             |
| `npm run report:open`                                                                | Open the generated Allure report                             |
| `npm run lint`                                                                       | Lint JavaScript files                                        |
| `npm run format:check`                                                               | Check formatting                                             |

## Jenkins CI pipeline

The root `Jenkinsfile` targets a Windows Jenkins agent labelled `windows` and
uses Node.js 24. It installs locked dependencies with `npm ci`, installs
Playwright Chromium, runs the existing lint/format and Node.js test scripts,
and then runs the `@e2e` Cucumber feature headlessly. That E2E scenario creates
an EventHub event and books one ticket; use only an approved QA/staging
environment and a dedicated test account. The pipeline fixes `TEST_ENV=qa` and
fails the E2E stage when required inputs are missing. `TEST_ENV=qa` does not
verify that a supplied URL is actually non-production, so restrict who can run
the job and supply only approved non-production URLs.

### Jenkins prerequisites

- Jenkins with Pipeline, Git, NodeJS, Credentials Binding, and JUnit plugins.
- An online Windows agent labelled `windows`, with network access to npm and the
  approved QA app/API, and enough disk space to install Node dependencies and
  Chromium. The agent account must be able to run Windows batch commands.
- A NodeJS tool installation named exactly `NodeJS 24`, configured under
  **Manage Jenkins > Tools** with Node.js 24.
- Java 8 or newer on the agent for generating the Allure HTML report.
- The pipeline generates and archives Allure results and the Allure HTML report.
  Publishing Allure as a separate Jenkins report requires the Allure Jenkins
  plugin and an `allure` publisher step in the Jenkinsfile.

### Create and configure the Jenkins job

1. Configure a Windows Jenkins node/agent and assign it the label `windows`.
   Confirm it can reach npm and the approved QA application/API.
2. Under **Manage Jenkins > Tools**, add a NodeJS installation named exactly
   `NodeJS 24` and configure it to provide Node.js 24.
3. Ensure the branch containing the root `Jenkinsfile` is available in the
   repository. Create a **Multibranch Pipeline** job or a **Pipeline** job
   configured to load that `Jenkinsfile`. For a private repository, configure
   SCM checkout with an approved Jenkins credential (for example, a GitHub App
   credential or a username and fine-grained token); never put a token in the
   repository URL, `Jenkinsfile`, or build parameters. The Jenkinsfile checks
   out the job's configured SCM using `checkout scm`.
4. In **Manage Jenkins > Credentials**, add a **Username with password**
   credential with ID `eventhub-qa-test-account`. Use only the dedicated
   non-production account. The pipeline binds its username/password to
   `TEST_USERNAME`/`TEST_PASSWORD`; it does not echo these values.
5. Run the pipeline once so Jenkins loads the parameter definitions from the
   Jenkinsfile. The first run may fail at the E2E preflight because the
   parameters are blank; it will not start the E2E test without the required
   values.
6. Select **Build with Parameters** and enter the seven non-secret values:
   `BASE_URL`, `API_BASE_URL`, `EVENT_CITY`, `EVENT_VENUE`,
   `TEST_CUSTOMER_NAME`, `TEST_CUSTOMER_EMAIL`, and `TEST_CUSTOMER_PHONE`.
   Use approved QA endpoints and synthetic test customer data. These are build
   parameters and are not secret storage; do not put credentials, tokens, or
   other secrets in them. `TEST_ENV` is fixed to `qa` by the pipeline.
7. Start the parameterized build. Configure a repository webhook or SCM polling
   separately if you want later commits to trigger builds automatically.

The generated Cucumber JSON, HTML, JUnit XML, Allure results, and generated
Allure HTML report are archived under the build's **Artifacts**. JUnit results
are published in the Jenkins **Tests** view. Allure report generation uses the
included CLI; Java is required for that generation. The optional Allure Jenkins
plugin can publish results in the Jenkins UI after its pipeline publisher is
added to the Jenkinsfile.

The E2E stage requires `API_BASE_URL` because the shared Cucumber hooks create an
API context for `@e2e` scenarios. A successful booking is not cancelled or
deleted by the feature; created test events remain in the QA application. Do not
run the job against production or with real customer data.

### Run checks from VS Code

From the VS Code PowerShell terminal, run the safe local checks with:

```powershell
npm ci
npm run install:browsers
npm run lint
npm run format:check
npm run test:config
npm run test:ui:unit
npm run test:e2e:utils
npm run test:global-cache
npm run test:reporting
npm run test:vscode
```

These commands validate the project but do not execute the Jenkinsfile. To run
the Jenkins pipeline, commit and push the reviewed changes to the configured
branch using the organization's approved Git installation; then trigger the
branch build in Jenkins (or let the configured SCM webhook do so). On a push
blocked by Windows Application Control, follow the Git troubleshooting steps
below and do not bypass the policy.

### Jenkins and Git troubleshooting

- **Checkout authentication:** verify the selected Jenkins SCM credential is
  authorized for the repository and that the job is using the expected branch.
  Keep GitHub tokens in Jenkins Credentials, not in a URL or console command.
- **Node.js tool not found:** configure the NodeJS installation with the exact
  name `NodeJS 24`, then confirm the agent has network access if Jenkins installs
  Node.js automatically.
- **Playwright browser installation fails:** check the Windows agent's network
  access and permissions to install Chromium in the Jenkins agent account's
  Playwright browser cache.
- **E2E preflight reports a missing value:** supply all seven build parameters
  and the `eventhub-qa-test-account` Jenkins credential. Values are validated
  without printing them.
- **Allure HTML generation fails:** check that Java 8+ is available; inspect
  archived `reports/allure-results` even if HTML generation could not complete.
- **A test fails:** use the Jenkins Tests view and archived Cucumber/Allure
  artifacts. The pipeline does not suppress test failures.
- **Windows `git push` is blocked loading `libcurl-4.dll`:** do not disable
  Windows Application Control or replace the DLL manually. Record the exact
  error, run `where.exe git`, `git --exec-path`, and `git --version
--build-options`, and compare `Get-Command git -All` with the expected
  organization-approved Git for Windows installation. To inspect recent local
  policy events, run:

```powershell
Get-WinEvent -FilterHashtable @{
  LogName = 'Microsoft-Windows-CodeIntegrity/Operational'
  StartTime = (Get-Date).AddHours(-4)
} | Select-Object TimeCreated, Id, Message | Format-List
```

Ask IT to review the matching event and repair/reinstall Git through an
approved source if a file is blocked or mismatched. The current Git
configuration uses the Windows Schannel TLS backend and Git Credential
Manager; do not change TLS settings or bypass policy as a workaround. Do not
force-push.

The Cucumber configuration writes HTML and JSON reports to `reports/` and Allure
results to `reports/allure-results/`. It also writes JUnit XML to
`reports/cucumber-junit.xml` for Jenkins test-result publishing. Report outputs
are ignored by Git.
Generating the Allure HTML report with the included Allure 2 CLI requires Java.

## Run or debug one scenario in VS Code

The installed official Cucumber extension provides Gherkin language support but
does not provide scenario Run/Debug CodeLens actions. The installed Cucumber
Runner extension does provide CodeLens, but it supports Ruby, Java, and Go—not
JavaScript/Node. This project includes a small JavaScript-aware CodeLens
extension in `vscode-extension/cucumber-scenario-runner` for this framework.

Package and install the workspace extension once, then reload the VS Code window:

```powershell
Push-Location vscode-extension/cucumber-scenario-runner
npx --yes @vscode/vsce package --out "$env:TEMP\cucumber-scenario-runner.vsix"
Pop-Location
code --install-extension "$env:TEMP\cucumber-scenario-runner.vsix"
```

The workspace settings configure the official Cucumber extension to discover
`features/**/*.feature` and the JavaScript step/support files. After reloading,
each scenario header has **Run Scenario** and **Debug Scenario** CodeLens actions.
Run launches only the selected feature line through the existing environment
preflight and Cucumber configuration. Debug uses VS Code's Node debugger with
child-process attachment enabled, so breakpoints in hooks, step definitions,
Page Objects, and utilities can be hit. Both modes preserve the existing Cucumber
formatters, hooks, World, and resource cleanup. Debug is headed and does not set
Playwright Inspector mode; use VS Code breakpoints and the Debug toolbar to
continue or stop.

The CodeLens extension invokes `node` from the environment's PATH rather than
`process.execPath`, which is the VS Code executable inside an extension host.
Its Debug action omits a custom runtime executable so VS Code's Node debugger
uses its configured Node runtime.

Fallback commands for the EventHub scenario:

```powershell
npm run test:e2e:scenario -- --name "Create a new event, book one ticket, and verify that one seat is deducted"
npm run test:e2e:scenario -- --feature features/e2e/event-booking.feature --line 4
```

The named/line-specific runner requires the EventHub variables described below
and fails before Cucumber/browser startup if they are missing.

`PLAYWRIGHT_HEADED=true` launches browsers visibly, while
`PLAYWRIGHT_HEADED=false` forces headless mode. If it is unset, `HEADLESS`
continues to control mode and defaults to headless for CI. Single-scenario Run
and Debug launchers set `PLAYWRIGHT_HEADED=true`; API-only scenarios continue
not to create a browser.

## General global cache

`src/utils/global-cache.js` provides a JSON key/value cache backed by the root
`global-cache.json`. The generated file is ignored by Git and must contain test
data only. Use `setCache(key, value)`, `getCache(key)`, `removeCache(key)`, and
`clearCache()`; a missing key returns `undefined`. This lightweight utility
reads and writes the JSON file directly; don't use it for concurrent writers or
credentials, tokens, or other secrets.

The EventHub confirmation-reference step also stores the reference under
`bookingId` and `bookingReference`, plus the `eventTitle`. A separate scenario
can retrieve it, verify it in My Bookings, and only then remove these keys:

```gherkin
Scenario: Create and cache a booking
  Given I am logged into EventHub
  When I create a new event for booking
  Then I capture the new event's initial seat count
  When I start booking the new event
  And I complete a one-ticket booking for the new event
  Then I capture the booking confirmation reference

Scenario: Verify a booking from the global cache
  Given I am logged into EventHub
  When I find the booking stored in the global cache in My Bookings
  Then I remove the booking values from the global cache after verification
```

The consumer retains the cached values if lookup or verification fails because
the removal step is reached only after verification succeeds. Run
`npm run test:global-cache` for isolated tests using temporary files; they do
not modify the project cache or create/cancel application bookings.

## Project structure

```text
features/                 Gherkin features and step definitions
  ui/
  api/
  e2e/
  step-definitions/
    ui/
    api/
    e2e/
src/
  support/                Cucumber World, hooks, browser and API lifecycle
  pages/                  Page objects
  components/             Reusable UI components
  clients/                 API clients
  services/                Application service workflows
  assertions/              Shared domain assertions
  config/                  Environment configuration
  data/                    Test data
  fixtures/                Reusable test fixtures
  utils/                   Shared utilities
reports/                   Generated reports (not tracked)
scripts/                   Framework scripts
```

This repository currently contains the framework configuration and directory
foundation, scenario resource lifecycle, and a configurable sample login flow.
Application-specific selectors and business behavior remain unconfigured until
the application details are supplied.

## Scenario resource lifecycle

- `BeforeAll` validates and initializes worker-local browser and API managers;
  `AfterAll` attempts both manager cleanups and reports cleanup errors.
- `@ui` and `@e2e` scenarios share a worker browser but receive a fresh browser
  context and page for every scenario. Tracing starts with each context; failed
  scenarios attach a screenshot and trace.
- `@api` and `@e2e` scenarios receive a fresh Playwright API request context.
  `API_BASE_URL` (or `BASE_URL`) is required only when such a scenario runs.
- Scenario teardown attempts trace finalization, browser-context closure, and API
  context disposal independently. Cleanup or diagnostic errors do not replace an
  existing scenario failure.
- Failed-step and API response diagnostics redact common credential fields,
  bearer tokens, and configured test username/password values.

Set `API_HEADERS_JSON` to a JSON object of string-valued default request headers
when a non-secret header configuration is needed. Keep any secret header values
in the untracked `.env` file; never print them in test steps or diagnostics.

## Login page tests

`npm run test:ui:unit` validates the reusable LoginPage and its configuration
using an isolated synthetic browser fixture. These tests do not connect to an
application or require application credentials.

## EventHub seat-inventory booking scenario

`features/e2e/event-booking.feature` creates a uniquely titled event, books one
ticket, verifies that exact booking reference in My Bookings, and checks the
event's seat count decreased by exactly one. Run it with `npm run test:e2e`.

Configure `TEST_USERNAME`, `TEST_PASSWORD`, `EVENT_CITY`, `EVENT_VENUE`,
`TEST_CUSTOMER_NAME`, `TEST_CUSTOMER_EMAIL`, and `TEST_CUSTOMER_PHONE` in `.env`
using authorized account credentials and dedicated test data. `EVENT_DESCRIPTION`
is optional; if omitted, the scenario uses a description identifying the generated
test event. Event creation is blocked when `TEST_ENV=production`. No event-delete
API was provided or assumed, so a successfully created test event is retained.

The date helper produces a local `YYYY-MM-DDTHH:mm` value seven days ahead, the
standard `datetime-local` input representation. The admin route requires
authentication, so its actual date field could not be inspected anonymously;
confirm the application accepts that input format when authorized credentials
are configured. The public login form was inspected and uses accessible labels
`Email` and `Password` plus button `#login-btn`; credentials are filled only from
the environment. Do not enter credentials in feature files or source code.

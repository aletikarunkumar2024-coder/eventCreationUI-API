require('dotenv').config();

const scenarioPath = process.env.CUCUMBER_SCENARIO_PATH;

module.exports = {
  default: {
    paths: scenarioPath ? [scenarioPath] : ['features/**/*.feature'],
    import: ['features/step-definitions/**/*.js', 'src/support/**/*.js'],
    format: [
      'progress',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json',
      'junit:reports/cucumber-junit.xml',
      './src/reporting/allure-cucumber-reporter.js',
    ],
    formatOptions: {
      resultsDir: 'reports/allure-results',
    },
    publishQuiet: true,
    retry: 0,
    parallel: Number(process.env.CUCUMBER_PARALLEL ?? 0),
  },
};

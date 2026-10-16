const path = require('node:path');

module.exports = {
  default: {
    paths: [path.join(__dirname, 'allure-status.feature')],
    import: [
      path.join(__dirname, 'allure-status.hooks.js'),
      path.join(__dirname, 'allure-status.steps.js'),
    ],
    format: ['summary', './src/reporting/allure-cucumber-reporter.js'],
    formatOptions: {
      resultsDir: process.env.ALLURE_STATUS_TEST_RESULTS,
    },
    publishQuiet: true,
  },
};

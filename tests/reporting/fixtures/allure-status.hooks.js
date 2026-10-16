const { Before } = require('@cucumber/cucumber');

Before({ name: 'Fail setup for status regression', tags: '@report-failed-hook' }, function () {
  throw new Error(`Setup configuration failure: ${process.env.TEST_PASSWORD}`);
});

Before({ name: 'Skip setup for status regression', tags: '@report-skipped-hook' }, function () {
  return 'skipped';
});

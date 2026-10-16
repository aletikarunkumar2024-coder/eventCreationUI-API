const { World, setWorldConstructor } = require('@cucumber/cucumber');

class AutomationWorld extends World {
  constructor(options) {
    super(options);
    this.browser = undefined;
    this.context = undefined;
    this.page = undefined;
    this.api = undefined;
    this.apiResponse = undefined;
    this.testData = {};
    this.scenarioName = '';
    this.scenarioTags = [];
    this.traceStarted = false;
  }
}

setWorldConstructor(AutomationWorld);

module.exports = { AutomationWorld };

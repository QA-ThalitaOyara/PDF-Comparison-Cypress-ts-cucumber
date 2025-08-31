import { defineConfig } from 'cypress';
import createBundler from '@bahmutov/cypress-esbuild-preprocessor';
import { createEsbuildPlugin } from '@badeball/cypress-cucumber-preprocessor/esbuild';
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';

export default defineConfig({
  e2e: {
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);
      on('file:preprocessor', createBundler({ plugins: [createEsbuildPlugin(config)] }));

      const { comparePDFs } = require('./tasks/comparePDFs');
      on('task', { comparePDFs });

      return config;
    },
    specPattern: 'cypress/e2e/**/*.feature',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    downloadsFolder: 'cypress/downloads',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 30000,
    pageLoadTimeout: 60000,
  },
});

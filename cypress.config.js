const { defineConfig } = require('cypress');
const { resetPosition } = require('./cypress/support/position-data');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/integration/**/*.spec.js',
    supportFile: false,
    setupNodeEvents(on) {
      on('task', {
        resetPosition,
        logPositionRequests(requests) {
          console.log('Position load responses in arrival order:', JSON.stringify(requests));
          return null;
        },
      });
    },
  },
});

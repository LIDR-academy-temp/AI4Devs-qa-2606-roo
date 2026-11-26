const { defineConfig } = require('cypress');

// Desde Cypress 10 la carpeta estándar es cypress/e2e y los ficheros se llaman *.cy.js.
// El enunciado pide cypress/integration/position.spec.js, así que se mantiene esa ruta con specPattern.
module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000', // frontend (`npm start` en /frontend). Se puede cambiar con CYPRESS_BASE_URL
    specPattern: 'cypress/integration/**/*.spec.js',
    supportFile: false,
    video: false,
  },
});

const js = require("@eslint/js");
const globals = require("globals");
const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Se usa "unused vars" para que las variables sin usar sean solo advertencias
      // y que ignore los argumentos de las funciones (como 'next')
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }]
    }
  },
  {
    // Configuración específica para los archivos del frontend (navegador)
    files: ["public/js/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser, // Le enseña qué es 'document', 'window', etc.
      },
    },
  },
  {
    // Los tests usan las funciones globales de Jest.
    files: ["tests/**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
]);
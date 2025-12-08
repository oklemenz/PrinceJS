"use strict";

const globals = require("globals");
const js = require("@eslint/js");

const configPrettier = require("eslint-config-prettier");

module.exports = [
  {
    ignores: ["**/lib/", "**/node_modules/"]
  },
  js.configs.recommended,
  configPrettier,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "commonjs",
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname
      },
      globals: {
        ...globals.node,
        document: false,
        window: false,
        history: false,
        PrinceJS: false,
        Phaser: false
      }
    },
    rules: {
      strict: ["error"],
      curly: ["error"],
      "no-unused-vars": ["off"],
      "no-restricted-modules": ["off"],
      "no-eval": ["error"],
      "no-implied-eval": ["error"],
      "no-console": ["error"],
      "no-throw-literal": ["error"],
      "no-control-regex": ["off"],
      "no-constant-binary-expression": ["off"],
      "no-inner-declarations": ["off"],
      "prefer-promise-reject-errors": ["error"],
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-var": ["error"],
      "no-prototype-builtins": ["off"]
    }
  }
];

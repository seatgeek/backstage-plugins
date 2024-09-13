/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/ban-types': 'off',
  },
  env: {
    browser: false,
    node: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  ignorePatterns: ['wasm', 'dist'],
  plugins: ['@typescript-eslint'],
};

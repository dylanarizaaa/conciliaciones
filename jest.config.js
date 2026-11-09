// @ts-check
const { createCjsPreset } = require('jest-preset-angular/presets');

/**
 * Pruebas unitarias con Jest + jest-preset-angular (Angular sin zone.js).
 * Solo se ejecutan y miden las pruebas de `src/`: los componentes generados de spartan.ng en
 * `libs/` quedan fuera de las pruebas y de la cobertura (se compilan solo porque `src/` los usa).
 *
 * @type {import('jest').Config}
 */
module.exports = {
  ...createCjsPreset({ testEnvironment: 'jest-preset-angular/environments/jest-jsdom-env' }),
  roots: ['<rootDir>/src'],
  // Además de los `.mjs` del preset, TanStack publica ESM en `.js` (sirve para npm y pnpm).
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@angular/common/locales/.*\\.js$|.*@tanstack/.*\\.js$))',
  ],
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/libs/', '<rootDir>/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleNameMapper: {
    // Mismos alias que `tsconfig.json` (componentes de spartan.ng en `libs/ui`).
    '^@spartan-ng/helm/(.*)$': '<rootDir>/libs/ui/$1/src/index.ts',
  },
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.spec.ts',
    '!src/app/**/*.routes.ts',
    '!src/app/app.config.ts',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/libs/'],
  coverageDirectory: '<rootDir>/coverage',
};

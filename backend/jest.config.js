/** @type {import('jest').Config} */
module.exports = {
  // Run both suites by default when `npm test` is called
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/tests/unit/**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
      },
      // Unit tests must never touch the real DB or network
      testTimeout: 10000,
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/tests/integration/**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
      },
      // Integration tests may need DB connection time
      testTimeout: 30000,
      // Load .env before integration tests run
      globalSetup: undefined,
      setupFiles: ['<rootDir>/src/tests/integration/setup.ts'],
    },
  ],

  // Shared settings
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/tests/**',
    '!src/**/*.d.ts',
  ],
};

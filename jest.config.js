/** @type {import('jest').Config} */
const config = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest/presets/default-esm',
  
  // Test environment
  testEnvironment: 'node',
  
  // Enable ES modules
  extensionsToTreatAsEsm: ['.ts'],
  
  // Module name mapping for ES modules
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        moduleResolution: 'node',
      },
    }],
  },
  
  // Test file patterns
  testMatch: [
    '**/src/**/__tests__/**/*.test.ts',
    '**/src/**/*.test.ts',
    '**/__tests__/**/*.test.ts',
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/__tests__/**',
    '!packages/*/src/**/index.ts',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Module directories
  moduleDirectories: ['node_modules', 'packages'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Projects configuration for workspace packages
  projects: [
    {
      displayName: '@open-cli/core',
      testMatch: ['<rootDir>/packages/core/src/**/*.test.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          tsconfig: '<rootDir>/packages/core/tsconfig.json',
        }],
      },
    },
    {
      displayName: '@open-cli/cli',
      testMatch: ['<rootDir>/packages/cli/src/**/*.test.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          tsconfig: '<rootDir>/packages/cli/tsconfig.json',
        }],
      },
    },
  ],
};

export default config;
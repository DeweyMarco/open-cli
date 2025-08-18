/**
 * Jest setup file for global test configuration
 */

// Set test timeout
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Helper for creating mock functions with better typing
  createMockFn: <T extends (...args: any[]) => any>() => jest.fn<ReturnType<T>, Parameters<T>>(),
  
  // Helper for async test delays
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper for creating temporary directories in tests
  createTempDir: () => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    return fs.mkdtempSync(path.join(os.tmpdir(), 'open-cli-test-'));
  },
};

// Mock console methods to avoid noise in tests unless explicitly testing them
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Restore original console for specific tests when needed
global.restoreConsole = () => {
  global.console = originalConsole;
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
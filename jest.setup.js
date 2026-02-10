// Jest setup file
// Extends expect with custom matchers for DOM testing
require('@testing-library/jest-dom');

// Mock browser APIs that don't exist in Node.js test environment
// These are essential for testing browser-only functionality

// Mock URL.createObjectURL and revokeObjectURL
if (typeof global.URL.createObjectURL === 'undefined') {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url-' + Math.random());
}

if (typeof global.URL.revokeObjectURL === 'undefined') {
  global.URL.revokeObjectURL = jest.fn();
}

// Mock Worker (for tests that don't provide their own mock)
// Individual tests can override this with more specific mocks
if (typeof global.Worker === 'undefined') {
  class MockWorker {
    constructor(stringUrl) {
      this.url = stringUrl;
      this.onmessage = null;
    }
    
    postMessage(msg) {
      // Default no-op, tests should override
    }
    
    terminate() {
      // Default no-op
    }
    
    addEventListener(type, handler) {
      // Default no-op, tests should override
    }
    
    removeEventListener(type, handler) {
      // Default no-op
    }
  }
  
  global.Worker = MockWorker;
}

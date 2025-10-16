/**
 * Vitest Setup File
 */

import { setupLocalStorageMock } from './fixtures/localStorage.mock.js';

// Setup LocalStorage mock
setupLocalStorageMock();

// Setup matchMedia mock (for theme tests)
global.matchMedia = global.matchMedia || function(query) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  };
};

// Setup console mocks to reduce noise in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};

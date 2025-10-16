/**
 * LocalStorage Mock for Testing
 */

class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }

  hasOwnProperty(key) {
    return key in this.store;
  }
}

// Setup for Vitest
export function setupLocalStorageMock() {
  global.localStorage = new LocalStorageMock();
  return global.localStorage;
}

// Export for direct use
export default LocalStorageMock;

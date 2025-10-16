/**
 * Storage Service - Abstraction layer for LocalStorage
 * Provides error handling and JSON serialization
 */

const storageService = {
  /**
   * Get item from LocalStorage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Value to return if key doesn't exist
   * @returns {*} Parsed value or defaultValue
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Storage read error for key "${key}":`, error);
      return defaultValue;
    }
  },

  /**
   * Set item in LocalStorage
   * @param {string} key - Storage key
   * @param {*} value - Value to store (will be JSON serialized)
   * @returns {boolean} Success status
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded');
      } else {
        console.error(`Storage write error for key "${key}":`, error);
      }
      return false;
    }
  },

  /**
   * Remove item from LocalStorage
   * @param {string} key - Storage key
   * @returns {boolean} Success status
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Storage remove error for key "${key}":`, error);
      return false;
    }
  },

  /**
   * Check if key exists in LocalStorage
   * @param {string} key - Storage key
   * @returns {boolean} True if key exists
   */
  has(key) {
    return localStorage.getItem(key) !== null;
  },

  /**
   * Clear all items or items with specific prefix
   * @param {string} [prefix] - Optional key prefix to filter
   * @returns {boolean} Success status
   */
  clear(prefix = null) {
    try {
      if (prefix) {
        // Clear only keys with prefix
        Object.keys(localStorage)
          .filter(key => key.startsWith(prefix))
          .forEach(key => localStorage.removeItem(key));
      } else {
        localStorage.clear();
      }
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  },

  /**
   * Get approximate size of stored data in bytes
   * @returns {number} Total size in bytes
   */
  getSize() {
    let size = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += localStorage[key].length + key.length;
      }
    }
    return size;
  }
};

export default storageService;

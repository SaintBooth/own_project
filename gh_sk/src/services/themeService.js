/**
 * Theme Service - Handles theme detection and switching
 */

import storageService from './storageService.js';
import eventBus from './eventBus.js';

const STORAGE_KEY = 'portfolio:theme';

const themeService = {
  /**
   * Initialize theme on page load
   */
  initTheme() {
    const stored = storageService.get(STORAGE_KEY);
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const theme = stored?.mode || (systemPrefersDark ? 'dark' : 'light');
    this.applyTheme(theme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const stored = storageService.get(STORAGE_KEY);
      // Only auto-switch if user hasn't set a preference
      if (!stored || stored.mode === 'system') {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  },

  /**
   * Get current active theme
   * @returns {'light'|'dark'} Current theme
   */
  getTheme() {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  },

  /**
   * Set theme manually
   * @param {'light'|'dark'|'system'} mode - Theme mode to set
   */
  setTheme(mode) {
    if (mode === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(systemPrefersDark ? 'dark' : 'light');
      storageService.set(STORAGE_KEY, { mode: 'system', timestamp: Date.now() });
    } else {
      this.applyTheme(mode);
      storageService.set(STORAGE_KEY, { mode, timestamp: Date.now() });
    }
  },

  /**
   * Toggle between light and dark themes
   */
  toggleTheme() {
    const current = this.getTheme();
    const next = current === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  },

  /**
   * Get system theme preference
   * @returns {'light'|'dark'} System theme
   */
  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  /**
   * Apply theme to document
   * @param {'light'|'dark'} theme - Theme to apply
   * @private
   */
  applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Emit theme change event
    eventBus.emit('theme:changed', { theme });
  }
};

export default themeService;

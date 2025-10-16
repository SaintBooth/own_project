/**
 * i18n Service - Internationalization
 * Supports English and Russian languages
 */

import storageService from './storageService.js';
import eventBus from './eventBus.js';

class I18nService {
  constructor() {
    this.currentLocale = 'en';
    this.translations = {};
    this.supportedLocales = ['en', 'ru'];
  }

  /**
   * Initialize i18n service
   */
  async init() {
    // Try to get saved locale from localStorage
    const savedLocale = storageService.get('locale');

    if (savedLocale && this.supportedLocales.includes(savedLocale)) {
      this.currentLocale = savedLocale;
    } else {
      // Detect browser language
      this.currentLocale = this.detectBrowserLanguage();
      storageService.set('locale', this.currentLocale);
    }

    // Load translations
    await this.loadTranslations();

    // Update HTML lang attribute
    document.documentElement.setAttribute('lang', this.currentLocale);
  }

  /**
   * Detect browser language
   * @returns {string} Detected locale (en or ru)
   */
  detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    const langCode = browserLang.split('-')[0]; // Get 'ru' from 'ru-RU'

    return this.supportedLocales.includes(langCode) ? langCode : 'en';
  }

  /**
   * Load translations for current locale
   */
  async loadTranslations() {
    try {
      const response = await fetch(`/src/locales/${this.currentLocale}.json`);
      this.translations = await response.json();
    } catch (error) {
      console.error('Error loading translations:', error);
      // Fallback to English if loading fails
      if (this.currentLocale !== 'en') {
        this.currentLocale = 'en';
        await this.loadTranslations();
      }
    }
  }

  /**
   * Get translation by key
   * @param {string} key - Translation key (e.g., 'home.title')
   * @param {Object} params - Parameters for interpolation
   * @returns {string} Translated text
   */
  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    // Replace parameters
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : match;
      });
    }

    return value;
  }

  /**
   * Get current locale
   * @returns {string}
   */
  getLocale() {
    return this.currentLocale;
  }

  /**
   * Set locale
   * @param {string} locale - Locale code (en or ru)
   */
  async setLocale(locale) {
    if (!this.supportedLocales.includes(locale)) {
      console.error(`Unsupported locale: ${locale}`);
      return;
    }

    this.currentLocale = locale;
    storageService.set('locale', locale);

    // Update HTML lang attribute
    document.documentElement.setAttribute('lang', locale);

    // Reload translations
    await this.loadTranslations();

    // Emit event to notify components
    eventBus.emit('locale:changed', { locale });
  }

  /**
   * Toggle between English and Russian
   */
  async toggleLocale() {
    const newLocale = this.currentLocale === 'en' ? 'ru' : 'en';
    await this.setLocale(newLocale);
  }

  /**
   * Get supported locales
   * @returns {Array}
   */
  getSupportedLocales() {
    return this.supportedLocales;
  }

  /**
   * Get locale display name
   * @param {string} locale - Locale code
   * @returns {string}
   */
  getLocaleName(locale) {
    const names = {
      en: 'English',
      ru: 'Русский'
    };
    return names[locale] || locale;
  }
}

// Export singleton
const i18nService = new I18nService();
export default i18nService;

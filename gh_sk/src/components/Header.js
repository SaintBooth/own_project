/**
 * Header Component
 * Sticky header with logo and navigation mount point
 */

import eventBus from '../services/eventBus.js';
import themeService from '../services/themeService.js';
import i18nService from '../services/i18nService.js';

class Header {
  constructor() {
    this.element = null;
  }

  /**
   * Create and return the header element
   * @returns {HTMLElement}
   */
  render() {
    const header = document.createElement('header');
    header.className = 'sticky-header bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors';
    header.setAttribute('role', 'banner');

    header.innerHTML = `
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <div class="flex-shrink-0">
            <a href="#/" class="flex items-center space-x-2 transition-opacity hover:opacity-80">
              <!-- Light theme logo -->
              <img
                src="/images/logo_light.svg"
                alt="Logo"
                class="h-8 w-auto block dark:hidden"
                onerror="this.style.display='none'; this.parentElement.querySelector('.logo-fallback').style.display='block';"
              />
              <!-- Dark theme logo -->
              <img
                src="/images/logo.svg"
                alt="Logo"
                class="h-8 w-auto hidden dark:block"
                onerror="this.style.display='none'; this.parentElement.querySelector('.logo-fallback').style.display='block';"
              />
              <!-- Fallback text -->
              <span class="logo-fallback hidden text-2xl font-bold font-display text-primary-light dark:text-primary-light transition-colors">
                Alexander Butakov
              </span>
            </a>
          </div>

          <!-- Desktop Navigation Mount Point -->
          <div id="nav-desktop" class="hidden md:flex items-center space-x-8">
            <!-- Navigation.js will mount here for desktop -->
          </div>

          <!-- Theme Toggle & Language Switcher & Mobile Menu Button Container -->
          <div class="flex items-center space-x-4">
            <!-- Language Switcher -->
            <button
              id="language-toggle"
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-semibold text-sm"
              aria-label="Toggle language"
              title="Switch language"
            >
              <span id="language-text">${i18nService.getLocale() === 'en' ? 'RU' : 'EN'}</span>
            </button>

            <!-- Theme Toggle Button -->
            <button
              id="theme-toggle"
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              <svg id="theme-icon-light" class="w-6 h-6 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <svg id="theme-icon-dark" class="w-6 h-6 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>

            <!-- Mobile Menu Button -->
            <button
              id="mobile-menu-toggle"
              class="hamburger md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
              aria-expanded="false"
            >
              <div class="w-6 h-5 flex flex-col justify-between">
                <span class="hamburger-line block h-0.5 w-6 bg-gray-900 dark:bg-gray-100 transition-all"></span>
                <span class="hamburger-line block h-0.5 w-6 bg-gray-900 dark:bg-gray-100 transition-all"></span>
                <span class="hamburger-line block h-0.5 w-6 bg-gray-900 dark:bg-gray-100 transition-all"></span>
              </div>
            </button>
          </div>
        </div>
      </div>
    `;

    this.element = header;
    this.attachEventListeners();
    return header;
  }

  /**
   * Update language button text
   */
  updateLanguageButton() {
    if (!this.element) return;
    const languageText = this.element.querySelector('#language-text');
    if (languageText) {
      languageText.textContent = i18nService.getLocale() === 'en' ? 'RU' : 'EN';
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.element) return;

    // Language toggle handler
    const languageToggle = this.element.querySelector('#language-toggle');
    if (languageToggle) {
      languageToggle.addEventListener('click', async () => {
        await i18nService.toggleLocale();
        this.updateLanguageButton();
      });
    }

    // Listen for locale change events
    eventBus.on('locale:changed', () => {
      this.updateLanguageButton();
    });

    // Theme toggle handler
    const themeToggle = this.element.querySelector('#theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        themeService.toggleTheme();
      });
    }

    // Mobile menu toggle handler
    const mobileMenuToggle = this.element.querySelector('#mobile-menu-toggle');
    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener('click', () => {
        const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
        mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);

        // Toggle hamburger animation
        mobileMenuToggle.classList.toggle('active');

        // Emit event for Navigation component to handle
        eventBus.emit('mobile-menu:toggle', { open: !isExpanded });
      });
    }

    // Listen for mobile menu close events from outside
    eventBus.on('mobile-menu:close', () => {
      const mobileMenuToggle = this.element.querySelector('#mobile-menu-toggle');
      if (mobileMenuToggle) {
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        mobileMenuToggle.classList.remove('active');
      }
    });
  }

  /**
   * Mount the header to a DOM element
   * @param {HTMLElement|string} target - Target element or selector
   */
  mount(target) {
    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) {
      console.error('Header mount target not found');
      return;
    }

    const header = this.render();
    container.appendChild(header);
  }

  /**
   * Unmount and cleanup
   */
  unmount() {
    if (this.element) {
      eventBus.off('mobile-menu:close');
      eventBus.off('locale:changed');
      this.element.remove();
      this.element = null;
    }
  }
}

// Export singleton instance
export default new Header();

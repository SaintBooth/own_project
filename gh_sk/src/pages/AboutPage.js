/**
 * AboutPage Component
 * About me page with bio and skills
 */

import dataService from '../services/dataService.js';
import i18nService from '../services/i18nService.js';
import eventBus from '../services/eventBus.js';

class AboutPage {
  constructor() {
    this.element = null;
  }

  async render() {
    const page = document.createElement('div');
    page.className = 'about-page';

    try {
      const about = await dataService.getAbout();
      this.about = about; // Store for updateContent

      const availabilityText = about.availability === 'available'
        ? i18nService.t('about.availableTrue')
        : i18nService.t('about.availableFalse');
      const availabilityMsg = about.availability === 'available'
        ? i18nService.t('about.availableMsgTrue')
        : i18nService.t('about.availableMsgFalse');

      page.innerHTML = `
        <!-- Hero Section -->
        <section class="bg-gradient-to-br from-primary-light via-secondary-light to-accent-light text-white py-20">
          <div class="container mx-auto px-4">
            <div class="max-w-4xl mx-auto text-center">
              <div class="mb-8">
                <img
                  src="${about.photoUrl}"
                  alt="${about.name}"
                  class="w-32 h-32 md:w-40 md:h-40 rounded-full mx-auto border-4 border-white shadow-xl"
                  onerror="this.src='https://placehold.co/400x400/3b82f6/ffffff?text=Profile'"
                />
              </div>
              <h1 class="text-4xl md:text-5xl font-bold mb-4">${about.name}</h1>
              <p class="text-xl md:text-2xl text-gray-100 mb-6">${about.tagline}</p>
              <div class="flex justify-center gap-4 text-sm md:text-base">
                <span class="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
                  📍 ${about.location}
                </span>
                <span class="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full" data-i18n="about.yearsExp" data-i18n-years="${about.yearsExperience}">
                  💼 ${i18nService.t('about.yearsExp', { years: about.yearsExperience })}
                </span>
                <span class="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full capitalize">
                  ${about.availability === 'available' ? '✅ ' : '❌ '}<span data-i18n-availability>${availabilityText}</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Bio Section -->
        <section class="py-16 bg-white dark:bg-gray-900">
          <div class="container mx-auto px-4">
            <div class="max-w-3xl mx-auto">
              <h2 class="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100" data-i18n="about.title">${i18nService.t('about.title')}</h2>
              <p class="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                ${about.bio}
              </p>
            </div>
          </div>
        </section>

        <!-- Skills Section -->
        <section class="py-16 bg-gray-50 dark:bg-gray-800">
          <div class="container mx-auto px-4">
            <div class="max-w-5xl mx-auto">
              <h2 class="text-3xl font-bold mb-12 text-center text-gray-900 dark:text-gray-100" data-i18n="about.skills">
                ${i18nService.t('about.skills')}
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                ${about.skills.map(skillCategory => `
                  <div class="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-md">
                    <h3 class="text-xl font-bold mb-4 text-primary-500 dark:text-primary-400">
                      ${skillCategory.category}
                    </h3>
                    <div class="flex flex-wrap gap-2">
                      ${skillCategory.items.map(skill => `
                        <span class="px-3 py-1 bg-primary-light/10 dark:bg-primary-light/20 text-primary-light dark:text-primary-light rounded-full text-sm font-medium">
                          ${skill}
                        </span>
                      `).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </section>

        <!-- Contact CTA Section -->
        <section class="py-16 bg-white dark:bg-gray-900">
          <div class="container mx-auto px-4">
            <div class="max-w-3xl mx-auto text-center">
              <h2 class="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100" data-i18n="about.workTogether">
                ${i18nService.t('about.workTogether')}
              </h2>
              <p class="text-lg text-gray-600 dark:text-gray-400 mb-8" data-i18n="about.availableMsg" data-i18n-status="${availabilityText}" data-i18n-message="${availabilityMsg}">
                ${i18nService.t('about.availableMsg', { status: availabilityText, message: availabilityMsg })}
              </p>
              <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="#/contact"
                  class="btn btn-primary px-8 py-4 rounded-lg font-semibold transition-all hover:scale-105"
                  data-i18n="home.getInTouch"
                >
                  ${i18nService.t('home.getInTouch')}
                </a>
                <a
                  href="#/projects"
                  class="btn btn-secondary px-8 py-4 rounded-lg font-semibold transition-all"
                  data-i18n="home.viewWork"
                >
                  ${i18nService.t('home.viewWork')}
                </a>
              </div>

              <!-- Social Links -->
              <div class="mt-8 flex justify-center gap-6">
                ${about.socialLinks.github ? `
                  <a
                    href="${about.socialLinks.github}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                    aria-label="GitHub"
                  >
                    <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
                    </svg>
                  </a>
                ` : ''}
                ${about.socialLinks.linkedin ? `
                  <a
                    href="${about.socialLinks.linkedin}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                    aria-label="LinkedIn"
                  >
                    <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                ` : ''}
                ${about.socialLinks.twitter ? `
                  <a
                    href="${about.socialLinks.twitter}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                    aria-label="Twitter"
                  >
                    <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </a>
                ` : ''}
              </div>
            </div>
          </div>
        </section>
      `;

      this.element = page;
    } catch (error) {
      console.error('Error rendering about page:', error);
      page.innerHTML = `
        <div class="container mx-auto px-4 py-16 text-center">
          <h1 class="text-4xl font-bold mb-4 text-red-500">Error Loading Page</h1>
          <p class="text-gray-600 dark:text-gray-400">
            There was an error loading the about page. Please try again later.
          </p>
        </div>
      `;
    }

    return page;
  }

  /**
   * Update content when locale changes
   */
  updateContent() {
    if (!this.element || !this.about) return;

    const availabilityText = this.about.availability === 'available'
      ? i18nService.t('about.availableTrue')
      : i18nService.t('about.availableFalse');
    const availabilityMsg = this.about.availability === 'available'
      ? i18nService.t('about.availableMsgTrue')
      : i18nService.t('about.availableMsgFalse');

    // Update all elements with data-i18n attribute
    this.element.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key === 'about.yearsExp') {
        const years = el.getAttribute('data-i18n-years');
        el.textContent = '💼 ' + i18nService.t(key, { years: years });
      } else if (key === 'about.availableMsg') {
        el.textContent = i18nService.t(key, { status: availabilityText, message: availabilityMsg });
      } else {
        el.textContent = i18nService.t(key);
      }
    });

    // Update availability text
    const availabilityEl = this.element.querySelector('[data-i18n-availability]');
    if (availabilityEl) {
      availabilityEl.textContent = availabilityText;
    }
  }

  async mount(target) {
    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) {
      console.error('AboutPage mount target not found');
      return;
    }

    const page = await this.render();
    container.innerHTML = '';
    container.appendChild(page);

    // Listen for locale changes
    this.localeChangeHandler = () => this.updateContent();
    eventBus.on('locale:changed', this.localeChangeHandler);
  }

  unmount() {
    // Remove event listener
    if (this.localeChangeHandler) {
      eventBus.off('locale:changed', this.localeChangeHandler);
      this.localeChangeHandler = null;
    }

    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

export default AboutPage;

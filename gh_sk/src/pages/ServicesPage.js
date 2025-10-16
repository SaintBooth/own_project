/**
 * ServicesPage Component
 * Services offered page
 */

import dataService from '../services/dataService.js';
import i18nService from '../services/i18nService.js';
import eventBus from '../services/eventBus.js';

class ServicesPage {
  constructor() {
    this.element = null;
  }

  async render() {
    const page = document.createElement('div');
    page.className = 'services-page';

    try {
      const services = await dataService.getServices();

      page.innerHTML = `
        <!-- Hero Section -->
        <section class="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-20">
          <div class="container mx-auto px-4">
            <div class="max-w-4xl mx-auto text-center">
              <h1 class="text-4xl md:text-5xl font-bold mb-4" data-i18n="services.title">${i18nService.t('services.title')}</h1>
              <p class="text-xl text-gray-100" data-i18n="services.description">
                ${i18nService.t('services.description')}
              </p>
            </div>
          </div>
        </section>

        <!-- Services Grid -->
        <section class="py-16 bg-white dark:bg-gray-900">
          <div class="container mx-auto px-4">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              ${services.map((service, index) => `
                <article class="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 ${service.featured ? 'ring-2 ring-primary-500' : ''}">
                  ${service.featured ? `<div class="text-primary-500 text-sm font-semibold mb-2" data-i18n="common.featured">${i18nService.t('common.featured')}</div>` : ''}

                  <div class="text-5xl mb-4">${service.icon || '💼'}</div>

                  <h3 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                    ${service.title}
                  </h3>

                  <p class="text-gray-600 dark:text-gray-400 mb-6">
                    ${service.description}
                  </p>

                  ${service.deliverables && service.deliverables.length > 0 ? `
                    <div class="mb-6">
                      <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-2" data-i18n="services.deliverables">${i18nService.t('services.deliverables')}</h4>
                      <ul class="space-y-2">
                        ${service.deliverables.map(item => `
                          <li class="flex items-start text-sm text-gray-600 dark:text-gray-400">
                            <svg class="w-5 h-5 mr-2 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                            ${item}
                          </li>
                        `).join('')}
                      </ul>
                    </div>
                  ` : ''}

                  ${service.estimatedDuration || service.priceRange ? `
                    <div class="pt-6 border-t border-gray-200 dark:border-gray-700">
                      ${service.estimatedDuration ? `
                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <span class="font-semibold" data-i18n="services.timeline">${i18nService.t('services.timeline')}</span> ${service.estimatedDuration}
                        </p>
                      ` : ''}
                      ${service.priceRange ? `
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                          <span class="font-semibold" data-i18n="services.startingAt">${i18nService.t('services.startingAt')}</span> ${service.priceRange}
                        </p>
                      ` : ''}
                    </div>
                  ` : ''}
                </article>
              `).join('')}
            </div>
          </div>
        </section>

        <!-- CTA Section -->
        <section class="py-16 bg-gray-50 dark:bg-gray-800">
          <div class="container mx-auto px-4">
            <div class="max-w-3xl mx-auto text-center">
              <h2 class="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100" data-i18n="services.readyToStart">
                ${i18nService.t('services.readyToStart')}
              </h2>
              <p class="text-lg text-gray-600 dark:text-gray-400 mb-8" data-i18n="services.readyDesc">
                ${i18nService.t('services.readyDesc')}
              </p>
              <a
                href="#/contact"
                class="btn btn-primary px-8 py-4 rounded-lg font-semibold inline-block transition-all hover:scale-105"
                data-i18n="services.getFreeConsultation"
              >
                ${i18nService.t('services.getFreeConsultation')}
              </a>
            </div>
          </div>
        </section>

        <!-- Process Section -->
        <section class="py-16 bg-white dark:bg-gray-900">
          <div class="container mx-auto px-4">
            <div class="max-w-4xl mx-auto">
              <h2 class="text-3xl font-bold mb-12 text-center text-gray-900 dark:text-gray-100" data-i18n="services.howItWorks">
                ${i18nService.t('services.howItWorks')}
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div class="text-center">
                  <div class="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span class="text-2xl font-bold text-primary-600 dark:text-primary-400">1</span>
                  </div>
                  <h3 class="font-semibold mb-2 text-gray-900 dark:text-gray-100" data-i18n="services.processSteps.discovery.title">${i18nService.t('services.processSteps.discovery.title')}</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400" data-i18n="services.processSteps.discovery.desc">
                    ${i18nService.t('services.processSteps.discovery.desc')}
                  </p>
                </div>
                <div class="text-center">
                  <div class="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span class="text-2xl font-bold text-primary-600 dark:text-primary-400">2</span>
                  </div>
                  <h3 class="font-semibold mb-2 text-gray-900 dark:text-gray-100" data-i18n="services.processSteps.planning.title">${i18nService.t('services.processSteps.planning.title')}</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400" data-i18n="services.processSteps.planning.desc">
                    ${i18nService.t('services.processSteps.planning.desc')}
                  </p>
                </div>
                <div class="text-center">
                  <div class="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span class="text-2xl font-bold text-primary-600 dark:text-primary-400">3</span>
                  </div>
                  <h3 class="font-semibold mb-2 text-gray-900 dark:text-gray-100" data-i18n="services.processSteps.development.title">${i18nService.t('services.processSteps.development.title')}</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400" data-i18n="services.processSteps.development.desc">
                    ${i18nService.t('services.processSteps.development.desc')}
                  </p>
                </div>
                <div class="text-center">
                  <div class="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span class="text-2xl font-bold text-primary-600 dark:text-primary-400">4</span>
                  </div>
                  <h3 class="font-semibold mb-2 text-gray-900 dark:text-gray-100" data-i18n="services.processSteps.delivery.title">${i18nService.t('services.processSteps.delivery.title')}</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400" data-i18n="services.processSteps.delivery.desc">
                    ${i18nService.t('services.processSteps.delivery.desc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      `;

      this.element = page;
    } catch (error) {
      console.error('Error rendering services page:', error);
      page.innerHTML = `
        <div class="container mx-auto px-4 py-16 text-center">
          <h1 class="text-4xl font-bold mb-4 text-red-500">Error Loading Services</h1>
          <p class="text-gray-600 dark:text-gray-400">
            There was an error loading the services. Please try again later.
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
    if (!this.element) return;

    // Update all elements with data-i18n attribute
    this.element.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = i18nService.t(key);
    });
  }

  async mount(target) {
    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) {
      console.error('ServicesPage mount target not found');
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

export default ServicesPage;

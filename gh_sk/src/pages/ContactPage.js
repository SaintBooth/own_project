/**
 * ContactPage Component
 * Contact page with form and contact information
 */

import dataService from '../services/dataService.js';
import i18nService from '../services/i18nService.js';
import eventBus from '../services/eventBus.js';

class ContactPage {
  constructor() {
    this.element = null;
  }

  async render() {
    const page = document.createElement('div');
    page.className = 'contact-page';

    try {
      const about = await dataService.getAbout();
      this.about = about; // Store for updateContent

      page.innerHTML = `
        <!-- Hero Section -->
        <section class="bg-gradient-to-r from-primary-light to-secondary-light text-white py-20">
          <div class="container mx-auto px-4">
            <div class="max-w-4xl mx-auto text-center">
              <h1 class="text-4xl md:text-5xl font-bold mb-4" data-i18n="contact.title">${i18nService.t('contact.title')}</h1>
              <p class="text-xl text-gray-100" data-i18n="contact.description">
                ${i18nService.t('contact.description')}
              </p>
            </div>
          </div>
        </section>

        <!-- Contact Content -->
        <section class="py-16 bg-white dark:bg-gray-900">
          <div class="container mx-auto px-4">
            <div class="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
              <!-- Contact Form -->
              <div>
                <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100" data-i18n="contact.sendMessage">
                  ${i18nService.t('contact.sendMessage')}
                </h2>
                <form id="contact-form" class="space-y-6">
                  <div>
                    <label for="name" class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2" data-i18n="contact.yourName">
                      ${i18nService.t('contact.yourName')} *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      class="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label for="email" class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2" data-i18n="contact.email">
                      ${i18nService.t('contact.email')} *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      class="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label for="subject" class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2" data-i18n="contact.subject">
                      ${i18nService.t('contact.subject')} *
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      required
                      class="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                      placeholder="Project Inquiry"
                    />
                  </div>

                  <div>
                    <label for="message" class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2" data-i18n="contact.message">
                      ${i18nService.t('contact.message')} *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows="6"
                      required
                      class="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all resize-none"
                      placeholder="${i18nService.t('contact.messagePlaceholder')}"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    class="w-full btn btn-primary px-8 py-4 rounded-lg font-semibold transition-all hover:scale-105"
                    data-i18n="contact.send"
                  >
                    ${i18nService.t('contact.send')}
                  </button>

                  <div id="form-message" class="hidden p-4 rounded-lg"></div>
                </form>
              </div>

              <!-- Contact Information -->
              <div>
                <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100" data-i18n="contact.contactInfo">
                  ${i18nService.t('contact.contactInfo')}
                </h2>

                <div class="space-y-6">
                  <!-- Email -->
                  ${about.contactEmail ? `
                    <div class="flex items-start">
                      <div class="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                        <svg class="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-1">Email</h3>
                        <a href="mailto:${about.contactEmail}" class="text-primary-600 dark:text-primary-400 hover:underline">
                          ${about.contactEmail}
                        </a>
                      </div>
                    </div>
                  ` : ''}

                  <!-- Telegram -->
                  ${about.telegram ? `
                    <div class="flex items-start">
                      <div class="w-12 h-12 bg-primary-light/10 dark:bg-primary-light/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                        <svg class="w-6 h-6 text-primary-light dark:text-primary-light" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121L7.773 13.89l-2.89-.903c-.63-.197-.64-.63.135-.93l11.566-4.458c.538-.196 1.006.128.832.782z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-1">Telegram</h3>
                        <a href="https://t.me/${about.telegram.replace('@', '')}" target="_blank" rel="noopener noreferrer" class="text-primary-light dark:text-primary-light hover:underline">
                          ${about.telegram}
                        </a>
                      </div>
                    </div>
                  ` : ''}

                  <!-- Location -->
                  ${about.location ? `
                    <div class="flex items-start">
                      <div class="w-12 h-12 bg-accent-light/10 dark:bg-accent-light/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                        <svg class="w-6 h-6 text-accent-light dark:text-accent-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-1" data-i18n="contact.location">${i18nService.t('contact.location')}</h3>
                        <p class="text-gray-600 dark:text-gray-400">${about.location}</p>
                      </div>
                    </div>
                  ` : ''}

                  <!-- Availability -->
                  <div class="flex items-start">
                    <div class="w-12 h-12 bg-secondary-light/10 dark:bg-secondary-light/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <svg class="w-6 h-6 text-secondary-light dark:text-secondary-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-1" data-i18n="contact.availability">${i18nService.t('contact.availability')}</h3>
                      <p class="text-gray-600 dark:text-gray-400 capitalize" data-i18n-availability>
                        ${about.availability === 'available' ? i18nService.t('contact.currentlyAvailable') : i18nService.t('contact.notAvailable')}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Social Links -->
                <div class="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-4" data-i18n="contact.connectSocial">${i18nService.t('contact.connectSocial')}</h3>
                  <div class="flex gap-4">
                    ${about.socialLinks.github ? `
                      <a href="${about.socialLinks.github}" target="_blank" rel="noopener noreferrer" class="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
                        </svg>
                      </a>
                    ` : ''}
                    ${about.socialLinks.linkedin ? `
                      <a href="${about.socialLinks.linkedin}" target="_blank" rel="noopener noreferrer" class="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </a>
                    ` : ''}
                    ${about.socialLinks.twitter ? `
                      <a href="${about.socialLinks.twitter}" target="_blank" rel="noopener noreferrer" class="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                      </a>
                    ` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      `;

      this.element = page;
      this.attachEventListeners();
    } catch (error) {
      console.error('Error rendering contact page:', error);
      page.innerHTML = `
        <div class="container mx-auto px-4 py-16 text-center">
          <h1 class="text-4xl font-bold mb-4 text-red-500">Error Loading Page</h1>
          <p class="text-gray-600 dark:text-gray-400">
            There was an error loading the contact page. Please try again later.
          </p>
        </div>
      `;
    }

    return page;
  }

  attachEventListeners() {
    if (!this.element) return;

    const form = this.element.querySelector('#contact-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
          name: form.name.value,
          email: form.email.value,
          subject: form.subject.value,
          message: form.message.value
        };

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = i18nService.t('contact.sending');
        submitBtn.disabled = true;

        // Simulate form submission (in real app, send to backend)
        setTimeout(() => {
          const formMessage = this.element.querySelector('#form-message');
          formMessage.className = 'p-4 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
          formMessage.textContent = i18nService.t('contact.successMessage');
          formMessage.classList.remove('hidden');

          form.reset();
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;

          console.log('Form submitted:', formData);
        }, 1000);
      });
    }
  }

  /**
   * Update content when locale changes
   */
  updateContent() {
    if (!this.element || !this.about) return;

    // Update all elements with data-i18n attribute
    this.element.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = i18nService.t(key);
    });

    // Update availability text
    const availabilityEl = this.element.querySelector('[data-i18n-availability]');
    if (availabilityEl && this.about) {
      availabilityEl.textContent = this.about.availability === 'available'
        ? i18nService.t('contact.currentlyAvailable')
        : i18nService.t('contact.notAvailable');
    }

    // Update textarea placeholder
    const messageTextarea = this.element.querySelector('#message');
    if (messageTextarea) {
      messageTextarea.placeholder = i18nService.t('contact.messagePlaceholder');
    }
  }

  async mount(target) {
    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) {
      console.error('ContactPage mount target not found');
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

export default ContactPage;

/**
 * ProjectDetailPage Component
 * Detailed project view with reactions and contact options
 */

import dataService from '../services/dataService.js';
import reactions from '../components/Reactions.js';
import routerService from '../services/routerService.js';
import i18nService from '../services/i18nService.js';
import eventBus from '../services/eventBus.js';

class ProjectDetailPage {
  constructor(slug) {
    this.slug = slug;
    this.element = null;
    this.project = null;
  }

  /**
   * Render project detail page
   * @returns {Promise<HTMLElement>}
   */
  async render() {
    const page = document.createElement('div');
    page.className = 'project-detail-page';

    try {
      // Fetch project data
      this.project = await dataService.getProjectBySlug(this.slug);

      if (!this.project) {
        return this.renderNotFound();
      }

      // Fetch about data for contact info
      const about = await dataService.getAbout();
      this.about = about; // Store for updateContent

      page.innerHTML = `
        <!-- Hero Section with Project Image -->
        <section class="relative h-96 bg-gray-900">
          <img
            src="${this.project.thumbnail}"
            alt="${this.project.title}"
            class="w-full h-full object-cover opacity-60"
            onerror="this.src='https://placehold.co/1200x400/gray/white?text=No+Image'"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"></div>
          <div class="absolute bottom-0 left-0 right-0 p-8">
            <div class="container mx-auto">
              <nav class="text-sm mb-4">
                <a href="#/projects" class="text-gray-300 hover:text-white transition-colors" data-i18n="projectDetail.backToProjects">
                  ${i18nService.t('projectDetail.backToProjects')}
                </a>
              </nav>
              <h1 class="text-4xl md:text-5xl font-bold text-white mb-2">
                ${this.project.title}
              </h1>
              <div class="flex flex-wrap gap-2">
                ${this.project.category ? `
                  <span class="px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-semibold capitalize">
                    ${i18nService.t('projects.category.' + this.project.category)}
                  </span>
                ` : ''}
                ${this.project.completedDate ? `
                  <span class="px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm">
                    ${new Date(this.project.completedDate).toLocaleDateString(i18nService.getLocale() === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' })}
                  </span>
                ` : ''}
              </div>
            </div>
          </div>
        </section>

        <!-- Main Content -->
        <section class="py-12 bg-white dark:bg-gray-900">
          <div class="container mx-auto px-4">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <!-- Main Column -->
              <div class="lg:col-span-2 project-detail">
                <!-- Description -->
                <div class="mb-8">
                  <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100" data-i18n="projectDetail.overview">
                    ${i18nService.t('projectDetail.overview')}
                  </h2>
                  <p class="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                    ${this.project.description}
                  </p>
                  <div class="project-long-description prose dark:prose-invert max-w-none">
                    <p class="text-gray-700 dark:text-gray-300">
                      ${this.project.longDescription}
                    </p>
                  </div>
                </div>

                <!-- Technologies -->
                <div class="mb-8">
                  <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100" data-i18n="projectDetail.technologies">
                    ${i18nService.t('projectDetail.technologies')}
                  </h2>
                  <div class="project-technologies flex flex-wrap gap-3">
                    ${this.project.technologies.map(tech => `
                      <span class="px-4 py-2 bg-primary-light/10 dark:bg-primary-light/20 text-primary-light dark:text-primary-light rounded-lg font-medium">
                        ${tech}
                      </span>
                    `).join('')}
                  </div>
                </div>

                <!-- Challenge & Results -->
                ${this.project.challenges || this.project.results ? `
                  <div class="mb-8 grid md:grid-cols-2 gap-6">
                    ${this.project.challenges ? `
                      <div class="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-6">
                        <h3 class="text-xl font-bold mb-3 text-amber-900 dark:text-amber-300 flex items-center" data-i18n="projectDetail.challenges">
                          <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          ${i18nService.t('projectDetail.challenges')}
                        </h3>
                        <p class="text-amber-800 dark:text-amber-200">
                          ${this.project.challenges}
                        </p>
                      </div>
                    ` : ''}
                    ${this.project.results ? `
                      <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                        <h3 class="text-xl font-bold mb-3 text-green-900 dark:text-green-300 flex items-center" data-i18n="projectDetail.results">
                          <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          ${i18nService.t('projectDetail.results')}
                        </h3>
                        <p class="text-green-800 dark:text-green-200">
                          ${this.project.results}
                        </p>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}

                <!-- Project Images -->
                ${this.project.images && this.project.images.length > 0 ? `
                  <div class="mb-8">
                    <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100" data-i18n="projectDetail.gallery">
                      ${i18nService.t('projectDetail.gallery')}
                    </h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      ${this.project.images.map(image => `
                        <img
                          src="${image}"
                          alt="${this.project.title} screenshot"
                          class="w-full h-64 object-cover rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                          loading="lazy"
                          onerror="this.src='https://placehold.co/1200x400/gray/white?text=No+Image'"
                        />
                      `).join('')}
                    </div>
                  </div>
                ` : ''}

                <!-- Reactions Section -->
                <div id="reactions-section" class="mb-8">
                  <!-- Reactions component will be mounted here -->
                </div>
              </div>

              <!-- Sidebar -->
              <div class="lg:col-span-1">
                <div class="sticky top-24 space-y-6">
                  <!-- Quick Links -->
                  <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                    <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100" data-i18n="projectDetail.quickLinks">
                      ${i18nService.t('projectDetail.quickLinks')}
                    </h3>
                    <div class="space-y-3">
                      ${this.project.demoUrl ? `
                        <a
                          href="${this.project.demoUrl}"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="flex items-center justify-between w-full px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition-colors"
                        >
                          <span data-i18n="projectDetail.viewDemo">${i18nService.t('projectDetail.viewDemo')}</span>
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ` : ''}
                      ${this.project.githubUrl ? `
                        <a
                          href="${this.project.githubUrl}"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="flex items-center justify-between w-full px-4 py-3 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                        >
                          <span data-i18n="projectDetail.viewGithub">${i18nService.t('projectDetail.viewGithub')}</span>
                          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
                          </svg>
                        </a>
                      ` : ''}
                    </div>
                  </div>

                  <!-- Contact Section -->
                  <div class="contact-section project-contact bg-gradient-to-br from-primary-light/5 to-secondary-light/5 dark:from-primary-light/10 dark:to-secondary-light/10 rounded-lg p-6 border-2 border-primary-light/20 dark:border-primary-light/30">
                    <h3 class="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100" data-i18n="projectDetail.interested">
                      ${i18nService.t('projectDetail.interested')}
                    </h3>
                    <p class="text-sm text-gray-700 dark:text-gray-300 mb-4" data-i18n="projectDetail.interestedDesc">
                      ${i18nService.t('projectDetail.interestedDesc')}
                    </p>
                    <div class="space-y-3">
                      ${about.telegram ? `
                        <a
                          href="https://t.me/${about.telegram.replace('@', '')}"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="flex items-center justify-between w-full px-4 py-3 bg-primary-light hover:bg-primary-light/90 text-white rounded-lg font-semibold transition-colors"
                        >
                          <span data-i18n="projectDetail.messageTelegram">${i18nService.t('projectDetail.messageTelegram')}</span>
                          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121L7.773 13.89l-2.89-.903c-.63-.197-.64-.63.135-.93l11.566-4.458c.538-.196 1.006.128.832.782z"/>
                          </svg>
                        </a>
                      ` : ''}
                      ${about.contactEmail ? `
                        <a
                          href="mailto:${about.contactEmail}?subject=Inquiry about ${encodeURIComponent(this.project.title)}"
                          class="flex items-center justify-between w-full px-4 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-semibold transition-colors"
                        >
                          <span data-i18n="projectDetail.sendEmail">${i18nService.t('projectDetail.sendEmail')}</span>
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </a>
                      ` : ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      `;

      this.element = page;

      // Mount reactions component
      this.mountReactions();

    } catch (error) {
      console.error('Error rendering project detail:', error);
      return this.renderError();
    }

    return page;
  }

  /**
   * Mount reactions component
   */
  mountReactions() {
    if (!this.element || !this.project) return;

    const reactionsSection = this.element.querySelector('#reactions-section');
    if (reactionsSection) {
      const reactionsComponent = reactions.render(this.project);
      reactionsSection.appendChild(reactionsComponent);
    }
  }

  /**
   * Render not found page
   * @returns {HTMLElement}
   */
  renderNotFound() {
    const page = document.createElement('div');
    page.className = 'project-detail-page';

    page.innerHTML = `
      <div class="container mx-auto px-4 py-16 text-center">
        <svg class="w-32 h-32 mx-auto text-gray-400 dark:text-gray-600 mb-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 class="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Project Not Found
        </h1>
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Sorry, we couldn't find the project you're looking for.
        </p>
        <button
          onclick="window.location.hash = '/projects'"
          class="btn btn-primary px-8 py-3 rounded-lg font-semibold"
        >
          Back to Projects
        </button>
      </div>
    `;

    return page;
  }

  /**
   * Render error page
   * @returns {HTMLElement}
   */
  renderError() {
    const page = document.createElement('div');
    page.className = 'project-detail-page';

    page.innerHTML = `
      <div class="container mx-auto px-4 py-16 text-center">
        <h1 class="text-4xl font-bold mb-4 text-red-500">Error Loading Project</h1>
        <p class="text-gray-600 dark:text-gray-400 mb-8">
          There was an error loading the project. Please try again later.
        </p>
        <button
          onclick="window.location.hash = '/projects'"
          class="btn btn-primary px-8 py-3 rounded-lg font-semibold"
        >
          Back to Projects
        </button>
      </div>
    `;

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

    // Update category if present
    if (this.project && this.project.category) {
      const categoryEl = this.element.querySelector('.capitalize');
      if (categoryEl) {
        categoryEl.textContent = i18nService.t('projects.category.' + this.project.category);
      }
    }
  }

  /**
   * Mount the page
   * @param {HTMLElement|string} target - Target element or selector
   */
  async mount(target) {
    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) {
      console.error('ProjectDetailPage mount target not found');
      return;
    }

    const page = await this.render();
    container.innerHTML = '';
    container.appendChild(page);

    // Listen for locale changes
    this.localeChangeHandler = () => this.updateContent();
    eventBus.on('locale:changed', this.localeChangeHandler);

    // Scroll to top
    window.scrollTo(0, 0);
  }

  /**
   * Unmount and cleanup
   */
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

export default ProjectDetailPage;

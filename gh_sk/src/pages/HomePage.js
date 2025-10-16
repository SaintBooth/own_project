/**
 * HomePage Component
 * Landing page with hero section and call-to-actions
 */

import dataService from '../services/dataService.js';
import i18nService from '../services/i18nService.js';
import eventBus from '../services/eventBus.js';

class HomePage {
  constructor() {
    this.element = null;
  }

  /**
   * Create and return the home page element
   * @returns {Promise<HTMLElement>}
   */
  async render() {
    const page = document.createElement('div');
    page.className = 'home-page';

    try {
      // Fetch about data for hero section
      const about = await dataService.getAbout();
      this.about = about; // Store for updateContent

      const availabilityStatus = about.availability === 'available'
        ? i18nService.t('home.available')
        : i18nService.t('home.notAvailable');

      page.innerHTML = `
        <!-- Hero Section -->
        <section class="hero-section bg-gradient-to-br from-primary-light to-secondary-light dark:from-primary-dark dark:to-secondary-dark text-white py-20 md:py-32">
          <div class="container mx-auto px-4">
            <div class="max-w-4xl mx-auto text-center">
              <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in-up">
                ${about.name || 'Your Name'}
              </h1>
              <p class="text-xl md:text-2xl mb-8 text-gray-100 animate-fade-in-up" style="animation-delay: 0.1s;">
                ${about.tagline || 'Full-Stack Developer'}
              </p>
              <p class="text-lg mb-12 text-gray-100 max-w-2xl mx-auto animate-fade-in-up" style="animation-delay: 0.2s;">
                ${about.bio || 'Passionate developer creating elegant solutions to complex problems.'}
              </p>
              <div class="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style="animation-delay: 0.3s;">
                <a
                  href="#/projects"
                  class="btn btn-primary bg-white text-primary-light hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold transition-all transform hover:scale-105"
                  data-i18n="home.viewWork"
                >
                  ${i18nService.t('home.viewWork')}
                </a>
                <a
                  href="#/contact"
                  class="btn btn-secondary bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-light px-8 py-4 rounded-lg font-semibold transition-all"
                  data-i18n="home.getInTouch"
                >
                  ${i18nService.t('home.getInTouch')}
                </a>
              </div>
            </div>
          </div>
        </section>

        <!-- Featured Projects Preview -->
        <section class="py-16 md:py-24 bg-white dark:bg-gray-900 transition-colors">
          <div class="container mx-auto px-4">
            <div class="text-center mb-12">
              <h2 class="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100" data-i18n="home.featuredProjects">
                ${i18nService.t('home.featuredProjects')}
              </h2>
              <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto" data-i18n="home.featuredProjectsDesc">
                ${i18nService.t('home.featuredProjectsDesc')}
              </p>
            </div>
            <div id="featured-projects-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <!-- Projects will be loaded here -->
              <div class="loading-skeleton"></div>
              <div class="loading-skeleton"></div>
              <div class="loading-skeleton"></div>
            </div>
            <div class="text-center mt-12">
              <a
                href="#/projects"
                class="btn btn-primary inline-block px-8 py-3 rounded-lg font-semibold transition-all hover:scale-105"
                data-i18n="home.viewAll"
              >
                ${i18nService.t('home.viewAll')}
              </a>
            </div>
          </div>
        </section>

        <!-- Skills Section -->
        <section class="py-16 md:py-24 bg-gray-50 dark:bg-gray-800 transition-colors">
          <div class="container mx-auto px-4">
            <div class="text-center mb-12">
              <h2 class="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100" data-i18n="home.skills">
                ${i18nService.t('home.skills')}
              </h2>
              <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto" data-i18n="home.skillsDesc">
                ${i18nService.t('home.skillsDesc')}
              </p>
            </div>
            <div id="skills-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <!-- Skills will be loaded here -->
            </div>
          </div>
        </section>

        <!-- CTA Section -->
        <section class="py-16 md:py-24 bg-white dark:bg-gray-900 transition-colors">
          <div class="container mx-auto px-4">
            <div class="max-w-4xl mx-auto text-center">
              <h2 class="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-gray-100" data-i18n="home.readyToStart">
                ${i18nService.t('home.readyToStart')}
              </h2>
              <p class="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto" data-i18n="home.availableFor">
                ${i18nService.t('home.availableFor', { status: availabilityStatus })}
              </p>
              <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="#/contact"
                  class="btn btn-primary px-8 py-4 rounded-lg font-semibold transition-all hover:scale-105"
                  data-i18n="home.contactMe"
                >
                  ${i18nService.t('home.contactMe')}
                </a>
                <a
                  href="#/services"
                  class="btn btn-secondary px-8 py-4 rounded-lg font-semibold transition-all"
                  data-i18n="home.viewServices"
                >
                  ${i18nService.t('home.viewServices')}
                </a>
              </div>
            </div>
          </div>
        </section>
      `;

      this.element = page;
      await this.loadFeaturedProjects();
      await this.loadSkills(about.skills);

    } catch (error) {
      console.error('Error rendering home page:', error);
      page.innerHTML = `
        <div class="container mx-auto px-4 py-16 text-center">
          <h1 class="text-4xl font-bold mb-4 text-red-500">${i18nService.t('common.error')}</h1>
          <p class="text-gray-600 dark:text-gray-400">
            ${i18nService.t('common.tryAgain')}
          </p>
        </div>
      `;
    }

    return page;
  }

  /**
   * Load and display featured projects
   */
  async loadFeaturedProjects() {
    if (!this.element) return;

    const container = this.element.querySelector('#featured-projects-container');
    if (!container) return;

    try {
      const projects = await dataService.getProjects({ featured: true });
      const featuredProjects = projects.slice(0, 3); // Show max 3 projects

      if (featuredProjects.length === 0) {
        container.innerHTML = '<p class="text-gray-600 dark:text-gray-400 text-center col-span-full">No featured projects yet.</p>';
        return;
      }

      container.innerHTML = featuredProjects
        .map(
          (project) => `
        <article class="card bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
          <img
            src="${project.thumbnail}"
            alt="${project.title}"
            class="w-full h-48 object-cover"
            loading="lazy"
          />
          <div class="p-6">
            <h3 class="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">
              ${project.title}
            </h3>
            <p class="text-gray-600 dark:text-gray-400 mb-4">
              ${project.description}
            </p>
            <div class="flex flex-wrap gap-2 mb-4">
              ${project.technologies
                .slice(0, 3)
                .map(
                  (tech) =>
                    `<span class="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-sm rounded-full text-gray-700 dark:text-gray-300">${tech}</span>`
                )
                .join('')}
            </div>
            <a
              href="#/projects/${project.slug}"
              class="text-primary-light dark:text-primary-dark font-semibold hover:underline"
            >
              Learn More →
            </a>
          </div>
        </article>
      `
        )
        .join('');
    } catch (error) {
      console.error('Error loading featured projects:', error);
      container.innerHTML = '<p class="text-red-500 text-center col-span-full">Error loading projects.</p>';
    }
  }

  /**
   * Load and display skills
   * @param {Array} skills - Skills array from about.json
   */
  async loadSkills(skills) {
    if (!this.element || !skills) return;

    const container = this.element.querySelector('#skills-container');
    if (!container) return;

    container.innerHTML = skills
      .map(
        (skillCategory) => `
      <div class="card bg-white dark:bg-gray-900 rounded-lg p-6 shadow-md">
        <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          ${skillCategory.category}
        </h3>
        <ul class="space-y-2">
          ${skillCategory.items
            .map(
              (skill) => `
            <li class="text-gray-600 dark:text-gray-400 flex items-center">
              <svg class="w-4 h-4 mr-2 text-primary-light dark:text-primary-dark" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              ${skill}
            </li>
          `
            )
            .join('')}
        </ul>
      </div>
    `
      )
      .join('');
  }

  /**
   * Update content when locale changes
   */
  updateContent() {
    if (!this.element || !this.about) return;

    const availabilityStatus = this.about.availability === 'available'
      ? i18nService.t('home.available')
      : i18nService.t('home.notAvailable');

    // Update all elements with data-i18n attribute
    this.element.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key === 'home.availableFor') {
        el.textContent = i18nService.t(key, { status: availabilityStatus });
      } else {
        el.textContent = i18nService.t(key);
      }
    });
  }

  /**
   * Mount the page to a DOM element
   * @param {HTMLElement|string} target - Target element or selector
   */
  async mount(target) {
    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) {
      console.error('HomePage mount target not found');
      return;
    }

    const page = await this.render();
    container.innerHTML = ''; // Clear existing content
    container.appendChild(page);

    // Listen for locale changes
    this.localeChangeHandler = () => this.updateContent();
    eventBus.on('locale:changed', this.localeChangeHandler);
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

export default HomePage;

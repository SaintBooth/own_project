/**
 * ProjectsPage Component
 * Projects list page with filtering and sorting
 */

import dataService from '../services/dataService.js';
import projectCard from '../components/ProjectCard.js';
import i18nService from '../services/i18nService.js';
import eventBus from '../services/eventBus.js';

class ProjectsPage {
  constructor() {
    this.element = null;
    this.projects = [];
    this.filteredProjects = [];
    this.currentCategory = 'all';
    this.currentSort = 'order';
  }

  /**
   * Render the projects page
   * @returns {Promise<HTMLElement>}
   */
  async render() {
    const page = document.createElement('div');
    page.className = 'projects-page';

    try {
      // Fetch all projects
      this.projects = await dataService.getProjects();
      this.filteredProjects = [...this.projects];

      // Get unique categories
      const categories = ['all', ...new Set(this.projects.map(p => p.category).filter(Boolean))];

      const projectCountText = this.filteredProjects.length !== 1
        ? i18nService.t('projects.projects')
        : i18nService.t('projects.project');

      page.innerHTML = `
        <!-- Header Section -->
        <section class="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
          <div class="container mx-auto px-4">
            <h1 class="text-4xl md:text-5xl font-bold mb-4" data-i18n="projects.title">${i18nService.t('projects.title')}</h1>
            <p class="text-xl text-gray-100 max-w-2xl" data-i18n="projects.description">
              ${i18nService.t('projects.description')}
            </p>
          </div>
        </section>

        <!-- Filters & Sort Section -->
        <section class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div class="container mx-auto px-4 py-4">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <!-- Category Filters -->
              <div class="flex flex-wrap gap-2">
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-2 flex items-center" data-i18n="projects.filter">
                  ${i18nService.t('projects.filter')}
                </span>
                ${categories.map(category => `
                  <button
                    class="filter-btn px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      category === 'all'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }"
                    data-filter="${category}"
                    data-category="${category}"
                    data-i18n="${category === 'all' ? 'projects.allProjects' : 'projects.category.' + category}"
                  >
                    ${category === 'all' ? i18nService.t('projects.allProjects') : i18nService.t('projects.category.' + category)}
                  </button>
                `).join('')}
              </div>

              <!-- Sort Dropdown -->
              <div class="flex items-center gap-2">
                <label for="sort-select" class="text-sm font-semibold text-gray-700 dark:text-gray-300" data-i18n="projects.sortBy">
                  ${i18nService.t('projects.sortBy')}
                </label>
                <select
                  id="sort-select"
                  name="sort"
                  class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="order" data-i18n="projects.sortOrder">${i18nService.t('projects.sortOrder')}</option>
                  <option value="title-asc" data-i18n="projects.sortTitleAsc">${i18nService.t('projects.sortTitleAsc')}</option>
                  <option value="title-desc" data-i18n="projects.sortTitleDesc">${i18nService.t('projects.sortTitleDesc')}</option>
                  <option value="date-desc" data-i18n="projects.sortDateDesc">${i18nService.t('projects.sortDateDesc')}</option>
                  <option value="date-asc" data-i18n="projects.sortDateAsc">${i18nService.t('projects.sortDateAsc')}</option>
                  <option value="reactions-desc" data-i18n="projects.sortReactions">${i18nService.t('projects.sortReactions')}</option>
                </select>
              </div>
            </div>

            <!-- Results Count -->
            <div class="mt-3">
              <p id="results-count" class="text-sm text-gray-600 dark:text-gray-400">
                <span data-i18n="projects.showing">${i18nService.t('projects.showing')}</span> <span class="font-semibold">${this.filteredProjects.length}</span> <span data-i18n-count>${projectCountText}</span>
              </p>
            </div>
          </div>
        </section>

        <!-- Projects Grid -->
        <section class="py-12 bg-gray-50 dark:bg-gray-900">
          <div class="container mx-auto px-4">
            <div id="projects-grid" class="projects-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <!-- Projects will be rendered here -->
            </div>

            <!-- Empty State -->
            <div id="empty-state" class="hidden text-center py-16">
              <svg class="w-24 h-24 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 class="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2" data-i18n="projects.noProjects">
                ${i18nService.t('projects.noProjects')}
              </h3>
              <p class="text-gray-600 dark:text-gray-400" data-i18n="projects.noProjectsDesc">
                ${i18nService.t('projects.noProjectsDesc')}
              </p>
            </div>
          </div>
        </section>
      `;

      this.element = page;
      this.renderProjects();
      this.attachEventListeners();

    } catch (error) {
      console.error('Error rendering projects page:', error);
      page.innerHTML = `
        <div class="container mx-auto px-4 py-16 text-center">
          <h1 class="text-4xl font-bold mb-4 text-red-500">Error Loading Projects</h1>
          <p class="text-gray-600 dark:text-gray-400">
            There was an error loading the projects. Please try again later.
          </p>
        </div>
      `;
    }

    return page;
  }

  /**
   * Render projects to grid
   */
  renderProjects() {
    if (!this.element) return;

    const grid = this.element.querySelector('#projects-grid');
    const emptyState = this.element.querySelector('#empty-state');
    const resultsCount = this.element.querySelector('#results-count');

    if (!grid) return;

    // Clear grid
    grid.innerHTML = '';

    if (this.filteredProjects.length === 0) {
      grid.classList.add('hidden');
      emptyState?.classList.remove('hidden');
    } else {
      grid.classList.remove('hidden');
      emptyState?.classList.add('hidden');

      // Render each project card
      this.filteredProjects.forEach(project => {
        const card = projectCard.render(project);
        grid.appendChild(card);
      });
    }

    // Update results count
    if (resultsCount) {
      const projectCountText = this.filteredProjects.length !== 1
        ? i18nService.t('projects.projects')
        : i18nService.t('projects.project');
      resultsCount.innerHTML = `
        <span data-i18n="projects.showing">${i18nService.t('projects.showing')}</span> <span class="font-semibold">${this.filteredProjects.length}</span> <span data-i18n-count>${projectCountText}</span>
      `;
    }
  }

  /**
   * Filter projects by category
   * @param {string} category - Category to filter by
   */
  filterByCategory(category) {
    this.currentCategory = category;

    if (category === 'all') {
      this.filteredProjects = [...this.projects];
    } else {
      this.filteredProjects = this.projects.filter(p => p.category === category);
    }

    this.applySorting();
    this.renderProjects();
    this.updateFilterButtons();
  }

  /**
   * Sort projects
   * @param {string} sortBy - Sort method
   */
  sortProjects(sortBy) {
    this.currentSort = sortBy;
    this.applySorting();
    this.renderProjects();
  }

  /**
   * Apply current sorting to filtered projects
   */
  applySorting() {
    const sortFunctions = {
      'order': (a, b) => (a.order || 0) - (b.order || 0),
      'title-asc': (a, b) => a.title.localeCompare(b.title),
      'title-desc': (a, b) => b.title.localeCompare(a.title),
      'date-desc': (a, b) => new Date(b.completedDate || 0) - new Date(a.completedDate || 0),
      'date-asc': (a, b) => new Date(a.completedDate || 0) - new Date(b.completedDate || 0),
      'reactions-desc': (a, b) => {
        const aTotal = Object.values(a.reactionCounts || {}).reduce((sum, count) => sum + count, 0);
        const bTotal = Object.values(b.reactionCounts || {}).reduce((sum, count) => sum + count, 0);
        return bTotal - aTotal;
      }
    };

    const sortFn = sortFunctions[this.currentSort] || sortFunctions['order'];
    this.filteredProjects.sort(sortFn);
  }

  /**
   * Update active state of filter buttons
   */
  updateFilterButtons() {
    if (!this.element) return;

    const filterButtons = this.element.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      const category = btn.getAttribute('data-category');
      if (category === this.currentCategory) {
        btn.className = 'filter-btn px-4 py-2 rounded-lg font-medium text-sm transition-all bg-primary-500 text-white';
      } else {
        btn.className = 'filter-btn px-4 py-2 rounded-lg font-medium text-sm transition-all bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700';
      }
    });
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.element) return;

    // Filter buttons
    const filterButtons = this.element.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-category');
        this.filterByCategory(category);
      });
    });

    // Sort dropdown
    const sortSelect = this.element.querySelector('#sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortProjects(e.target.value);
      });
    }
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

    // Update results count
    const resultsCount = this.element.querySelector('#results-count');
    if (resultsCount) {
      const projectCountText = this.filteredProjects.length !== 1
        ? i18nService.t('projects.projects')
        : i18nService.t('projects.project');
      resultsCount.innerHTML = `
        <span data-i18n="projects.showing">${i18nService.t('projects.showing')}</span> <span class="font-semibold">${this.filteredProjects.length}</span> <span data-i18n-count>${projectCountText}</span>
      `;
    }

    // Update filter buttons
    const filterButtons = this.element.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      const category = btn.getAttribute('data-category');
      const key = btn.getAttribute('data-i18n');
      btn.textContent = i18nService.t(key);
    });

    // Update sort options
    const sortOptions = this.element.querySelectorAll('#sort-select option');
    sortOptions.forEach(option => {
      const key = option.getAttribute('data-i18n');
      if (key) {
        option.textContent = i18nService.t(key);
      }
    });
  }

  /**
   * Mount the page to DOM
   * @param {HTMLElement|string} target - Target element or selector
   */
  async mount(target) {
    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) {
      console.error('ProjectsPage mount target not found');
      return;
    }

    const page = await this.render();
    container.innerHTML = '';
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

export default ProjectsPage;

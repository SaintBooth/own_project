/**
 * Data Service - Fetches and caches JSON data files
 */

let projectsCache = null;
let servicesCache = null;
let aboutCache = null;

const dataService = {
  /**
   * Get all projects with optional filtering
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of projects
   */
  async getProjects(options = {}) {
    if (!projectsCache) {
      try {
        const response = await fetch('/src/data/projects.json');
        if (!response.ok) throw new Error('Failed to fetch projects');
        projectsCache = await response.json();
      } catch (error) {
        console.error('Error fetching projects:', error);
        return [];
      }
    }

    let projects = [...projectsCache];

    // Filter by status
    const includeStatus = options.includeStatus || 'published';
    if (includeStatus !== 'all') {
      projects = projects.filter(p => p.status === includeStatus);
    }

    // Filter by category
    if (options.category) {
      projects = projects.filter(p => p.category === options.category);
    }

    // Filter by featured
    if (options.featured !== undefined) {
      projects = projects.filter(p => p.featured === options.featured);
    }

    // Sort
    const sortBy = options.sortBy || 'order';
    if (sortBy === 'date') {
      projects.sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate));
    } else if (sortBy === 'title') {
      projects.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      projects.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    // Limit
    if (options.limit) {
      projects = projects.slice(0, options.limit);
    }

    return projects;
  },

  /**
   * Get project by ID
   * @param {string} id - Project ID
   * @returns {Promise<Object|null>} Project or null
   */
  async getProjectById(id) {
    const projects = await this.getProjects({ includeStatus: 'all' });
    return projects.find(p => p.id === id) || null;
  },

  /**
   * Get project by slug
   * @param {string} slug - Project slug
   * @returns {Promise<Object|null>} Project or null
   */
  async getProjectBySlug(slug) {
    const projects = await this.getProjects({ includeStatus: 'all' });
    return projects.find(p => p.slug === slug) || null;
  },

  /**
   * Get all services
   * @returns {Promise<Array>} Array of services
   */
  async getServices() {
    if (!servicesCache) {
      try {
        const response = await fetch('/src/data/services.json');
        if (!response.ok) throw new Error('Failed to fetch services');
        servicesCache = await response.json();
      } catch (error) {
        console.error('Error fetching services:', error);
        return [];
      }
    }

    return [...servicesCache].sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  /**
   * Get about content
   * @returns {Promise<Object|null>} About content or null
   */
  async getAbout() {
    if (!aboutCache) {
      try {
        const response = await fetch('/src/data/about.json');
        if (!response.ok) throw new Error('Failed to fetch about');
        aboutCache = await response.json();
      } catch (error) {
        console.error('Error fetching about:', error);
        return null;
      }
    }

    return aboutCache;
  },

  /**
   * Clear all caches (force re-fetch)
   */
  clearCache() {
    projectsCache = null;
    servicesCache = null;
    aboutCache = null;
  }
};

export default dataService;

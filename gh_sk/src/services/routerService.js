/**
 * Router Service - Client-side hash-based routing
 */

import eventBus from './eventBus.js';

class RouterService {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.notFoundHandler = null;
  }

  /**
   * Initialize router with routes
   * @param {Array} routes - Array of route configurations
   */
  init(routes) {
    routes.forEach(({ path, handler, title, meta }) => {
      this.routes.set(path, { handler, title, meta });
    });

    // Handle hash changes
    window.addEventListener('hashchange', () => this.handleRoute());

    // Handle initial load
    this.handleRoute();
  }

  /**
   * Navigate to a route
   * @param {string} path - Route path
   * @param {Object} [data] - Optional data to pass
   */
  navigate(path, data = {}) {
    window.location.hash = path;
    if (data) {
      // Store navigation data temporarily
      this.currentRoute = { ...this.currentRoute, data };
    }
  }

  /**
   * Get current route information
   * @returns {Object|null} Current route with params and query
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Handle route changes
   * @private
   */
  async handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    let { path, params, query } = this.parsePath(hash);

    // Find matching route
    let routeConfig = this.routes.get(path);

    // Try dynamic routes (with :param)
    if (!routeConfig) {
      for (const [routePath, config] of this.routes.entries()) {
        if (routePath.includes(':')) {
          const match = this.matchDynamicRoute(routePath, path);
          if (match) {
            routeConfig = config;
            params = { ...params, ...match };
            break;
          }
        }
      }
    }

    // Handle 404
    if (!routeConfig) {
      const appRoot = document.getElementById('app-root');
      if (appRoot) {
        appRoot.innerHTML = `
          <div class="container mx-auto px-4 py-16 text-center">
            <h1 class="text-4xl font-bold mb-4 text-red-500">404 - Page Not Found</h1>
            <p class="text-gray-600 dark:text-gray-400 mb-8">
              The page you're looking for doesn't exist.
            </p>
            <a href="#/" class="btn btn-primary px-8 py-3 rounded-lg font-semibold">
              Go Home
            </a>
          </div>
        `;
      }
      return;
    }

    // Update current route
    this.currentRoute = { path, params, query };

    // Update document title
    if (routeConfig.title) {
      document.title = `${routeConfig.title} | Developer Portfolio`;
    }

    // Update meta tags if provided
    if (routeConfig.meta) {
      this.updateMetaTags(routeConfig.meta);
    }

    // Emit route change event
    eventBus.emit('route:change', this.currentRoute);

    // Call route handler
    if (routeConfig.handler) {
      await routeConfig.handler({ params, query });
    }
  }

  /**
   * Parse path into components
   * @param {string} path - Full path with query params
   * @returns {Object} Parsed path components
   * @private
   */
  parsePath(path) {
    const [pathPart, queryPart] = path.split('?');
    const query = {};

    if (queryPart) {
      queryPart.split('&').forEach(param => {
        const [key, value] = param.split('=');
        query[decodeURIComponent(key)] = decodeURIComponent(value || '');
      });
    }

    return { path: pathPart, params: {}, query };
  }

  /**
   * Match dynamic route pattern
   * @param {string} pattern - Route pattern (e.g., /projects/:slug)
   * @param {string} path - Actual path
   * @returns {Object|null} Matched params or null
   * @private
   */
  matchDynamicRoute(pattern, path) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        const paramName = patternParts[i].slice(1);
        params[paramName] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }

    return params;
  }

  /**
   * Update meta tags
   * @param {Object} meta - Meta tag data
   * @private
   */
  updateMetaTags(meta) {
    if (meta.description) {
      let descMeta = document.querySelector('meta[name="description"]');
      if (!descMeta) {
        descMeta = document.createElement('meta');
        descMeta.name = 'description';
        document.head.appendChild(descMeta);
      }
      descMeta.content = meta.description;
    }

    // Add more meta tag updates as needed (OG tags, etc.)
  }
}

// Export singleton
const routerService = new RouterService();
export default routerService;

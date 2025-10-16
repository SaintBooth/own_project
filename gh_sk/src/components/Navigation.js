/**
 * Navigation Component
 * Responsive navigation with desktop and mobile views
 */

import eventBus from '../services/eventBus.js';
import routerService from '../services/routerService.js';
import i18nService from '../services/i18nService.js';

class Navigation {
  constructor() {
    this.desktopNav = null;
    this.mobileNav = null;
    this.routes = [
      { path: '/', labelKey: 'nav.home' },
      { path: '/projects', labelKey: 'nav.projects' },
      { path: '/about', labelKey: 'nav.about' },
      { path: '/services', labelKey: 'nav.services' },
      { path: '/contact', labelKey: 'nav.contact' },
    ];
  }

  /**
   * Render desktop navigation
   * @returns {HTMLElement}
   */
  renderDesktop() {
    const nav = document.createElement('nav');
    nav.className = 'hidden md:flex items-center space-x-8';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Main navigation');

    const navList = document.createElement('ul');
    navList.className = 'flex items-center space-x-8';

    this.routes.forEach((route) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${route.path}`;
      link.textContent = i18nService.t(route.labelKey);
      link.className = 'nav-link text-gray-700 dark:text-gray-300 hover:text-primary-light dark:hover:text-primary-dark transition-colors font-medium';
      link.dataset.labelKey = route.labelKey;

      // Add active state styling
      link.addEventListener('click', (e) => {
        e.preventDefault();
        routerService.navigate(route.path);
        this.updateActiveLinks();
      });

      li.appendChild(link);
      navList.appendChild(li);
    });

    nav.appendChild(navList);
    this.desktopNav = nav;
    this.updateActiveLinks();
    return nav;
  }

  /**
   * Render mobile navigation
   * @returns {HTMLElement}
   */
  renderMobile() {
    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'mobile-menu md:hidden fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm translate-x-full transition-transform duration-300';
    mobileMenu.setAttribute('role', 'dialog');
    mobileMenu.setAttribute('aria-label', 'Mobile menu');
    mobileMenu.setAttribute('aria-modal', 'true');

    // Mobile menu panel
    const panel = document.createElement('div');
    panel.className = 'absolute right-0 top-0 h-full w-64 bg-white dark:bg-gray-900 shadow-xl p-6 overflow-y-auto';

    // Close button
    const closeButton = document.createElement('button');
    closeButton.className = 'absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors';
    closeButton.setAttribute('aria-label', 'Close menu');
    closeButton.innerHTML = `
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `;

    closeButton.addEventListener('click', () => {
      this.closeMobileMenu();
    });

    panel.appendChild(closeButton);

    // Mobile navigation links
    const nav = document.createElement('nav');
    nav.className = 'mt-12';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Mobile navigation');

    const navList = document.createElement('ul');
    navList.className = 'space-y-4';

    this.routes.forEach((route) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${route.path}`;
      link.textContent = i18nService.t(route.labelKey);
      link.className = 'mobile-nav-link block py-3 px-4 text-lg font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors';
      link.dataset.labelKey = route.labelKey;

      link.addEventListener('click', (e) => {
        e.preventDefault();
        routerService.navigate(route.path);
        this.closeMobileMenu();
        this.updateActiveLinks();
      });

      li.appendChild(link);
      navList.appendChild(li);
    });

    nav.appendChild(navList);
    panel.appendChild(nav);
    mobileMenu.appendChild(panel);

    // Close menu when clicking backdrop
    mobileMenu.addEventListener('click', (e) => {
      if (e.target === mobileMenu) {
        this.closeMobileMenu();
      }
    });

    this.mobileNav = mobileMenu;
    return mobileMenu;
  }

  /**
   * Update navigation labels when locale changes
   */
  updateLabels() {
    // Update desktop nav labels
    if (this.desktopNav) {
      const links = this.desktopNav.querySelectorAll('.nav-link');
      links.forEach((link) => {
        const labelKey = link.dataset.labelKey;
        if (labelKey) {
          link.textContent = i18nService.t(labelKey);
        }
      });
    }

    // Update mobile nav labels
    if (this.mobileNav) {
      const links = this.mobileNav.querySelectorAll('.mobile-nav-link');
      links.forEach((link) => {
        const labelKey = link.dataset.labelKey;
        if (labelKey) {
          link.textContent = i18nService.t(labelKey);
        }
      });
    }
  }

  /**
   * Update active link styling based on current route
   */
  updateActiveLinks() {
    const currentRoute = routerService.getCurrentRoute();
    const currentPath = currentRoute?.path || '/';

    // Update desktop nav
    if (this.desktopNav) {
      const links = this.desktopNav.querySelectorAll('.nav-link');
      links.forEach((link) => {
        const linkPath = link.getAttribute('href').replace('#', '');
        if (linkPath === currentPath) {
          link.classList.add('text-primary-light', 'dark:text-primary-dark');
          link.classList.remove('text-gray-700', 'dark:text-gray-300');
        } else {
          link.classList.remove('text-primary-light', 'dark:text-primary-dark');
          link.classList.add('text-gray-700', 'dark:text-gray-300');
        }
      });
    }

    // Update mobile nav
    if (this.mobileNav) {
      const links = this.mobileNav.querySelectorAll('.mobile-nav-link');
      links.forEach((link) => {
        const linkPath = link.getAttribute('href').replace('#', '');
        if (linkPath === currentPath) {
          link.classList.add('bg-primary-light', 'text-white', 'dark:bg-primary-dark');
          link.classList.remove('text-gray-900', 'dark:text-gray-100');
        } else {
          link.classList.remove('bg-primary-light', 'text-white', 'dark:bg-primary-dark');
          link.classList.add('text-gray-900', 'dark:text-gray-100');
        }
      });
    }
  }

  /**
   * Open mobile menu
   */
  openMobileMenu() {
    if (this.mobileNav) {
      this.mobileNav.classList.remove('translate-x-full');
      document.body.style.overflow = 'hidden'; // Prevent scroll
    }
  }

  /**
   * Close mobile menu
   */
  closeMobileMenu() {
    if (this.mobileNav) {
      this.mobileNav.classList.add('translate-x-full');
      document.body.style.overflow = ''; // Restore scroll
      eventBus.emit('mobile-menu:close');
    }
  }

  /**
   * Mount navigation to the page
   * @param {HTMLElement|string} desktopTarget - Target for desktop nav
   * @param {HTMLElement|string} mobileTarget - Target for mobile nav (usually body)
   */
  mount(desktopTarget, mobileTarget = 'body') {
    // Mount desktop navigation
    const desktopContainer = typeof desktopTarget === 'string' ? document.querySelector(desktopTarget) : desktopTarget;
    if (desktopContainer) {
      const desktopNav = this.renderDesktop();
      desktopContainer.appendChild(desktopNav);
    }

    // Mount mobile navigation
    const mobileContainer = typeof mobileTarget === 'string' ? document.querySelector(mobileTarget) : mobileTarget;
    if (mobileContainer) {
      const mobileNav = this.renderMobile();
      mobileContainer.appendChild(mobileNav);
    }

    // Listen for mobile menu toggle events from Header
    eventBus.on('mobile-menu:toggle', ({ open }) => {
      if (open) {
        this.openMobileMenu();
      } else {
        this.closeMobileMenu();
      }
    });

    // Listen for route changes to update active links
    eventBus.on('route:change', () => {
      this.updateActiveLinks();
    });

    // Listen for locale changes to update labels
    eventBus.on('locale:changed', () => {
      this.updateLabels();
    });
  }

  /**
   * Unmount and cleanup
   */
  unmount() {
    if (this.desktopNav) {
      this.desktopNav.remove();
      this.desktopNav = null;
    }

    if (this.mobileNav) {
      this.mobileNav.remove();
      this.mobileNav = null;
      document.body.style.overflow = ''; // Restore scroll
    }

    eventBus.off('mobile-menu:toggle');
    eventBus.off('route:change');
    eventBus.off('locale:changed');
  }
}

// Export singleton instance
export default new Navigation();

/**
 * Application Entry Point
 */

import themeService from './services/themeService.js';
import routerService from './services/routerService.js';
import i18nService from './services/i18nService.js';
import headerComponent from './components/Header.js';
import navigationComponent from './components/Navigation.js';
import footerComponent from './components/Footer.js';
import HomePage from './pages/HomePage.js';
import ProjectsPage from './pages/ProjectsPage.js';
import ProjectDetailPage from './pages/ProjectDetailPage.js';
import AboutPage from './pages/AboutPage.js';
import ServicesPage from './pages/ServicesPage.js';
import ContactPage from './pages/ContactPage.js';

// Initialize theme first (prevent FOUC)
themeService.initTheme();

// Application initialization
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Portfolio application initializing...');

  // Initialize i18n service
  await i18nService.init();

  // Mount Header component
  headerComponent.mount('#header-root');

  // Mount Navigation component (desktop to header, mobile to body)
  navigationComponent.mount('#nav-desktop', 'body');

  // Mount Footer component
  footerComponent.mount('#footer-root');

  // Define routes
  const routes = [
    {
      path: '/',
      handler: async () => {
        const homePage = new HomePage();
        await homePage.mount('#app-root');
      },
    },
    {
      path: '/projects',
      handler: async () => {
        const projectsPage = new ProjectsPage();
        await projectsPage.mount('#app-root');
      },
    },
    {
      path: '/projects/:slug',
      handler: async ({ params }) => {
        const projectDetailPage = new ProjectDetailPage(params.slug);
        await projectDetailPage.mount('#app-root');
      },
    },
    {
      path: '/about',
      handler: async () => {
        const aboutPage = new AboutPage();
        await aboutPage.mount('#app-root');
      },
    },
    {
      path: '/services',
      handler: async () => {
        const servicesPage = new ServicesPage();
        await servicesPage.mount('#app-root');
      },
    },
    {
      path: '/contact',
      handler: async () => {
        const contactPage = new ContactPage();
        await contactPage.mount('#app-root');
      },
    },
  ];

  // Initialize router with routes
  routerService.init(routes);

  console.log('✅ Phase 3 Complete: Responsive website with navigation ready');
  console.log('📋 Next steps: Implement remaining user stories');
});

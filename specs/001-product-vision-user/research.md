# Research & Technology Decisions: Modern Developer Portfolio Website

**Feature**: 001-product-vision-user
**Phase**: 0 - Research & Discovery
**Date**: 2025-10-15

## Purpose

This document consolidates research findings, technology choices, architectural patterns, and best practices for implementing the developer portfolio website. All NEEDS CLARIFICATION items from the Technical Context have been resolved through research and documented here.

---

## Technology Stack Decisions

### 1. Build Tool: Vite

**Decision**: Use Vite 5.x as the primary build tool and development server

**Rationale**:
- Ultra-fast Hot Module Replacement (HMR) improves developer experience
- Native ES modules support aligns with modern JavaScript practices
- Built-in optimization for production (code splitting, tree shaking, minification)
- Excellent plugin ecosystem for Tailwind, image optimization, and PWA features
- Static site generation capabilities through plugins (vite-plugin-ssg)
- Smaller learning curve compared to Next.js for vanilla JS projects
- Better suited for MVP without React/Vue overhead

**Alternatives Considered**:
- **Next.js**: Rejected for MVP due to React dependency and unnecessary complexity for static content site. Can migrate later if dynamic features needed.
- **Webpack**: Rejected due to complex configuration and slower build times
- **Parcel**: Less ecosystem support and fewer optimization options

**Best Practices**:
- Use `vite build` with `--mode production` for optimized builds
- Leverage dynamic imports for route-based code splitting
- Configure `rollupOptions` for manual chunk splitting
- Use `vite-plugin-compression` for gzip/brotli compression
- Enable `build.cssCodeSplit` for CSS per-route splitting

**References**:
- Vite Guide: https://vitejs.dev/guide/
- Vite Performance: https://vitejs.dev/guide/features.html#build-optimizations

---

### 2. Styling Framework: Tailwind CSS 3.x

**Decision**: Use Tailwind CSS 3.x for utility-first styling with custom theme tokens

**Rationale**:
- Utility-first approach speeds up development and reduces CSS bloat
- PurgeCSS integration removes unused styles (production bundle < 10KB)
- Built-in responsive design utilities (mobile-first breakpoints)
- Excellent dark mode support via `class` or `media` strategy
- Customizable design tokens for consistent theming
- JIT (Just-In-Time) compiler for faster builds and smaller bundles
- Strong community and plugin ecosystem

**Alternatives Considered**:
- **Plain CSS/SCSS**: Rejected due to maintenance overhead and lack of design system
- **Bootstrap**: Rejected as too opinionated and larger bundle size
- **CSS-in-JS (styled-components)**: Rejected due to runtime overhead without React

**Best Practices**:
- Define design tokens in `tailwind.config.js` (colors, spacing, typography)
- Use `@layer components` for reusable component styles
- Enable `darkMode: 'class'` for manual theme control
- Configure `content` array properly for optimal PurgeCSS
- Use `@apply` sparingly (prefer utility classes in HTML)
- Create custom plugins for repeated patterns

**Implementation Details**:
```javascript
// tailwind.config.js structure
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  content: ['./index.html', './src/**/*.{js,html}'],
  theme: {
    extend: {
      colors: {
        primary: { light: '#...', dark: '#...' },
        // ... design tokens
      }
    }
  }
}
```

**References**:
- Tailwind Dark Mode: https://tailwindcss.com/docs/dark-mode
- Tailwind Best Practices: https://tailwindcss.com/docs/reusing-styles

---

### 3. Client-Side Routing

**Decision**: Implement lightweight hash-based routing with vanilla JavaScript

**Rationale**:
- No server configuration needed (works on any static host)
- Simple implementation for SPA navigation (~50 lines of code)
- Browser history API for back/forward support
- SEO-friendly with proper meta tag management
- No external dependencies required for MVP
- Can migrate to Vue Router or React Router later if needed

**Alternatives Considered**:
- **Page.js / Navigo**: Small routers but unnecessary dependency for simple routes
- **History API (pushState)**: Requires server rewrites for direct URL access
- **No routing (anchor links)**: Poor UX, breaks SPA experience

**Best Practices**:
- Use hash routing (#/page) for static hosting compatibility
- Implement route guards for validation
- Update document.title and meta tags on route change
- Handle 404/invalid routes gracefully
- Lazy load page components for better performance
- Implement transition animations between routes

**Implementation Pattern**:
```javascript
// routerService.js pattern
class Router {
  constructor(routes) {
    this.routes = routes;
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const route = this.routes[hash] || this.routes['/404'];
    // Load and render component
  }
}
```

**References**:
- MDN HashChange: https://developer.mozilla.org/en-US/docs/Web/API/Window/hashchange_event

---

### 4. Theme Detection & Switching

**Decision**: Use CSS custom properties with `prefers-color-scheme` media query + manual toggle

**Rationale**:
- Native browser support for system theme detection
- CSS custom properties enable instant theme switching without re-render
- LocalStorage persistence for user preference
- Lightweight implementation (<30 lines of JS)
- WCAG compliant contrast ratios enforced via design tokens
- Smooth transition animations between themes

**Alternatives Considered**:
- **JavaScript-only theming**: Rejected due to FOUC (Flash of Unstyled Content)
- **Separate CSS files**: Rejected due to additional network requests
- **Tailwind dark mode only**: Insufficient for smooth transitions

**Best Practices**:
- Set theme class on `<html>` element for global scope
- Use CSS transitions for smooth theme changes
- Prevent FOUC by inlining theme detection script in `<head>`
- Respect user's `prefers-reduced-motion` setting
- Provide accessible toggle button (ARIA labels)
- Store preference in LocalStorage with fallback to system preference

**Implementation Pattern**:
```javascript
// themeService.js pattern
function initTheme() {
  const stored = localStorage.getItem('theme');
  const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const theme = stored || system;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

// Listen for system changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    document.documentElement.classList.toggle('dark', e.matches);
  }
});
```

**References**:
- MDN prefers-color-scheme: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme
- CSS Custom Properties: https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties

---

### 5. LocalStorage for Reactions & Preferences

**Decision**: Use LocalStorage API with JSON serialization for client-side data persistence

**Rationale**:
- No backend required for MVP
- 5-10MB storage capacity (sufficient for reactions and preferences)
- Synchronous API simplifies implementation
- Works offline
- Browser support: 95%+ of users
- Easy migration path to backend API later

**Alternatives Considered**:
- **IndexedDB**: Overkill for simple key-value storage
- **Cookies**: Limited storage (4KB), unnecessary for client-only data
- **SessionStorage**: Lost on tab close, unsuitable for persistent reactions

**Best Practices**:
- Wrap LocalStorage in service layer for error handling
- Implement quota exceeded handling
- Use JSON.stringify/parse with validation
- Namespace keys to avoid conflicts (e.g., `portfolio:reactions:${projectId}`)
- Provide graceful degradation if storage unavailable (private browsing)
- Version data structures for future migrations

**Implementation Pattern**:
```javascript
// storageService.js pattern
const storageService = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('Storage read error:', e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        // Handle storage full
      }
      return false;
    }
  }
};
```

**Data Structure**:
```json
{
  "theme": "dark",
  "reactions": {
    "project-id-1": { "type": "love", "timestamp": 1697520000000 },
    "project-id-2": { "type": "like", "timestamp": 1697520100000 }
  }
}
```

**References**:
- MDN LocalStorage: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

---

### 6. Form Handling & Validation

**Decision**: Client-side validation with email submission via FormSubmit.co or EmailJS (no backend initially)

**Rationale**:
- FormSubmit.co provides free form-to-email service without backend
- Client-side validation reduces server load and provides instant feedback
- HTML5 validation attributes for basic checks
- JavaScript validation for complex rules
- Easy to migrate to custom backend later

**Alternatives Considered**:
- **Netlify Forms**: Tied to Netlify hosting
- **Google Forms**: Poor UX integration
- **Custom Backend**: Unnecessary complexity for MVP
- **Mailto links**: Poor user experience, spam vulnerability

**Best Practices**:
- Use HTML5 validation attributes (`required`, `type="email"`, `pattern`)
- Implement JavaScript validation for better UX (real-time feedback)
- Show validation errors inline with ARIA attributes
- Disable submit button during submission (prevent double-submit)
- Show success/error messages clearly
- Sanitize inputs (XSS prevention)
- Implement honeypot field for spam prevention

**Implementation Pattern**:
```javascript
// formService.js pattern
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

async function submitForm(formData) {
  // Validate
  if (!validateEmail(formData.email)) {
    return { success: false, error: 'Invalid email' };
  }

  // Submit to FormSubmit.co
  const response = await fetch('https://formsubmit.co/your@email.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });

  return response.ok
    ? { success: true }
    : { success: false, error: 'Submission failed' };
}
```

**References**:
- FormSubmit.co: https://formsubmit.co/
- HTML5 Form Validation: https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation

---

### 7. Testing Strategy

**Decision**: Playwright for E2E tests + Vitest for unit tests

**Rationale**:
- **Playwright**: Cross-browser testing (Chrome, Firefox, Safari), headless mode, powerful selectors
- **Vitest**: Vite-native test runner, fast execution, Jest-compatible API
- Combined coverage of UI flows (E2E) and logic (unit)
- CI/CD friendly with GitHub Actions integration

**Alternatives Considered**:
- **Cypress**: Slower, heavier, less browser support
- **Jest + Testing Library**: Requires additional Webpack config, slower than Vitest

**Best Practices**:
- Write E2E tests for each user story acceptance scenario
- Use Page Object Model pattern for maintainable E2E tests
- Test critical user journeys (responsive, theme, projects, contact)
- Unit test services (storage, validation, theme logic)
- Run E2E tests in CI on every PR
- Maintain >80% code coverage for services

**E2E Test Structure** (User Story 1 example):
```javascript
// tests/e2e/responsive.spec.js
import { test, expect } from '@playwright/test';

test.describe('User Story 1: Responsive Website Access', () => {
  test('should display multi-column layout on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    // Assertions for desktop layout
  });

  test('should display single-column with hamburger menu on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    // Assertions for mobile layout
  });
});
```

**References**:
- Playwright Best Practices: https://playwright.dev/docs/best-practices
- Vitest Guide: https://vitest.dev/guide/

---

### 8. Image Optimization

**Decision**: Use modern image formats (WebP) with fallbacks + lazy loading

**Rationale**:
- WebP reduces image size by 25-35% vs JPEG/PNG
- Lazy loading improves initial page load time
- `loading="lazy"` attribute has 95%+ browser support
- Responsive images with `srcset` for different screen sizes

**Best Practices**:
- Convert all images to WebP with PNG/JPEG fallback
- Use `<picture>` element for format fallback
- Implement lazy loading with `loading="lazy"` attribute
- Generate multiple sizes for responsive images (srcset)
- Compress images with tools like Squoosh or ImageOptim
- Use Vite plugin for automatic image optimization

**Implementation Pattern**:
```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="..." loading="lazy">
</picture>
```

**Tools**:
- vite-plugin-imagemin for build-time optimization
- sharp for dynamic image processing (if backend added later)

---

### 9. Performance Optimization Patterns

**Research Findings**:

**Code Splitting**:
- Split code by route (lazy load pages)
- Separate vendor chunks (framework code)
- Dynamic imports for non-critical features

**Bundle Optimization**:
- Tree-shake unused Tailwind utilities
- Minify JS/CSS with terser and cssnano
- Use Brotli compression (better than gzip)

**Resource Loading**:
- Preload critical assets (`<link rel="preload">`)
- Defer non-critical scripts
- Use CDN for static assets in production

**Critical CSS**:
- Inline critical above-the-fold CSS
- Defer non-critical stylesheets

**Caching Strategy**:
- Cache static assets with long TTL
- Use content hashing for cache busting
- Service Worker for offline support (future enhancement)

**Implementation via vite.config.js**:
```javascript
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['module-name']
        }
      }
    },
    cssCodeSplit: true,
    minify: 'terser'
  }
}
```

---

### 10. Accessibility (a11y) Requirements

**Research Findings**:

**WCAG AA Compliance**:
- Contrast ratio: 4.5:1 for normal text, 3:1 for large text
- Keyboard navigation for all interactive elements
- Screen reader compatibility (ARIA labels)
- Focus indicators visible and clear
- No reliance on color alone for information

**Implementation Checklist**:
- ✅ Semantic HTML (proper heading hierarchy)
- ✅ ARIA attributes for dynamic content
- ✅ Alt text for all images
- ✅ Form labels and error messages
- ✅ Skip navigation link
- ✅ Focus management for modal/navigation
- ✅ Reduced motion support (`prefers-reduced-motion`)

**Testing Tools**:
- Lighthouse accessibility audit
- axe DevTools browser extension
- NVDA/VoiceOver screen reader testing

---

### 11. SEO Strategy

**Research Findings**:

**On-Page SEO**:
- Semantic HTML5 elements (`<header>`, `<nav>`, `<main>`, `<article>`)
- Proper heading hierarchy (H1 → H2 → H3)
- Meta tags (title, description, OG tags)
- Structured data (JSON-LD for projects)
- Canonical URLs
- XML sitemap

**Technical SEO**:
- Fast page load (< 3s)
- Mobile-friendly responsive design
- HTTPS (required for production)
- Clean URL structure (hash routing limitation noted)

**Content SEO**:
- Unique page titles and descriptions
- Descriptive alt text for images
- Internal linking between projects
- Schema.org markup for portfolio items

**Implementation**:
```html
<!-- Dynamic meta tag updates on route change -->
<head>
  <title id="page-title">Developer Portfolio</title>
  <meta name="description" content="..." id="page-description">
  <meta property="og:title" content="...">
  <meta property="og:description" content="...">
  <meta property="og:image" content="...">
</head>
```

---

## Architecture Patterns

### Component Architecture

**Pattern**: Vanilla JS Web Components with ES Modules

**Structure**:
```
Component
├── Render (HTML generation)
├── State Management (local state)
├── Event Handling (user interactions)
└── Lifecycle (mount, update, unmount)
```

**Example**:
```javascript
// components/ProjectCard.js
export class ProjectCard {
  constructor(project) {
    this.project = project;
    this.reactions = reactionService.getReactions(project.id);
  }

  render() {
    return `
      <article class="project-card">
        <img src="${this.project.thumbnail}" alt="${this.project.title}">
        <h3>${this.project.title}</h3>
        <p>${this.project.description}</p>
        ${this.renderReactions()}
      </article>
    `;
  }

  mount(container) {
    container.innerHTML = this.render();
    this.attachEventListeners();
  }
}
```

### Service Layer Pattern

**Pattern**: Singleton services for business logic

**Benefits**:
- Separation of concerns
- Testable in isolation
- Reusable across components
- Centralized state management

**Services**:
- `dataService`: Fetch and cache JSON data
- `storageService`: LocalStorage abstraction
- `themeService`: Theme detection and switching
- `reactionService`: Reaction CRUD operations
- `formService`: Validation and submission
- `routerService`: Client-side routing

---

## Migration Path to Full-Stack

**Future Backend Integration** (documented for Phase 2+):

When MVP proves successful, migration path to Node.js backend:

1. **Replace JSON files** with REST API endpoints
2. **Replace LocalStorage reactions** with database (PostgreSQL)
3. **Add user authentication** (JWT or session-based)
4. **Implement analytics backend** for success criteria tracking
5. **Add admin panel** for content management
6. **Set up CI/CD** with GitHub Actions

**Estimated Effort**: 2-3 weeks for basic backend

**Technology Suggestions**:
- Framework: Express.js or Fastify
- Database: PostgreSQL with Prisma ORM
- Hosting: Vercel, Railway, or DigitalOcean
- Auth: NextAuth.js or Auth0

---

## Summary of Resolved Clarifications

All "NEEDS CLARIFICATION" items from Technical Context have been resolved:

1. ✅ **Language/Version**: JavaScript ES2022 with HTML5/CSS3
2. ✅ **Primary Dependencies**: Vite, Tailwind CSS, PostCSS selected
3. ✅ **Storage**: LocalStorage for MVP, migration path to backend documented
4. ✅ **Testing**: Playwright + Vitest chosen with clear test strategy
5. ✅ **Performance Goals**: Specific metrics defined (FCP < 1.5s, TTI < 3s)
6. ✅ **Constraints**: WCAG AA, mobile-first, progressive enhancement
7. ✅ **Scale/Scope**: 5-20 projects, 10k monthly visitors

---

## Next Steps (Phase 1)

1. Create `data-model.md` with detailed entity schemas
2. Generate component contracts in `contracts/components.md`
3. Define JSON schema for `projects.json` in `contracts/data-schema.json`
4. Document LocalStorage patterns in `contracts/storage-api.md`
5. Write developer onboarding guide in `quickstart.md`
6. Update agent context with technology stack decisions

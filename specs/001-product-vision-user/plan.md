# Implementation Plan: Modern Developer Portfolio Website

**Branch**: `001-product-vision-user` | **Date**: 2025-10-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-product-vision-user/spec.md`

## Summary

Create a modern, responsive developer portfolio website that showcases completed projects, supports theme switching, enables visitor reactions, and provides multiple contact channels with lead generation optimizations. The site will be built as a Single Page Application (SPA) with static generation capabilities, using Vite as the bundler, Tailwind CSS for styling, and vanilla JavaScript (ES Modules) for interactivity. Project data will be managed through local JSON files with potential for future backend integration.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript ES2022 (ES Modules)
**Primary Dependencies**:
- Vite 5.x (build tool & dev server)
- Tailwind CSS 3.x (utility-first CSS framework)
- PostCSS 8.x (CSS processing)
- Autoprefixer (CSS vendor prefixing)

**Storage**:
- Local JSON files (projects.json, services.json, about.json) for content data
- Browser LocalStorage for user reactions and theme preferences
- Form submissions via FormSubmit.co (third-party service, no backend required for MVP)
- Future migration path: Node.js + Express API with SQLite/PostgreSQL for reactions and form data; content JSON files will remain static and can be migrated to database if dynamic CMS needed

**Testing**:
- Vitest (unit tests for JavaScript logic)
- Playwright (E2E tests for user journeys)
- Lighthouse CI (performance & accessibility auditing)

**Target Platform**:
- Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Mobile-first responsive design (320px - 2560px+)
- Progressive enhancement (works without JavaScript for basic content)

**Project Type**: SPA with static site generation capabilities

**Performance Goals**:
- First Contentful Paint (FCP) < 1.5s
- Time to Interactive (TTI) < 3s
- Lighthouse Performance score > 90
- Bundle size < 150KB gzipped
- Support 1000+ concurrent visitors

**Constraints**:
- Must work on mobile networks (3G+)
- WCAG AA accessibility compliance
- No user authentication in MVP
- SEO-friendly (meta tags, semantic HTML)
- Offline-capable static assets

**Scale/Scope**:
- 5-20 project showcase items
- 5-10 main pages/sections
- Support 10,000+ monthly visitors
- <100MB total asset size

## Constitution Check

*GATE: Constitution now exists with 7 core principles established.*

### Baseline Principles

1. **Progressive Enhancement**: Core content must be accessible without JavaScript
2. **Mobile-First Design**: Design for mobile first, enhance for desktop
3. **Accessibility First**: WCAG AA compliance is non-negotiable
4. **Performance Budget**: Total bundle < 150KB gzipped, images optimized
5. **Component-Based Architecture**: Reusable, testable components
6. **Test Coverage**: E2E tests for all user stories, unit tests for business logic
7. **Semantic HTML**: Proper document structure for SEO and accessibility

**Status**: PASS - No violations, establishing new standards

## Project Structure

### Documentation (this feature)

```
specs/001-product-vision-user/
   spec.md              # Feature specification (completed)
   plan.md              # This file (/speckit.plan command output)
   research.md          # Phase 0 output (technology decisions & patterns)
   data-model.md        # Phase 1 output (data structures)
   quickstart.md        # Phase 1 output (developer onboarding)
   contracts/           # Phase 1 output (component contracts & APIs)
      components.md    # Component interface specifications
      data-schema.json # JSON schema for projects.json
      storage-api.md   # LocalStorage API patterns
   tasks.md             # Phase 2 output (/speckit.tasks command - NOT YET)
```

### Source Code (repository root)

```
portfolio-website/
   public/                      # Static assets
      images/                  # Project screenshots, photos
         projects/            # Project thumbnails & details
         profile/             # Developer photos
      fonts/                   # Web fonts (if any)
      favicon.ico              # Site favicon

   src/
      data/                    # Content data files
         projects.json        # Project portfolio data
         services.json        # Services offered
         about.json           # About/bio content

      components/              # Reusable UI components
         Header.js            # Site header with navigation
         Footer.js            # Site footer
         Navigation.js        # Navigation menu (mobile/desktop)
         ProjectCard.js       # Project thumbnail card
         Reactions.js         # Reaction widget (matches actual implementation)
         ContactButton.js     # Contact CTA buttons
         ContactForm.js       # Contact/request form
         ThemeToggle.js       # Theme switching logic
         CTABlock.js          # Lead magnet CTA blocks

      pages/                   # Page-level components
         HomePage.js          # Landing page
         ProjectsPage.js      # Projects listing
         ProjectDetailPage.js # Single project view
         AboutPage.js         # About section
         ServicesPage.js      # Services section
         ContactPage.js       # Contact form page

      services/                # Business logic & utilities
         dataService.js       # Fetch & parse JSON data
         storageService.js    # LocalStorage operations
         themeService.js      # Theme detection & switching
         reactionService.js   # Reaction management
         formService.js       # Form validation & submission
         routerService.js     # Client-side routing

      themes/                  # Theme definitions
         tokens.css           # CSS custom properties (colors, spacing)
         light-theme.css      # Light theme overrides
         dark-theme.css       # Dark theme overrides

      styles/                  # Global styles
         main.css             # Main stylesheet (imports Tailwind)
         reset.css            # CSS reset/normalize
         utilities.css        # Custom utility classes

      main.js                  # Application entry point
      index.html               # HTML template

   tests/                       # Test files
      e2e/                     # End-to-end tests (Playwright)
         responsive.spec.js   # User Story 1 tests
         theme.spec.js        # User Story 2 tests
         projects.spec.js     # User Story 3 tests
         navigation.spec.js   # User Story 4 tests
         about.spec.js        # User Story 5 tests

      unit/                    # Unit tests (Vitest)
         services/            # Service layer tests
         components/          # Component logic tests

      fixtures/                # Test data & mocks
          projects.mock.json
          localStorage.mock.js

   .specify/                    # Spec-kit configuration
   vite.config.js               # Vite configuration
   tailwind.config.js           # Tailwind CSS configuration
   postcss.config.js            # PostCSS configuration
   playwright.config.js         # Playwright E2E config
   vitest.config.js             # Vitest unit test config
   package.json                 # Dependencies & scripts
   README.md                    # Project documentation
```

**Structure Decision**: Selected SPA with static generation structure. This is a web application with clear separation between:
- **Data layer** (`src/data/`): JSON files for content management
- **Component layer** (`src/components/`): Reusable UI building blocks
- **Page layer** (`src/pages/`): Route-level views that compose components
- **Service layer** (`src/services/`): Business logic and utilities
- **Theme layer** (`src/themes/`): CSS custom properties for theming
- **Test layer** (`tests/`): E2E and unit tests mirroring source structure

This structure supports:
1. Independent testing of components and services
2. Easy content updates via JSON files
3. Theme customization through CSS custom properties
4. Future migration to React/Vue by keeping components modular
5. Static site generation through Vite's build process

## Complexity Tracking

*No constitution violations identified. This is a greenfield project establishing baseline architecture.*

N/A - All architectural decisions align with proposed baseline principles.

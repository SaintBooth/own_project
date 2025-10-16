# Modern Developer Portfolio Website Constitution

## Core Principles

### I. Progressive Enhancement
Core content must be accessible without JavaScript. The site must deliver a functional experience to users even when JavaScript fails to load or is disabled. Basic navigation, content viewing, and contact information must remain accessible through semantic HTML and server-side rendering capabilities.

**Implementation Requirements**:
- Static HTML content for all primary pages
- CSS-based styling that works without JavaScript
- `<noscript>` fallbacks for critical functionality
- Server-side or build-time rendering for SEO

### II. Mobile-First Design
Design for mobile first, enhance for desktop. All layouts, interactions, and content must be optimized for mobile devices (320px viewport) before being enhanced for larger screens. Touch targets must meet minimum size requirements (44px).

**Implementation Requirements**:
- Default styles target mobile viewports (320px-767px)
- Progressive enhancement for tablet (768px+) and desktop (1024px+)
- Touch-friendly interface elements (44px minimum touch targets)
- Mobile performance prioritized (3G network considerations)

### III. Accessibility First (NON-NEGOTIABLE)
WCAG AA compliance is non-negotiable. All components must meet Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards. Accessibility violations will block deployment.

**Implementation Requirements**:
- Color contrast ratios: 4.5:1 for normal text, 3:1 for large text
- Keyboard navigation support for all interactive elements
- ARIA labels and semantic HTML for screen readers
- Focus indicators visible and distinct
- Form labels and error messages accessible

### IV. Performance Budget
Total bundle < 150KB gzipped, images optimized. The entire application bundle (HTML, CSS, JavaScript) must remain under 150KB when gzipped. Images must be optimized and lazy-loaded.

**Performance Targets**:
- First Contentful Paint (FCP) < 1.5s
- Time to Interactive (TTI) < 3s
- Lighthouse Performance score > 90
- Total bundle size < 150KB gzipped
- Individual image files < 200KB

**Enforcement**: Builds exceeding 150KB gzipped will fail CI/CD pipeline.

### V. Component-Based Architecture
Reusable, testable components. All UI elements must be built as self-contained, reusable components with clear interfaces and minimal coupling.

**Implementation Requirements**:
- Each component in separate file with single responsibility
- Components accept configuration via constructor or parameters
- Components emit events for parent communication (no direct coupling)
- Render methods return DOM elements, not HTML strings (where possible)
- Components provide mount() and unmount() lifecycle methods

### VI. Test Coverage (NON-NEGOTIABLE)
E2E tests for all user stories, unit tests for business logic. Every user story must have a passing E2E test before it can be marked complete. Business logic in services must have unit test coverage.

**Test Requirements**:
- **E2E Tests**: One test per user story acceptance criterion (Playwright)
- **Unit Tests**: All service layer functions (Vitest)
- **Test-First Development**: E2E tests written and failing BEFORE implementation begins
- **Coverage Threshold**: 80% coverage for service layer

**Enforcement**: PRs without passing tests for affected user stories will be rejected.

### VII. Semantic HTML
Proper document structure for SEO and accessibility. HTML must use semantic elements (`<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`) rather than generic `<div>` containers.

**Implementation Requirements**:
- Heading hierarchy (h1 → h2 → h3) must be logical
- Landmark regions (`role="banner"`, `role="navigation"`, `role="main"`)
- Descriptive link text (avoid "click here")
- Alt text for all images
- Valid HTML5 markup (passes W3C validator)

## Technical Standards

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Data Management
- Content stored in JSON files (`src/data/*.json`)
- User preferences in LocalStorage (theme, reactions)
- No user authentication in MVP
- Future migration path to Node.js/Express API with SQL database

### Theme System
- CSS custom properties for theme tokens
- System preference detection via `prefers-color-scheme`
- Manual theme toggle persisted in LocalStorage
- Light and dark theme variants required

### Accessibility Features
- Skip navigation links
- Focus trap in modal dialogs
- Reduced motion support (`prefers-reduced-motion`)
- Screen reader announcements for dynamic content

## Development Workflow

### Test-First Development
1. Write E2E test for user story acceptance criteria
2. Verify test fails (red)
3. Implement minimum code to pass test (green)
4. Refactor for quality (refactor)
5. Verify all tests still pass

### Quality Gates
All PRs must pass:
- Playwright E2E tests (100% pass rate)
- Vitest unit tests (80%+ coverage)
- Lighthouse CI (Performance > 90, Accessibility 100)
- Bundle size check (<150KB gzipped)
- ESLint (no errors)

### Code Review Requirements
- At least one approval required
- All CI checks must pass
- Constitution compliance verified
- No accessibility violations

## Governance

### Constitution Authority
This constitution supersedes all other practices, guidelines, and preferences. Any code that violates these principles must be rejected during code review, regardless of functionality or aesthetics.

### Amendment Process
Amendments to this constitution require:
1. Written justification documenting the need
2. Impact analysis on existing codebase
3. Migration plan if retroactive changes needed
4. Approval from project lead/architect

### Violation Handling
- **Critical Violations** (Principles III, VI): Block deployment, require immediate fix
- **High Violations** (Principles I, II, IV): Warning, must fix before next release
- **Medium Violations** (Principles V, VII): Document as technical debt, fix in next sprint

**Version**: 1.0.0 | **Ratified**: 2025-10-16 | **Last Amended**: 2025-10-16

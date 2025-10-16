# Tasks: Modern Developer Portfolio Website

**Input**: Design documents from `/specs/001-product-vision-user/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: E2E tests are included as this is explicitly required by the constitution (Principle #6: "Test Coverage: E2E tests for all user stories")

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Single project structure** at repository root
- Source: `src/`
- Tests: `tests/`
- Public assets: `public/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create root project directory structure (src/, public/, tests/)
- [ ] T002 Initialize package.json with npm init and add project metadata
- [ ] T003 [P] Install Vite 5.x as dev dependency: npm install -D vite
- [ ] T004 [P] Install Tailwind CSS 3.x and dependencies: npm install -D tailwindcss postcss autoprefixer
- [ ] T005 [P] Install Playwright for E2E tests: npm install -D @playwright/test
- [ ] T006 [P] Install Vitest for unit tests: npm install -D vitest
- [ ] T007 Create vite.config.js with build configuration and path aliases
- [ ] T008 Initialize Tailwind CSS config: npx tailwindcss init -p (creates tailwind.config.js and postcss.config.js)
- [ ] T009 Configure tailwind.config.js with content paths, dark mode class strategy, and custom theme tokens
- [ ] T010 Create playwright.config.js with browser configurations and test settings
- [ ] T011 Create vitest.config.js extending Vite config for unit tests
- [ ] T012 [P] Create .gitignore with node_modules, dist, .vite, test results
- [ ] T013 [P] Create README.md with project overview and setup instructions
- [ ] T014 Add npm scripts to package.json (dev, build, preview, test, test:e2e)
- [ ] T015 Create src/index.html as the main HTML template with semantic structure
- [ ] T016 Create public/images/ directory structure (projects/, profile/ subdirectories)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T017 [P] Create src/styles/reset.css with CSS normalization
- [ ] T018 [P] Create src/themes/tokens.css with CSS custom properties for colors, spacing, typography
- [ ] T019 [P] Create src/themes/light-theme.css with light mode variable overrides
- [ ] T020 [P] Create src/themes/dark-theme.css with dark mode variable overrides
- [ ] T021 Create src/styles/main.css importing Tailwind directives and theme files
- [ ] T022 [P] Create src/styles/utilities.css with custom utility classes and animations
- [ ] T023 [P] Implement src/services/storageService.js with get, set, remove, has, clear, getSize methods per storage-api.md contract
- [ ] T024 [P] Implement src/services/eventBus.js with on, off, emit methods for event-driven architecture
- [ ] T025 Implement src/services/themeService.js with initTheme, getTheme, setTheme, toggleTheme, getSystemTheme methods per storage-api.md contract
- [ ] T026 Implement src/services/routerService.js with init, navigate, getCurrentRoute methods per storage-api.md contract
- [ ] T027 [P] Create src/data/projects.json with 3-5 sample projects following data-schema.json structure
- [ ] T028 [P] Create src/data/services.json with 2-3 sample services following data-schema.json structure
- [ ] T029 [P] Create src/data/about.json with developer bio and skills following data-schema.json structure
- [ ] T030 Implement src/services/dataService.js with getProjects, getProjectById, getProjectBySlug, getServices, getAbout, clearCache methods per storage-api.md contract
- [ ] T031 Create src/main.js as application entry point, initialize theme and router services
- [ ] T032 [P] Create tests/fixtures/projects.mock.json with test project data
- [ ] T033 [P] Create tests/fixtures/localStorage.mock.js with LocalStorage mock for unit tests

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Responsive Website Access (Priority: P1) 🎯 MVP

**Goal**: Enable visitors to browse portfolio content on any device (desktop, tablet, mobile) with appropriate responsive layouts

**Independent Test**: Access website from devices with different viewports (1920px desktop, 768px tablet, 375px mobile) and verify layouts adapt properly, navigation works, no horizontal scrolling

### E2E Tests for User Story 1

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T034 [P] [US1] Create tests/e2e/responsive.spec.js with test for desktop layout (≥1024px) showing multi-column format and full navigation menu
- [ ] T035 [P] [US1] Add test to tests/e2e/responsive.spec.js for tablet layout (768px-1023px) with optimized spacing
- [ ] T036 [P] [US1] Add test to tests/e2e/responsive.spec.js for mobile layout (<768px) with single-column and hamburger menu
- [ ] T037 [P] [US1] Add test to tests/e2e/responsive.spec.js verifying touch targets are minimum 44x44px on mobile

### Implementation for User Story 1

- [ ] T038 [P] [US1] Create src/components/Header.js with mount, unmount, updateActivePath methods per components.md contract
- [ ] T039 [P] [US1] Create src/components/Navigation.js with mount, unmount, toggle, close, updateActive methods per components.md contract, including hamburger menu logic
- [ ] T040 [P] [US1] Create src/components/Footer.js with mount, unmount methods per components.md contract
- [ ] T041 [P] [US1] Create src/pages/HomePage.js with init, render, mount methods for landing page layout
- [ ] T042 [US1] Update src/main.js to initialize Header, Navigation, Footer components and mount to DOM
- [ ] T043 [US1] Add responsive CSS to src/styles/main.css for mobile-first breakpoints (mobile <768px, tablet 768-1023px, desktop ≥1024px)
- [ ] T044 [US1] Implement hamburger menu animation in src/styles/utilities.css with smooth slide-in transition
- [ ] T045 [US1] Add touch target sizing CSS ensuring minimum 44x44px for all interactive elements on mobile
- [ ] T046 [US1] Configure viewport meta tag in src/index.html for proper mobile rendering
- [ ] T047 [US1] Test responsive layouts manually across all breakpoints and fix any layout issues

**Checkpoint**: At this point, User Story 1 should be fully functional - website accessible and properly responsive on all devices

---

## Phase 4: User Story 2 - Automatic Theme Switching (Priority: P2)

**Goal**: Automatically detect and apply user's system theme preference (light/dark mode) with smooth transitions

**Independent Test**: Set OS to light/dark mode, load site, verify theme matches system preference and switches without reload when OS theme changes

### E2E Tests for User Story 2

- [ ] T048 [P] [US2] Create tests/e2e/theme.spec.js with test for light theme display when OS is in light mode
- [ ] T049 [P] [US2] Add test to tests/e2e/theme.spec.js for dark theme display when OS is in dark mode
- [ ] T050 [P] [US2] Add test to tests/e2e/theme.spec.js verifying theme switches automatically without page reload when OS theme changes
- [ ] T051 [P] [US2] Add test to tests/e2e/theme.spec.js checking WCAG AA contrast ratios (4.5:1 normal text, 3:1 large text) in both themes

### Implementation for User Story 2

- [ ] T052 [P] [US2] Create src/components/ThemeToggle.js with mount, unmount, toggle, setTheme methods per components.md contract
- [ ] T053 [US2] Add theme initialization inline script to src/index.html head to prevent FOUC (Flash of Unstyled Content)
- [ ] T054 [US2] Update src/main.js to initialize themeService.initTheme() on page load
- [ ] T055 [US2] Mount ThemeToggle component in Header component (update src/components/Header.js)
- [ ] T056 [US2] Add CSS transitions for theme switching in src/themes/tokens.css with respect for prefers-reduced-motion
- [ ] T057 [US2] Verify color contrast ratios meet WCAG AA standards in src/themes/light-theme.css and src/themes/dark-theme.css
- [ ] T058 [US2] Add matchMedia change listener in src/services/themeService.js to detect system theme changes and auto-switch without page reload (implements FR-023)
- [ ] T059 [US2] Test theme switching manually with OS light/dark mode toggle and verify smooth transitions

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - responsive site with automatic theme detection

---

## Phase 5: User Story 3 - Project Portfolio Browsing with Reactions (Priority: P1) 🎯 MVP

**Goal**: Showcase completed projects, enable visitor reactions (like/love/celebrate), provide contact links (Telegram/email)

**Independent Test**: Navigate to projects section, view project list, click project to see details, add reactions, verify reactions persist, click contact buttons and verify they open correct channels

### E2E Tests for User Story 3

- [ ] T060 [P] [US3] Create tests/e2e/projects.spec.js with test for projects page showing grid/list of projects with thumbnails, titles, descriptions
- [ ] T061 [P] [US3] Add test to tests/e2e/projects.spec.js for project detail page showing full information (description, technologies, demo/github links, images, challenges, results)
- [ ] T062 [P] [US3] Add test to tests/e2e/projects.spec.js for reaction button click increasing counter and persisting reaction in LocalStorage
- [ ] T063 [P] [US3] Add test to tests/e2e/projects.spec.js verifying Telegram contact button directs to Telegram with pre-filled message
- [ ] T064 [P] [US3] Add test to tests/e2e/projects.spec.js verifying email contact button opens email client with pre-filled subject
- [ ] T065 [P] [US3] Add test to tests/e2e/projects.spec.js confirming reaction persists across page reloads (LocalStorage check)

### Implementation for User Story 3

- [ ] T066 [P] [US3] Implement src/services/reactionService.js with getReaction, addReaction, removeReaction, getAllReactions, getReactionCounts methods per storage-api.md contract
- [ ] T067 [P] [US3] Create src/components/ProjectCard.js with mount, unmount, update methods per components.md contract for project thumbnails
- [ ] T068 [P] [US3] Create src/components/ProjectDetail.js with mount, unmount, updateReactions methods per components.md contract for full project view
- [ ] T069 [P] [US3] Create src/components/ReactionButton.js with mount, unmount, updateReactions, setUserReaction methods per components.md contract
- [ ] T070 [P] [US3] Create src/components/ContactButton.js with mount, unmount methods per components.md contract for Telegram and email CTAs
- [ ] T071 [US3] Create src/pages/ProjectsPage.js with init, render, mount methods loading and displaying project cards
- [ ] T072 [US3] Create src/pages/ProjectDetailPage.js with init, render, mount methods displaying single project with reactions and contact buttons
- [ ] T073 [US3] Register /projects and /projects/:slug routes in src/main.js routerService initialization
- [ ] T074 [US3] Add navigation link for Projects in src/components/Navigation.js
- [ ] T075 [US3] Style ProjectCard component with responsive grid layout in src/styles/main.css (3 columns desktop, 2 tablet, 1 mobile)
- [ ] T076 [US3] Style ProjectDetail component with image gallery, technology tags, and content sections in src/styles/main.css
- [ ] T077 [US3] Style ReactionButton component with icons, counts, active/inactive states, hover animations in src/styles/main.css
- [ ] T078 [US3] Implement reaction toggle logic (same type removes, different type replaces) in src/services/reactionService.js
- [ ] T079 [US3] Implement Telegram contact link with project context pre-fill in src/components/ContactButton.js
- [ ] T080 [US3] Implement email contact link with project subject pre-fill in src/components/ContactButton.js
- [ ] T081 [US3] Add fallback behavior for failed contact methods (copy to clipboard, show email address) in src/components/ContactButton.js
- [ ] T082 [US3] Add sample project images to public/images/projects/ (thumbnails and detail images)
- [ ] T083 [US3] Test project browsing, reactions, and contact flows manually and fix any issues

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - responsive site with themes and fully functional project showcase

---

## Phase 6: User Story 4 - Intuitive Navigation with Lead Magnets (Priority: P2)

**Goal**: Provide clear navigation structure with CTA blocks that encourage project inquiries and form submissions

**Independent Test**: Navigate through all sections using menus, verify active states, test sticky navigation on scroll, click CTAs to reach contact form, submit form and verify success

### E2E Tests for User Story 4

- [ ] T084 [P] [US4] Create tests/e2e/navigation.spec.js with test for navigation menu showing all sections (Home, About, Projects, Services, Contact) with active page highlighted
- [ ] T085 [P] [US4] Add test to tests/e2e/navigation.spec.js for mobile hamburger menu opening smoothly with all options visible
- [ ] T086 [P] [US4] Add test to tests/e2e/navigation.spec.js verifying sticky/fixed navigation appears after scrolling past threshold
- [ ] T087 [P] [US4] Add test to tests/e2e/navigation.spec.js for prominent CTA button visible above fold on homepage
- [ ] T088 [P] [US4] Add test to tests/e2e/navigation.spec.js for CTA at end of projects section
- [ ] T089 [P] [US4] Add test to tests/e2e/navigation.spec.js for contact form displaying all required fields (name, email, project description)
- [ ] T090 [P] [US4] Add test to tests/e2e/navigation.spec.js verifying form submission shows confirmation and validates email format

### Implementation for User Story 4

- [ ] T091 [P] [US4] Implement src/services/formService.js with validateEmail, validateField, validateForm, submitContactForm methods per storage-api.md contract
- [ ] T092 [P] [US4] Create src/components/CTABlock.js with mount, unmount methods per components.md contract for lead magnet sections
- [ ] T093 [P] [US4] Create src/components/ContactForm.js with mount, unmount, reset, validate, submit methods per components.md contract
- [ ] T094 [US4] Create src/pages/ContactPage.js with init, render, mount methods displaying contact form
- [ ] T095 [US4] Add sticky navigation behavior to src/components/Header.js (add/remove fixed class on scroll)
- [ ] T096 [US4] Add active route highlighting logic to src/components/Navigation.js based on current route
- [ ] T097 [US4] Add CTABlock components to src/pages/HomePage.js (above fold primary CTA)
- [ ] T098 [US4] Add CTABlock component to src/pages/ProjectsPage.js (after projects list)
- [ ] T099 [US4] Register /contact route in src/main.js routerService initialization
- [ ] T100 [US4] Add navigation link for Contact in src/components/Navigation.js
- [ ] T101 [US4] Style CTABlock component with high-contrast colors and prominent button in src/styles/main.css
- [ ] T102 [US4] Style ContactForm component with clear labels, inline validation errors, ARIA attributes in src/styles/main.css
- [ ] T103 [US4] Implement HTML5 form validation attributes in ContactForm component (required, type="email", minlength, maxlength)
- [ ] T104 [US4] Implement real-time JavaScript validation in src/components/ContactForm.js showing errors on blur
- [ ] T105 [US4] Implement form submission to FormSubmit.co in src/services/formService.js
- [ ] T106 [US4] Add honeypot field to ContactForm for spam prevention (hidden field that must stay empty)
- [ ] T107 [US4] Add success confirmation message display in ContactForm after successful submission
- [ ] T108 [US4] Add error handling and user-friendly error messages in ContactForm for submission failures
- [ ] T109 [US4] Test navigation flows, sticky header, CTAs, and form submission manually and fix any issues

**Checkpoint**: At this point, User Stories 1-4 should all work independently - complete navigation system with lead generation

---

## Phase 7: User Story 5 - About and Services Information (Priority: P3)

**Goal**: Display developer bio, skills, services offered with CTAs to encourage contact

**Independent Test**: Navigate to About page, verify bio and skills display properly; navigate to Services page, verify services with deliverables display; confirm CTAs present in both sections

### E2E Tests for User Story 5

- [ ] T110 [P] [US5] Create tests/e2e/about.spec.js with test for About page showing developer bio, photo, skills, experience
- [ ] T111 [P] [US5] Add test to tests/e2e/about.spec.js for Services page showing services with descriptions, deliverables, process steps
- [ ] T112 [P] [US5] Add test to tests/e2e/about.spec.js verifying CTAs are present in both About and Services sections

### Implementation for User Story 5

- [ ] T113 [P] [US5] Create src/pages/AboutPage.js with init, render, mount methods displaying developer bio, photo, skills, social links
- [ ] T114 [P] [US5] Create src/pages/ServicesPage.js with init, render, mount methods displaying service cards
- [ ] T115 [P] [US5] Create src/components/ServiceCard.js (optional, or inline in ServicesPage) for individual service display
- [ ] T116 [US5] Register /about and /services routes in src/main.js routerService initialization
- [ ] T117 [US5] Add navigation links for About and Services in src/components/Navigation.js
- [ ] T118 [US5] Style AboutPage with responsive layout for photo, bio, and skills grid in src/styles/main.css
- [ ] T119 [US5] Style ServicesPage with service cards in responsive grid (2 columns desktop, 1 mobile) in src/styles/main.css
- [ ] T120 [US5] Add CTABlock component to AboutPage encouraging contact
- [ ] T121 [US5] Add CTABlock component to ServicesPage encouraging project inquiries
- [ ] T122 [US5] Add developer profile photo to public/images/profile/photo.jpg (optimized, max 500KB)
- [ ] T123 [US5] Add social media icons/links to Footer component (update src/components/Footer.js)
- [ ] T124 [US5] Test About and Services pages manually, verify content displays properly and CTAs work

**Checkpoint**: All user stories should now be independently functional - complete portfolio website with all sections

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T125 [P] Add loading states and skeleton screens for async content in all page components
- [ ] T126 [P] Implement error boundaries and user-friendly error pages (404, 500) in src/pages/
- [ ] T127 [P] Add SEO meta tags (title, description, OG tags) to each page in route handler (update src/services/routerService.js)
- [ ] T128 [P] Add structured data (JSON-LD) for projects in src/pages/ProjectDetailPage.js
- [ ] T129 [P] Optimize images: compress all project and profile images to WebP format with JPEG/PNG fallbacks
- [ ] T130 [P] Add lazy loading to all images using loading="lazy" attribute
- [ ] T131 [P] Create sitemap.xml in public/ directory listing all routes
- [ ] T132 [P] Add robots.txt in public/ directory
- [ ] T133 [P] Add favicon.ico and app icons (various sizes) to public/
- [ ] T134 [P] Implement smooth scroll behavior for anchor links and route changes
- [ ] T135 [P] Add focus management for accessibility (focus first heading on route change)
- [ ] T136 [P] Add skip navigation link for keyboard users in src/components/Header.js
- [ ] T137 [P] Run Lighthouse audit and address performance, accessibility, SEO, best practices issues
- [ ] T138 [P] Verify WCAG AA compliance with axe DevTools and fix any violations
- [ ] T139 [P] Test keyboard navigation (Tab, Enter, Escape) across all components and fix focus traps
- [ ] T140 [P] Test with screen reader (NVDA/VoiceOver) and fix any announcements issues
- [ ] T141 [P] Add analytics tracking (Google Analytics or similar) initialization in src/main.js (optional)
- [ ] T142 [P] Write unit tests for storageService in tests/unit/services/storageService.spec.js
- [ ] T143 [P] Write unit tests for themeService in tests/unit/services/themeService.spec.js
- [ ] T144 [P] Write unit tests for reactionService in tests/unit/services/reactionService.spec.js
- [ ] T145 [P] Write unit tests for formService validation methods in tests/unit/services/formService.spec.js
- [ ] T146 [P] Write unit tests for dataService in tests/unit/services/dataService.spec.js
- [ ] T147 [P] Add code comments and JSDoc documentation to all service methods
- [ ] T148 [P] Update README.md with detailed setup instructions, npm scripts, deployment guide
- [ ] T149 [P] Create deployment configuration for Netlify or Vercel (netlify.toml or vercel.json)
- [ ] T150 Build production bundle: npm run build
- [ ] T151 Test production build locally: npm run preview
- [ ] T152 Run all E2E tests against production build: npm run test:e2e
- [ ] T153 Verify bundle size is <150KB gzipped (check dist/ build output)
- [ ] T154 Deploy to production hosting (Netlify/Vercel)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3, P1)**: Depends on Foundational - MVP foundation
- **User Story 2 (Phase 4, P2)**: Depends on Foundational - Independent of US1
- **User Story 3 (Phase 5, P1)**: Depends on Foundational - Core feature, can work parallel to US1 but shares Header/Navigation
- **User Story 4 (Phase 6, P2)**: Depends on Foundational and US1 (needs Navigation component) - Enhances US1/US3
- **User Story 5 (Phase 7, P3)**: Depends on Foundational and US1 (needs Navigation) - Independent content pages
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories - RECOMMENDED MVP START
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories - Adds theme switching to US1
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Shares Header/Navigation with US1 but core project showcase is independent
- **User Story 4 (P2)**: Requires US1 completion (Navigation component) - Enhances navigation and adds forms
- **User Story 5 (P3)**: Requires US1 completion (Navigation component) - Independent content pages

### Within Each User Story

- E2E tests MUST be written and FAIL before implementation
- Models/data structures before services
- Services before components
- Components before pages
- Pages before routing integration
- Core implementation before styling refinements
- Story complete before moving to next priority

### Parallel Opportunities

**Setup Phase**:
- T003, T004, T005, T006 (all dependency installations)
- T012, T013 (documentation files)

**Foundational Phase**:
- T017, T018, T019, T020, T022 (all CSS files)
- T023, T024 (storageService and eventBus - no dependencies)
- T027, T028, T029 (all data JSON files)
- T032, T033 (test fixtures)

**User Story 1 - Tests**: T034, T035, T036, T037 (all E2E test files)
**User Story 1 - Components**: T038, T039, T040, T041 (Header, Navigation, Footer, HomePage - different files)

**User Story 2 - Tests**: T048, T049, T050, T051 (all E2E test additions)
**User Story 2 - Components**: T052 (ThemeToggle component)

**User Story 3 - Tests**: T060, T061, T062, T063, T064, T065 (all E2E test cases)
**User Story 3 - Components**: T066, T067, T068, T069, T070 (all component files)

**User Story 4 - Tests**: T084, T085, T086, T087, T088, T089, T090 (all E2E test cases)
**User Story 4 - Components**: T091, T092, T093 (formService, CTABlock, ContactForm)

**User Story 5 - Tests**: T110, T111, T112 (all E2E test cases)
**User Story 5 - Components**: T113, T114, T115 (AboutPage, ServicesPage, ServiceCard)

**Polish Phase**: Most tasks marked [P] can run in parallel (different files/concerns)

**Parallel User Stories** (if team capacity allows):
- After Foundational complete: US1 and US2 can be worked in parallel
- After US1 complete: US3, US4, US5 can be worked in parallel by different developers

---

## Parallel Example: User Story 1

```bash
# Launch all E2E tests for User Story 1 together:
Task: "Create tests/e2e/responsive.spec.js for desktop layout test"
Task: "Add tablet layout test to tests/e2e/responsive.spec.js"
Task: "Add mobile layout test to tests/e2e/responsive.spec.js"
Task: "Add touch target test to tests/e2e/responsive.spec.js"

# Launch all components for User Story 1 together:
Task: "Create src/components/Header.js"
Task: "Create src/components/Navigation.js"
Task: "Create src/components/Footer.js"
Task: "Create src/pages/HomePage.js"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 3 Only)

**Rationale**: Both are P1 priority and deliver core value - responsive site with project showcase

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Responsive Access)
4. Complete Phase 5: User Story 3 (Project Portfolio with Reactions)
5. **STOP and VALIDATE**: Test both stories independently
6. Deploy/demo MVP

**MVP Scope**:
- ✅ Responsive website (mobile/tablet/desktop)
- ✅ Project showcase with reactions
- ✅ Contact buttons (Telegram/email)
- ✅ Basic navigation
- ❌ Theme switching (nice-to-have)
- ❌ Enhanced navigation with forms (P2)
- ❌ About/Services pages (P3)

### Incremental Delivery (Recommended)

1. Complete Setup (Phase 1) + Foundational (Phase 2) → Foundation ready
2. Add User Story 1 → Test independently → Basic responsive site ✓
3. Add User Story 3 → Test independently → Deploy/Demo (MVP!) - Project portfolio with reactions ✓
4. Add User Story 2 → Test independently → Theme switching enhancement ✓
5. Add User Story 4 → Test independently → Enhanced navigation + forms ✓
6. Add User Story 5 → Test independently → Complete content (About/Services) ✓
7. Add Polish (Phase 8) → Production ready ✓
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (1-2 days)
2. Once Foundational is done:
   - Developer A: User Story 1 (Responsive) - 2-3 days
   - Developer B: User Story 2 (Theme) - 1-2 days (can start immediately)
   - Developer C: User Story 3 (Projects) - 3-4 days (can start immediately)
3. After US1 complete:
   - Developer A: User Story 4 (Navigation/Forms) - 2-3 days
4. After US1 complete:
   - Developer B or C: User Story 5 (About/Services) - 1-2 days
5. All developers: Polish phase together
6. Stories integrate naturally through shared components (Header, Navigation)

**Total Estimated Timeline**:
- Solo developer: 2-3 weeks for MVP, 3-4 weeks for all features
- Team of 2-3: 1-2 weeks for MVP, 2-3 weeks for all features

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify E2E tests fail before implementing (TDD approach)
- Commit after each task or logical group of related tasks
- Stop at any checkpoint to validate story independently before proceeding
- US1 and US3 form the recommended MVP scope (P1 priorities)
- US2, US4, US5 are enhancements that can be added incrementally
- Header/Navigation are shared by all stories - created in US1, enhanced in US4
- Test coverage: E2E tests for all user stories (required by constitution), unit tests for services (Phase 8)
- Accessibility compliance (WCAG AA) is non-negotiable - verified in Phase 8
- Performance budget (<150KB gzipped) is enforced in Phase 8

---

## Task Summary

**Total Tasks**: 154

**Tasks by Phase**:
- Phase 1 (Setup): 16 tasks
- Phase 2 (Foundational): 17 tasks
- Phase 3 (US1 - Responsive): 14 tasks (4 tests + 10 implementation)
- Phase 4 (US2 - Theme): 12 tasks (4 tests + 8 implementation)
- Phase 5 (US3 - Projects): 24 tasks (6 tests + 18 implementation)
- Phase 6 (US4 - Navigation): 26 tasks (7 tests + 19 implementation)
- Phase 7 (US5 - About/Services): 15 tasks (3 tests + 12 implementation)
- Phase 8 (Polish): 30 tasks

**Tasks by User Story**:
- US1: 14 tasks
- US2: 12 tasks
- US3: 24 tasks
- US4: 26 tasks
- US5: 15 tasks
- Infrastructure: 33 tasks (Setup + Foundational)
- Polish: 30 tasks

**Parallel Opportunities**: 56 tasks marked [P] can run in parallel

**MVP Scope**: 64 tasks (Setup + Foundational + US1 + US3)
**Full Feature Set**: 124 tasks (MVP + US2 + US4 + US5)
**Production Ready**: 154 tasks (Full + Polish)

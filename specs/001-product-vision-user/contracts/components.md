# Component Contracts: Modern Developer Portfolio Website

**Feature**: 001-product-vision-user
**Phase**: 1 - Design & Contracts
**Date**: 2025-10-15

## Purpose

This document defines the interface contracts for all components in the portfolio website. Each component contract specifies:
- Props/parameters it accepts
- Events it emits
- Public methods it exposes
- Expected DOM structure
- Accessibility requirements

These contracts ensure components can be developed and tested independently.

---

## Component Hierarchy

```
App
├── Header
│   ├── Navigation
│   └── ThemeToggle
├── Router
│   └── Pages
│       ├── HomePage
│       │   ├── ProjectCard (x3 featured)
│       │   └── CTABlock
│       ├── ProjectsPage
│       │   ├── ProjectFilter
│       │   └── ProjectCard (xN)
│       ├── ProjectDetailPage
│       │   ├── ProjectDetail
│       │   ├── ReactionButton
│       │   └── ContactButton
│       ├── AboutPage
│       ├── ServicesPage
│       │   └── ServiceCard (xN)
│       └── ContactPage
│           └── ContactForm
└── Footer
```

---

## Core Components

### 1. Header Component

**Purpose**: Site header with logo, navigation, and theme toggle

**Interface**:
```typescript
interface HeaderProps {
  currentPath: string;        // Current active route
  navigationItems: NavigationItem[];
  onNavigate?: (path: string) => void;
}
```

**Public Methods**:
- `mount(container: HTMLElement): void` - Mount component to DOM
- `unmount(): void` - Clean up event listeners
- `updateActivePath(path: string): void` - Update active navigation item

**Emits Events**:
- `navigate`: When user clicks navigation item (payload: `{ path: string }`)

**DOM Structure**:
```html
<header class="site-header" role="banner">
  <div class="container">
    <a href="#/" class="logo" aria-label="Homepage">Portfolio</a>
    <Navigation />
    <ThemeToggle />
  </div>
</header>
```

**Accessibility**:
- `role="banner"` on header
- Skip navigation link for keyboard users
- Logo link has descriptive aria-label

**Responsive Behavior**:
- Desktop (≥1024px): Full horizontal layout
- Mobile (<1024px): Hamburger menu with slide-out navigation

---

### 2. Navigation Component

**Purpose**: Site navigation menu (desktop and mobile)

**Interface**:
```typescript
interface NavigationProps {
  items: NavigationItem[];     // Menu items to display
  currentPath: string;          // Active route
  isMobile: boolean;            // Mobile vs desktop layout
  onNavigate?: (path: string) => void;
}
```

**Public Methods**:
- `mount(container: HTMLElement): void`
- `unmount(): void`
- `toggle(): void` - Toggle mobile menu open/close
- `close(): void` - Close mobile menu
- `updateActive(path: string): void` - Update active item

**Emits Events**:
- `navigate`: When menu item clicked
- `open`: When mobile menu opens
- `close`: When mobile menu closes

**DOM Structure (Desktop)**:
```html
<nav class="navigation" role="navigation" aria-label="Main navigation">
  <ul class="nav-list">
    <li><a href="#/" class="nav-link active" aria-current="page">Home</a></li>
    <li><a href="#/projects" class="nav-link">Projects</a></li>
    <!-- ... -->
  </ul>
</nav>
```

**DOM Structure (Mobile)**:
```html
<button class="hamburger-menu" aria-label="Open navigation menu" aria-expanded="false">
  <span></span><span></span><span></span>
</button>
<nav class="mobile-navigation" role="navigation" aria-label="Main navigation" aria-hidden="true">
  <ul class="nav-list"><!-- items --></ul>
</nav>
```

**Accessibility**:
- ARIA labels on hamburger button
- `aria-expanded` state on menu button
- `aria-current="page"` on active link
- `aria-hidden` on mobile menu when closed
- Focus trap when mobile menu open
- Escape key closes mobile menu
- Focus management on open/close

**State Management**:
- `isOpen: boolean` - Mobile menu state
- `activeItem: string` - Current active route

---

### 3. ThemeToggle Component

**Purpose**: Toggle between light and dark themes

**Interface**:
```typescript
interface ThemeToggleProps {
  initialTheme?: 'light' | 'dark' | 'system';
  onChange?: (theme: string) => void;
}
```

**Public Methods**:
- `mount(container: HTMLElement): void`
- `unmount(): void`
- `toggle(): void` - Toggle theme
- `setTheme(theme: 'light' | 'dark' | 'system'): void` - Set specific theme

**Emits Events**:
- `themeChange`: When theme changes (payload: `{ theme: string }`)

**DOM Structure**:
```html
<button
  class="theme-toggle"
  aria-label="Toggle dark mode"
  aria-pressed="false"
  title="Switch to dark mode"
>
  <svg class="icon-sun" aria-hidden="true"><!-- sun icon --></svg>
  <svg class="icon-moon" aria-hidden="true"><!-- moon icon --></svg>
</button>
```

**Accessibility**:
- `aria-label` describes action
- `aria-pressed` indicates toggle state
- `title` provides additional context
- Keyboard accessible (Enter/Space)
- No reliance on color alone

**Visual States**:
- Light mode: Sun icon visible
- Dark mode: Moon icon visible
- Transition animation between states (respect `prefers-reduced-motion`)

---

### 4. ProjectCard Component

**Purpose**: Display project thumbnail with key information

**Interface**:
```typescript
interface ProjectCardProps {
  project: Project;             // Project entity from data model
  showReactions?: boolean;      // Whether to show reaction counts
  onClick?: (projectId: string) => void;
}
```

**Public Methods**:
- `mount(container: HTMLElement): void`
- `unmount(): void`
- `update(project: Project): void` - Update project data

**Emits Events**:
- `click`: When card is clicked (payload: `{ projectId: string }`)

**DOM Structure**:
```html
<article class="project-card" role="article">
  <a href="#/projects/project-slug" class="card-link" aria-label="View project: Title">
    <div class="card-image">
      <img src="thumbnail.jpg" alt="Project title" loading="lazy">
      {#if project.featured}
        <span class="badge-featured" aria-label="Featured project">Featured</span>
      {/if}
    </div>
    <div class="card-content">
      <h3 class="card-title">Project Title</h3>
      <p class="card-description">Brief description...</p>
      <div class="card-technologies">
        <span class="tech-tag">React</span>
        <span class="tech-tag">Node.js</span>
      </div>
      {#if showReactions}
        <div class="card-reactions" aria-label="Reactions">
          <span>❤️ 12</span>
          <span>👍 8</span>
        </div>
      {/if}
    </div>
  </a>
</article>
```

**Accessibility**:
- `role="article"` for semantic structure
- Descriptive link text via `aria-label`
- Image `alt` text describes project
- Technology tags are readable by screen readers

**Responsive Behavior**:
- Desktop: Fixed width (3 columns grid)
- Tablet: 2 columns
- Mobile: 1 column, full width

---

### 5. ProjectDetail Component

**Purpose**: Display full project information on detail page

**Interface**:
```typescript
interface ProjectDetailProps {
  project: Project;
  reactions: ReactionCounts;
  userReaction?: Reaction;
  onReaction?: (projectId: string, type: string) => void;
  onContact?: (projectId: string, channel: string) => void;
}
```

**Public Methods**:
- `mount(container: HTMLElement): void`
- `unmount(): void`
- `updateReactions(reactions: ReactionCounts): void`

**Emits Events**:
- `reaction`: When user clicks reaction button
- `contact`: When user clicks contact button
- `demo`: When user clicks demo link
- `github`: When user clicks GitHub link

**DOM Structure**:
```html
<article class="project-detail" role="article">
  <header class="project-header">
    <h1 class="project-title">Project Title</h1>
    <div class="project-meta">
      <time datetime="2025-08-15">August 2025</time>
      <span class="separator">•</span>
      <span class="project-category">Web Development</span>
    </div>
  </header>

  <div class="project-images">
    <img src="main-image.jpg" alt="Project screenshot 1" class="project-image-main">
    <!-- Additional images in gallery -->
  </div>

  <div class="project-content">
    <section class="project-description">
      <h2>About This Project</h2>
      <p>Long description...</p>
    </section>

    <section class="project-technologies">
      <h2>Technologies Used</h2>
      <ul class="tech-list">
        <li>React</li>
        <li>Node.js</li>
      </ul>
    </section>

    <section class="project-challenges">
      <h2>Challenges & Solutions</h2>
      <p>Challenges text...</p>
    </section>

    <section class="project-results">
      <h2>Results & Impact</h2>
      <p>Results text...</p>
    </section>
  </div>

  <footer class="project-footer">
    <div class="project-links">
      {#if project.demoUrl}
        <a href="{demoUrl}" class="btn-primary" target="_blank" rel="noopener">
          View Live Demo
        </a>
      {/if}
      {#if project.githubUrl}
        <a href="{githubUrl}" class="btn-secondary" target="_blank" rel="noopener">
          View on GitHub
        </a>
      {/if}
    </div>

    <ReactionButton projectId={project.id} reactions={reactions} userReaction={userReaction} />

    <div class="project-contact">
      <p>Interested in a similar project?</p>
      <ContactButton projectId={project.id} />
    </div>
  </footer>
</article>
```

**Accessibility**:
- Proper heading hierarchy (H1 → H2)
- `<time>` element with `datetime` attribute
- External links have `rel="noopener"` for security
- Image gallery keyboard navigable

---

### 6. ReactionButton Component

**Purpose**: Allow users to react to projects

**Interface**:
```typescript
interface ReactionButtonProps {
  projectId: string;
  reactions: ReactionCounts;       // { like: 12, love: 8, celebrate: 3 }
  userReaction?: Reaction;         // User's current reaction (if any)
  onReaction?: (projectId: string, type: ReactionType) => void;
}

type ReactionType = 'like' | 'love' | 'celebrate';
```

**Public Methods**:
- `mount(container: HTMLElement): void`
- `unmount(): void`
- `updateReactions(reactions: ReactionCounts): void`
- `setUserReaction(reaction: Reaction | null): void`

**Emits Events**:
- `reaction`: When user clicks reaction (payload: `{ projectId, type, action: 'add' | 'remove' | 'change' }`)

**DOM Structure**:
```html
<div class="reaction-buttons" role="group" aria-label="React to this project">
  <button
    class="reaction-btn {active}"
    aria-label="Like this project (12 likes)"
    aria-pressed="{isActive}"
    data-reaction="like"
  >
    <span class="reaction-icon" aria-hidden="true">👍</span>
    <span class="reaction-count">12</span>
  </button>

  <button
    class="reaction-btn"
    aria-label="Love this project (8 loves)"
    aria-pressed="false"
    data-reaction="love"
  >
    <span class="reaction-icon" aria-hidden="true">❤️</span>
    <span class="reaction-count">8</span>
  </button>

  <button
    class="reaction-btn"
    aria-label="Celebrate this project (3 celebrations)"
    aria-pressed="false"
    data-reaction="celebrate"
  >
    <span class="reaction-icon" aria-hidden="true">🎉</span>
    <span class="reaction-count">3</span>
  </button>
</div>
```

**Accessibility**:
- `role="group"` with descriptive label
- Each button has `aria-label` with current count
- `aria-pressed` indicates active state
- Keyboard accessible (Tab, Enter/Space)
- Icon hidden from screen readers (`aria-hidden`)

**Interaction Logic**:
- Click active reaction: Remove reaction
- Click inactive reaction: Replace current reaction (if any) or add new
- Only one reaction per user per project
- Optimistic UI update (instant feedback)
- Persist to LocalStorage

**Visual States**:
- Default: Gray, outline style
- Active: Filled color, solid background
- Hover: Scale animation (respect `prefers-reduced-motion`)

---

### 7. ContactButton Component

**Purpose**: CTA button that directs users to contact channels

**Interface**:
```typescript
interface ContactButtonProps {
  projectId?: string;          // Optional context for pre-filled message
  variant?: 'primary' | 'secondary' | 'telegram' | 'email';
  label?: string;              // Custom button text
  onContact?: (channel: string, projectId?: string) => void;
}
```

**Public Methods**:
- `mount(container: HTMLElement): void`
- `unmount(): void`

**Emits Events**:
- `contact`: When button clicked (payload: `{ channel, projectId }`)

**DOM Structure**:
```html
<div class="contact-buttons">
  <a href="https://t.me/username?text=..." class="btn-telegram" target="_blank" rel="noopener">
    <svg class="icon" aria-hidden="true"><!-- Telegram icon --></svg>
    <span>Contact on Telegram</span>
  </a>

  <a href="mailto:email@example.com?subject=..." class="btn-email">
    <svg class="icon" aria-hidden="true"><!-- Email icon --></svg>
    <span>Send Email</span>
  </a>
</div>
```

**Accessibility**:
- Descriptive button text
- Icons supplemental, not sole indicator
- External links open in new tab with warning

**Fallback Behavior**:
- If Telegram not installed: Copy username to clipboard, show toast notification
- If email client not configured: Show email address, allow manual copy

---

### 8. ContactForm Component

**Purpose**: Form for submitting project inquiries

**Interface**:
```typescript
interface ContactFormProps {
  projectId?: string;          // Pre-fill context
  onSubmit?: (formData: ContactRequest) => Promise<{ success: boolean, error?: string }>;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}
```

**Public Methods**:
- `mount(container: HTMLElement): void`
- `unmount(): void`
- `reset(): void` - Clear form
- `validate(): ValidationResult` - Validate all fields
- `submit(): Promise<void>` - Submit form

**Emits Events**:
- `submit`: When form submitted (payload: `ContactRequest`)
- `success`: On successful submission
- `error`: On submission failure

**DOM Structure**:
```html
<form class="contact-form" novalidate>
  <div class="form-group">
    <label for="name" class="form-label">
      Name <span class="required" aria-label="required">*</span>
    </label>
    <input
      type="text"
      id="name"
      name="name"
      class="form-input"
      required
      minlength="2"
      maxlength="100"
      aria-required="true"
      aria-invalid="false"
      aria-describedby="name-error"
    >
    <span id="name-error" class="form-error" role="alert" aria-live="polite"></span>
  </div>

  <div class="form-group">
    <label for="email" class="form-label">
      Email <span class="required" aria-label="required">*</span>
    </label>
    <input
      type="email"
      id="email"
      name="email"
      class="form-input"
      required
      aria-required="true"
      aria-invalid="false"
      aria-describedby="email-error"
    >
    <span id="email-error" class="form-error" role="alert" aria-live="polite"></span>
  </div>

  <div class="form-group">
    <label for="projectDescription" class="form-label">
      Project Description <span class="required" aria-label="required">*</span>
    </label>
    <textarea
      id="projectDescription"
      name="projectDescription"
      class="form-textarea"
      required
      minlength="50"
      maxlength="2000"
      rows="6"
      aria-required="true"
      aria-invalid="false"
      aria-describedby="projectDescription-error projectDescription-hint"
    ></textarea>
    <span id="projectDescription-hint" class="form-hint">Minimum 50 characters</span>
    <span id="projectDescription-error" class="form-error" role="alert" aria-live="polite"></span>
  </div>

  <div class="form-group">
    <label for="budget" class="form-label">Budget (Optional)</label>
    <input
      type="text"
      id="budget"
      name="budget"
      class="form-input"
      placeholder="e.g., $5,000 - $10,000"
      maxlength="100"
    >
  </div>

  <div class="form-group">
    <label for="timeline" class="form-label">Timeline (Optional)</label>
    <input
      type="text"
      id="timeline"
      name="timeline"
      class="form-input"
      placeholder="e.g., 2-3 months"
      maxlength="100"
    >
  </div>

  <!-- Honeypot field for spam prevention (hidden) -->
  <input
    type="text"
    name="website"
    class="honeypot"
    tabindex="-1"
    autocomplete="off"
    aria-hidden="true"
  >

  <button
    type="submit"
    class="btn-primary btn-submit"
    aria-busy="false"
  >
    <span class="btn-text">Send Inquiry</span>
    <span class="btn-loading" aria-hidden="true">Sending...</span>
  </button>

  <div class="form-status" role="status" aria-live="polite" aria-atomic="true"></div>
</form>
```

**Accessibility**:
- Labels explicitly associated with inputs
- Required fields marked with `aria-required`
- Error messages linked via `aria-describedby`
- `aria-invalid` updated on validation
- Error messages use `role="alert"`
- Status messages use `role="status"` with `aria-live`
- Form submission shows `aria-busy` state

**Validation Logic**:
- Real-time validation on blur
- Full validation on submit
- Clear error messages displayed inline
- Focus moved to first error field on submit failure

**States**:
- `idle`: Ready for input
- `validating`: Checking field
- `submitting`: Sending data
- `success`: Submission successful
- `error`: Submission failed

---

### 9. CTABlock Component

**Purpose**: Lead magnet call-to-action block

**Interface**:
```typescript
interface CTABlockProps {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  variant?: 'primary' | 'secondary' | 'dark';
}
```

**Public Methods**:
- `mount(container: HTMLElement): void`
- `unmount(): void`

**Emits Events**:
- `click`: When CTA button clicked

**DOM Structure**:
```html
<section class="cta-block variant-primary" role="complementary">
  <div class="cta-content">
    <h2 class="cta-title">Ready to Start Your Project?</h2>
    <p class="cta-description">Let's discuss how I can help bring your ideas to life.</p>
    <a href="#/contact" class="btn-cta">Get Started</a>
  </div>
</section>
```

**Accessibility**:
- `role="complementary"` for supplementary content
- High contrast for text and button
- Large touch target (min 44x44px)

**Variants**:
- `primary`: Accent background, white text
- `secondary`: Light background, dark text
- `dark`: Dark background, light text (for light mode)

---

### 10. Footer Component

**Purpose**: Site footer with links and copyright

**Interface**:
```typescript
interface FooterProps {
  socialLinks?: SocialLinks;
  copyrightYear?: number;
  copyrightName?: string;
}
```

**Public Methods**:
- `mount(container: HTMLElement): void`
- `unmount(): void`

**DOM Structure**:
```html
<footer class="site-footer" role="contentinfo">
  <div class="container">
    <div class="footer-social">
      <a href="https://github.com/..." aria-label="GitHub profile" target="_blank" rel="noopener">
        <svg aria-hidden="true"><!-- GitHub icon --></svg>
      </a>
      <a href="https://linkedin.com/..." aria-label="LinkedIn profile" target="_blank" rel="noopener">
        <svg aria-hidden="true"><!-- LinkedIn icon --></svg>
      </a>
      <a href="https://twitter.com/..." aria-label="Twitter profile" target="_blank" rel="noopener">
        <svg aria-hidden="true"><!-- Twitter icon --></svg>
      </a>
    </div>

    <div class="footer-copyright">
      <p>&copy; 2025 Developer Name. All rights reserved.</p>
    </div>
  </div>
</footer>
```

**Accessibility**:
- `role="contentinfo"` landmark
- Social links have descriptive `aria-label`
- Icons hidden from screen readers

---

## Component Testing Contracts

Each component must have:

1. **Unit Tests** (Vitest):
   - Props validation
   - Method behavior
   - Event emission
   - State management

2. **Accessibility Tests**:
   - ARIA attributes present
   - Keyboard navigation works
   - Screen reader announcements correct
   - Color contrast meets WCAG AA

3. **Responsive Tests** (Playwright):
   - Layout on mobile/tablet/desktop
   - Touch targets min 44x44px
   - No horizontal scrolling

**Example Test Structure**:
```javascript
// tests/unit/components/ProjectCard.spec.js
import { describe, it, expect } from 'vitest';
import { ProjectCard } from '@/components/ProjectCard';

describe('ProjectCard', () => {
  it('should render project title', () => {
    const card = new ProjectCard({ project: mockProject });
    const html = card.render();
    expect(html).toContain(mockProject.title);
  });

  it('should emit click event with projectId', () => {
    const card = new ProjectCard({ project: mockProject });
    let emittedId = null;
    card.onClick = (id) => emittedId = id;
    // simulate click
    expect(emittedId).toBe(mockProject.id);
  });
});
```

---

## Summary

This contract document provides:
- ✅ Clear interfaces for all components
- ✅ Props, methods, and events specification
- ✅ DOM structure and ARIA requirements
- ✅ Accessibility guidelines for each component
- ✅ Testing requirements

Components can now be implemented independently while maintaining consistency and interoperability.

# Modern Developer Portfolio Website

A responsive, modern portfolio website built with Vite, Tailwind CSS, and vanilla JavaScript.

## Features

- 📱 Fully responsive design (mobile, tablet, desktop)
- 🌓 Automatic dark/light theme switching
- 🎨 Project showcase with reactions
- 📧 Contact forms and Telegram integration
- ⚡ Fast performance with Vite
- ♿ WCAG AA accessibility compliant
- 🧪 E2E and unit tests

## Tech Stack

- **Build Tool**: Vite 5.x
- **Styling**: Tailwind CSS 3.x
- **JavaScript**: ES2022 (ES Modules)
- **Testing**: Playwright (E2E) + Vitest (Unit)
- **Storage**: LocalStorage + JSON files

## Project Structure

```
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page-level components
│   ├── services/        # Business logic & utilities
│   ├── themes/          # CSS custom properties
│   ├── styles/          # Global styles
│   ├── data/            # JSON content files
│   ├── main.js          # Application entry point
│   └── index.html       # HTML template
├── public/              # Static assets
├── tests/
│   ├── e2e/             # Playwright E2E tests
│   ├── unit/            # Vitest unit tests
│   └── fixtures/        # Test data
└── .specify/            # Spec-kit documentation
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Testing

```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

## Development Workflow

1. **Phase 1-2**: Setup and foundational infrastructure ✅
2. **Phase 3**: User Story 1 - Responsive website
3. **Phase 5**: User Story 3 - Project portfolio
4. **Phase 4**: User Story 2 - Theme switching
5. **Phase 6**: User Story 4 - Navigation & forms
6. **Phase 7**: User Story 5 - About & Services
7. **Phase 8**: Polish & optimization

## Configuration

- **Vite**: `vite.config.js`
- **Tailwind**: `tailwind.config.js`
- **PostCSS**: `postcss.config.js`
- **Playwright**: `playwright.config.js`
- **Vitest**: `vitest.config.js`

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Goals

- First Contentful Paint (FCP) < 1.5s
- Time to Interactive (TTI) < 3s
- Lighthouse Performance score > 90
- Bundle size < 150KB gzipped

## License

ISC

# Storage API Contract: Modern Developer Portfolio Website

**Feature**: 001-product-vision-user
**Phase**: 1 - Design & Contracts
**Date**: 2025-10-15

## Purpose

This document defines the API contract for the storage service layer, which abstracts access to LocalStorage, JSON data files, and future backend APIs. This contract ensures consistent data access patterns across the application.

---

## Storage Service Interface

### StorageService

**Purpose**: Provides abstraction layer for LocalStorage operations with error handling and validation

**Module**: `src/services/storageService.js`

#### Methods

##### `get(key: string, defaultValue?: any): any`

Retrieves data from LocalStorage

**Parameters**:
- `key`: Storage key (string)
- `defaultValue`: Value to return if key doesn't exist or error occurs (optional)

**Returns**: Parsed JSON data or defaultValue

**Throws**: Never throws (returns defaultValue on error)

**Example**:
```javascript
const theme = storageService.get('portfolio:theme', { mode: 'system' });
// Returns: { mode: 'dark', timestamp: 1697520000000 }
```

**Error Handling**:
- If key doesn't exist: Return defaultValue
- If JSON parsing fails: Log error, return defaultValue
- If LocalStorage unavailable (private browsing): Return defaultValue

---

##### `set(key: string, value: any): boolean`

Stores data in LocalStorage

**Parameters**:
- `key`: Storage key (string)
- `value`: Any JSON-serializable data

**Returns**: `true` if successful, `false` if failed

**Throws**: Never throws (returns false on error)

**Example**:
```javascript
const success = storageService.set('portfolio:theme', { mode: 'dark', timestamp: Date.now() });
// Returns: true
```

**Error Handling**:
- If quota exceeded: Log error, return false
- If value not serializable: Log error, return false
- If LocalStorage unavailable: Log error, return false

---

##### `remove(key: string): boolean`

Removes data from LocalStorage

**Parameters**:
- `key`: Storage key (string)

**Returns**: `true` if successful, `false` if failed

**Example**:
```javascript
storageService.remove('portfolio:reactions');
```

---

##### `clear(prefix?: string): boolean`

Clears all LocalStorage data (optionally by prefix)

**Parameters**:
- `prefix`: Optional key prefix to filter (e.g., 'portfolio:')

**Returns**: `true` if successful

**Example**:
```javascript
storageService.clear('portfolio:'); // Clear only portfolio keys
```

---

##### `has(key: string): boolean`

Checks if key exists in LocalStorage

**Parameters**:
- `key`: Storage key (string)

**Returns**: `true` if key exists, `false` otherwise

**Example**:
```javascript
if (storageService.has('portfolio:theme')) {
  // Load saved theme
}
```

---

##### `getSize(): number`

Returns approximate size of stored data in bytes

**Returns**: Total size in bytes

**Example**:
```javascript
const sizeInKB = storageService.getSize() / 1024;
```

---

## Data Service Interface

### DataService

**Purpose**: Fetches and caches JSON data files

**Module**: `src/services/dataService.js`

#### Methods

##### `getProjects(options?: GetProjectsOptions): Promise<Project[]>`

Fetches all published projects

**Parameters**:
```typescript
interface GetProjectsOptions {
  includeStatus?: 'published' | 'draft' | 'all';  // Default: 'published'
  category?: string;                               // Filter by category
  featured?: boolean;                              // Filter featured only
  sortBy?: 'date' | 'order' | 'title';            // Default: 'order'
  limit?: number;                                  // Max results
}
```

**Returns**: `Promise<Project[]>`

**Example**:
```javascript
// Get all published projects
const projects = await dataService.getProjects();

// Get featured projects
const featured = await dataService.getProjects({ featured: true, limit: 3 });

// Get web projects sorted by date
const webProjects = await dataService.getProjects({
  category: 'web',
  sortBy: 'date'
});
```

**Caching**:
- Data cached after first fetch
- Cache cleared on page reload
- No auto-refresh (static data)

**Error Handling**:
- If fetch fails: Return empty array, log error
- If JSON invalid: Return empty array, log error

---

##### `getProjectById(id: string): Promise<Project | null>`

Fetches single project by ID

**Parameters**:
- `id`: Project ID (string)

**Returns**: `Promise<Project | null>`

**Example**:
```javascript
const project = await dataService.getProjectById('ecommerce-platform');
```

---

##### `getProjectBySlug(slug: string): Promise<Project | null>`

Fetches single project by URL slug

**Parameters**:
- `slug`: Project slug (string)

**Returns**: `Promise<Project | null>`

**Example**:
```javascript
const project = await dataService.getProjectBySlug('ecommerce-platform');
```

---

##### `getServices(): Promise<Service[]>`

Fetches all services

**Returns**: `Promise<Service[]>`

**Example**:
```javascript
const services = await dataService.getServices();
```

---

##### `getAbout(): Promise<AboutContent | null>`

Fetches about content

**Returns**: `Promise<AboutContent | null>`

**Example**:
```javascript
const about = await dataService.getAbout();
```

---

##### `clearCache(): void`

Clears all cached data (forces re-fetch)

**Example**:
```javascript
dataService.clearCache();
```

---

## Reaction Service Interface

### ReactionService

**Purpose**: Manages user reactions to projects

**Module**: `src/services/reactionService.js`

#### Methods

##### `getReaction(projectId: string): Reaction | null`

Gets user's reaction for a specific project

**Parameters**:
- `projectId`: Project ID (string)

**Returns**: `Reaction | null`

**Example**:
```javascript
const reaction = reactionService.getReaction('project-1');
// Returns: { type: 'love', timestamp: 1697520000000 } or null
```

---

##### `addReaction(projectId: string, type: ReactionType): boolean`

Adds or updates user's reaction

**Parameters**:
- `projectId`: Project ID (string)
- `type`: Reaction type ('like' | 'love' | 'celebrate')

**Returns**: `true` if successful

**Business Rules**:
- If no existing reaction: Add new reaction
- If existing reaction is same type: Remove reaction (toggle off)
- If existing reaction is different type: Replace with new type

**Example**:
```javascript
// Add love reaction
reactionService.addReaction('project-1', 'love');

// Click same type again - removes reaction
reactionService.addReaction('project-1', 'love'); // Removes it
```

**Events Emitted**:
- `reaction:added` - When new reaction added
- `reaction:removed` - When reaction removed
- `reaction:changed` - When reaction type changed

---

##### `removeReaction(projectId: string): boolean`

Removes user's reaction

**Parameters**:
- `projectId`: Project ID (string)

**Returns**: `true` if successful

**Example**:
```javascript
reactionService.removeReaction('project-1');
```

---

##### `getAllReactions(): Map<string, Reaction>`

Gets all user's reactions

**Returns**: `Map<projectId, Reaction>`

**Example**:
```javascript
const reactions = reactionService.getAllReactions();
reactions.forEach((reaction, projectId) => {
  console.log(`${projectId}: ${reaction.type}`);
});
```

---

##### `getReactionCounts(projectId: string): ReactionCounts`

Gets aggregated reaction counts for a project

**Parameters**:
- `projectId`: Project ID (string)

**Returns**: `{ like: number, love: number, celebrate: number }`

**Example**:
```javascript
const counts = reactionService.getReactionCounts('project-1');
// Returns: { like: 12, love: 8, celebrate: 3 }
```

**Note**: In MVP, returns counts from projects.json. In future backend version, will query database.

---

## Theme Service Interface

### ThemeService

**Purpose**: Manages theme detection, switching, and persistence

**Module**: `src/services/themeService.js`

#### Methods

##### `initTheme(): void`

Initializes theme on page load

**Behavior**:
1. Check LocalStorage for saved preference
2. If no preference, detect system theme
3. Apply theme to document
4. Listen for system theme changes

**Example**:
```javascript
// Call once on app initialization
themeService.initTheme();
```

**Side Effects**:
- Adds/removes 'dark' class on `<html>` element
- Stores preference in LocalStorage
- Sets up system preference listeners

---

##### `getTheme(): 'light' | 'dark'`

Gets current active theme

**Returns**: `'light' | 'dark'`

**Example**:
```javascript
const currentTheme = themeService.getTheme();
```

---

##### `setTheme(theme: 'light' | 'dark' | 'system'): void`

Sets theme manually

**Parameters**:
- `theme`: Theme mode ('light', 'dark', or 'system')

**Behavior**:
- If 'system': Detect and apply system preference
- Otherwise: Apply specified theme
- Save preference to LocalStorage
- Emit theme change event

**Example**:
```javascript
themeService.setTheme('dark');
```

**Events Emitted**:
- `theme:changed` - When theme changes (payload: `{ theme: 'light' | 'dark' }`)

---

##### `toggleTheme(): void`

Toggles between light and dark

**Example**:
```javascript
themeService.toggleTheme();
```

---

##### `getSystemTheme(): 'light' | 'dark'`

Gets system theme preference

**Returns**: `'light' | 'dark'`

**Example**:
```javascript
const systemTheme = themeService.getSystemTheme();
```

---

## Form Service Interface

### FormService

**Purpose**: Handles form validation and submission

**Module**: `src/services/formService.js`

#### Methods

##### `validateEmail(email: string): boolean`

Validates email format

**Parameters**:
- `email`: Email address (string)

**Returns**: `true` if valid, `false` otherwise

**Validation**:
- RFC 5322 compliant regex
- Min length: 5 chars
- Must contain @ and domain

**Example**:
```javascript
const isValid = formService.validateEmail('user@example.com'); // true
```

---

##### `validateField(fieldName: string, value: string, rules: ValidationRules): ValidationResult`

Validates form field

**Parameters**:
```typescript
interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => boolean;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}
```

**Returns**: `ValidationResult`

**Example**:
```javascript
const result = formService.validateField('name', 'John', {
  required: true,
  minLength: 2,
  maxLength: 100
});
// Returns: { isValid: true }
```

---

##### `validateForm(formData: Record<string, string>, rules: Record<string, ValidationRules>): FormValidationResult`

Validates entire form

**Parameters**:
- `formData`: Object with field values
- `rules`: Object with validation rules per field

**Returns**:
```typescript
interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}
```

**Example**:
```javascript
const result = formService.validateForm(
  { name: 'John', email: 'invalid' },
  {
    name: { required: true, minLength: 2 },
    email: { required: true, pattern: emailRegex }
  }
);
// Returns: { isValid: false, errors: { email: 'Invalid email format' } }
```

---

##### `submitContactForm(formData: ContactRequest): Promise<SubmitResult>`

Submits contact form

**Parameters**:
- `formData`: ContactRequest object

**Returns**:
```typescript
interface SubmitResult {
  success: boolean;
  error?: string;
  data?: any;
}
```

**Behavior**:
1. Validate form data
2. Check honeypot field (spam prevention)
3. Submit to FormSubmit.co API
4. Return success/error result

**Example**:
```javascript
const result = await formService.submitContactForm({
  name: 'John Doe',
  email: 'john@example.com',
  projectDescription: 'Need a website...',
  budget: '$5,000',
  timeline: '2 months'
});
```

**Error Handling**:
- Network errors: Return error message
- Validation errors: Return validation errors
- Server errors: Return generic error message

---

## Router Service Interface

### RouterService

**Purpose**: Handles client-side routing

**Module**: `src/services/routerService.js`

#### Methods

##### `init(routes: RouteConfig[]): void`

Initializes router

**Parameters**:
```typescript
interface RouteConfig {
  path: string;
  component: Component;
  title?: string;
  meta?: Record<string, any>;
}
```

**Example**:
```javascript
routerService.init([
  { path: '/', component: HomePage, title: 'Home' },
  { path: '/projects', component: ProjectsPage, title: 'Projects' },
  { path: '/projects/:slug', component: ProjectDetailPage }
]);
```

---

##### `navigate(path: string, data?: any): void`

Navigates to route

**Parameters**:
- `path`: Route path (string)
- `data`: Optional data to pass to route

**Example**:
```javascript
routerService.navigate('/projects/my-project');
```

**Behavior**:
- Update window.location.hash
- Trigger route handler
- Update document title
- Emit navigation event

---

##### `getCurrentRoute(): Route | null`

Gets current active route

**Returns**:
```typescript
interface Route {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
}
```

**Example**:
```javascript
const route = routerService.getCurrentRoute();
// Returns: { path: '/projects/my-project', params: { slug: 'my-project' }, query: {} }
```

---

## Event Bus Interface

All services emit events through a global event bus for loose coupling.

### Event Types

```typescript
// Theme events
'theme:changed' → { theme: 'light' | 'dark' }

// Reaction events
'reaction:added' → { projectId: string, type: ReactionType }
'reaction:removed' → { projectId: string }
'reaction:changed' → { projectId: string, oldType: ReactionType, newType: ReactionType }

// Navigation events
'route:changed' → { path: string, params: Record<string, string> }

// Form events
'form:submit' → { formType: string, data: any }
'form:success' → { formType: string }
'form:error' → { formType: string, error: string }
```

### Event Bus API

```javascript
// Subscribe to event
eventBus.on('theme:changed', (data) => {
  console.log('Theme changed to:', data.theme);
});

// Emit event
eventBus.emit('theme:changed', { theme: 'dark' });

// Unsubscribe
eventBus.off('theme:changed', handler);
```

---

## LocalStorage Key Namespacing

All LocalStorage keys use `portfolio:` prefix to avoid conflicts.

**Key Structure**:
- `portfolio:theme` - Theme preference
- `portfolio:reactions` - All user reactions
- `portfolio:userId` - Anonymous user ID
- `portfolio:version` - Data version for migrations

**Example Storage State**:
```json
{
  "portfolio:theme": {
    "mode": "dark",
    "timestamp": 1697520000000
  },
  "portfolio:reactions": {
    "project-1": { "type": "love", "timestamp": 1697520000000 },
    "project-2": { "type": "like", "timestamp": 1697520100000 }
  },
  "portfolio:userId": "uuid-v4-string",
  "portfolio:version": "1.0.0"
}
```

---

## Error Handling Contract

All service methods follow consistent error handling:

1. **Never throw exceptions** (return safe defaults)
2. **Log errors to console** (for debugging)
3. **Return error indicators** (boolean false, null, empty array)
4. **Emit error events** (for UI notification)

**Example Error Handling Pattern**:
```javascript
function getProjects() {
  try {
    // Fetch projects
    return projects;
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    eventBus.emit('error', { message: 'Failed to load projects' });
    return [];
  }
}
```

---

## Testing Contract

Each service must include:

1. **Unit tests** for all public methods
2. **Mock LocalStorage** for storage tests
3. **Mock fetch** for data service tests
4. **Integration tests** for service interactions

**Example Test Structure**:
```javascript
// tests/unit/services/storageService.spec.js
import { describe, it, expect, beforeEach } from 'vitest';
import { storageService } from '@/services/storageService';

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should set and get data', () => {
    storageService.set('test', { foo: 'bar' });
    const data = storageService.get('test');
    expect(data).toEqual({ foo: 'bar' });
  });

  it('should return default on missing key', () => {
    const data = storageService.get('missing', { default: true });
    expect(data).toEqual({ default: true });
  });
});
```

---

## Summary

This storage API contract provides:
- ✅ Clear service interfaces with method signatures
- ✅ Consistent error handling patterns
- ✅ Event-driven architecture for loose coupling
- ✅ LocalStorage key namespacing
- ✅ Testing requirements
- ✅ Example usage for all methods

Services can now be implemented independently while maintaining consistent behavior across the application.

# Data Model: Modern Developer Portfolio Website

**Feature**: 001-product-vision-user
**Phase**: 1 - Design & Contracts
**Date**: 2025-10-15

## Purpose

This document defines all data entities, their attributes, relationships, validation rules, and state transitions for the portfolio website. These models serve as the contract between the data layer (JSON files, LocalStorage) and the application logic.

---

## Entity Definitions

### 1. Project

**Description**: Represents a completed work item in the developer's portfolio

**Source**: `src/data/projects.json`

**Attributes**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | string | Yes | Unique, kebab-case, alphanumeric + hyphens | Unique identifier for the project |
| `title` | string | Yes | 1-100 chars | Project display name |
| `slug` | string | Yes | Unique, URL-safe | Used for routing (e.g., /projects/my-project) |
| `description` | string | Yes | 50-500 chars | Brief overview for card display |
| `longDescription` | string | Yes | 200-2000 chars | Detailed description for project detail page |
| `thumbnail` | string (URL) | Yes | Valid image path/URL | Thumbnail image for card (recommended: 600x400px) |
| `images` | array[string] | No | Array of valid image paths/URLs | Additional screenshots/images for detail view |
| `technologies` | array[string] | Yes | 1-10 items, each 1-30 chars | Tech stack tags (e.g., ["React", "Node.js", "PostgreSQL"]) |
| `category` | string | Yes | enum: "web", "mobile", "design", "other" | Project category for filtering |
| `featured` | boolean | No | Default: false | Whether to highlight on homepage |
| `completedDate` | string (ISO date) | Yes | YYYY-MM-DD format | Project completion date |
| `demoUrl` | string (URL) | No | Valid URL format | Link to live demo/site |
| `githubUrl` | string (URL) | No | Valid GitHub URL | Link to source code repository |
| `challenges` | string | No | 0-500 chars | Key challenges solved (for detail view) |
| `results` | string | No | 0-500 chars | Project outcomes/impact |
| `reactionCounts` | object | No | `{ like: 0, love: 0, celebrate: 0 }` | Aggregated reaction counts (synced from LocalStorage) |
| `status` | string | Yes | enum: "published", "draft", "archived" | Publication status |
| `order` | number | No | Integer, default: 0 | Sort order (lower numbers first) |

**Example**:
```json
{
  "id": "ecommerce-platform",
  "title": "E-Commerce Platform",
  "slug": "ecommerce-platform",
  "description": "Full-stack e-commerce solution with React and Node.js",
  "longDescription": "Built a complete e-commerce platform featuring product catalog, shopping cart, checkout flow, and admin panel. Integrated Stripe for payments and implemented real-time inventory management.",
  "thumbnail": "/images/projects/ecommerce-thumb.jpg",
  "images": [
    "/images/projects/ecommerce-1.jpg",
    "/images/projects/ecommerce-2.jpg"
  ],
  "technologies": ["React", "Node.js", "Express", "PostgreSQL", "Stripe"],
  "category": "web",
  "featured": true,
  "completedDate": "2025-08-15",
  "demoUrl": "https://demo.example.com",
  "githubUrl": "https://github.com/user/repo",
  "challenges": "Handling concurrent inventory updates and ensuring payment security",
  "results": "Processed 1000+ orders in first month, 99.9% uptime",
  "reactionCounts": { "like": 12, "love": 8, "celebrate": 3 },
  "status": "published",
  "order": 1
}
```

**Relationships**:
- One-to-Many with Reaction (via LocalStorage)

**Validation Rules**:
- `id` must be unique across all projects
- `slug` must be URL-safe and unique
- At least one of `demoUrl` or `githubUrl` should be provided
- `images` array max length: 10
- `technologies` array max length: 10
- `thumbnail` must be optimized (max 200KB)

**State Transitions**:
```
draft → published → archived
  ↑          ↓
  └──────────┘
```

---

### 2. Reaction

**Description**: Represents a user's reaction to a specific project

**Source**: Browser LocalStorage (key: `portfolio:reactions`)

**Attributes**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `projectId` | string | Yes | Must match existing project ID | Reference to the project |
| `type` | string | Yes | enum: "like", "love", "celebrate" | Reaction type |
| `timestamp` | number | Yes | Unix timestamp (milliseconds) | When reaction was created |
| `userId` | string | No | Anonymous UUID stored in LocalStorage | Anonymous user identifier (for future features) |

**Storage Structure** (LocalStorage):
```json
{
  "portfolio:reactions": {
    "ecommerce-platform": {
      "type": "love",
      "timestamp": 1697520000000
    },
    "mobile-app-redesign": {
      "type": "like",
      "timestamp": 1697520100000
    }
  }
}
```

**Relationships**:
- Many-to-One with Project (multiple reactions per project, but one per user)

**Validation Rules**:
- User can only have one reaction per project (can change type, not stack)
- `projectId` must exist in projects.json
- `timestamp` must be valid Unix timestamp

**State Transitions**:
```
(none) → added → changed → removed
           ↑        ↓
           └────────┘
```

**Business Rules**:
- When user clicks same reaction type: remove reaction
- When user clicks different reaction type: replace existing reaction
- When project is deleted: reactions should be cleaned up (garbage collection)

---

### 3. ContactRequest

**Description**: Represents an inquiry from a potential client

**Source**: Form submission (sent via email, not persisted in MVP)

**Attributes**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `name` | string | Yes | 2-100 chars, UTF-8 | Visitor's full name |
| `email` | string | Yes | Valid email format (RFC 5322) | Contact email address |
| `projectDescription` | string | Yes | 50-2000 chars | Description of project request |
| `budget` | string | No | 0-100 chars | Optional budget range |
| `timeline` | string | No | 0-100 chars | Optional project timeline |
| `referralSource` | string | No | enum: "google", "linkedin", "referral", "other" | How they found the site |
| `timestamp` | number | Yes | Unix timestamp (auto-generated) | Submission time |
| `userAgent` | string | No | Auto-captured | Browser/device info for analytics |
| `honeypot` | string | No | Must be empty | Spam prevention field (hidden) |

**Example**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "projectDescription": "Need an e-commerce site for my clothing brand",
  "budget": "$5,000 - $10,000",
  "timeline": "2-3 months",
  "referralSource": "google",
  "timestamp": 1697520000000,
  "userAgent": "Mozilla/5.0 ...",
  "honeypot": ""
}
```

**Validation Rules**:
- `email` must pass RFC 5322 validation
- `projectDescription` minimum 50 chars (ensure quality inquiries)
- `honeypot` field must be empty (spam check)
- Rate limiting: 1 submission per IP per 5 minutes (future backend implementation)

**Relationships**:
- No direct relationships (standalone entity)
- May reference a specific Project if submitted from project detail page

---

### 4. ThemePreference

**Description**: Stores user's theme preference (light/dark mode)

**Source**: Browser LocalStorage (key: `portfolio:theme`)

**Attributes**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `mode` | string | Yes | enum: "light", "dark", "system" | Selected theme mode |
| `timestamp` | number | Yes | Unix timestamp | Last updated time |

**Storage Structure** (LocalStorage):
```json
{
  "portfolio:theme": {
    "mode": "dark",
    "timestamp": 1697520000000
  }
}
```

**Validation Rules**:
- `mode` must be one of three valid values
- If `mode` is "system", defer to OS preference

**State Transitions**:
```
system (default) → light → dark → system
      ↑             ↓       ↓       ↓
      └─────────────────────────────┘
```

**Business Rules**:
- Default to "system" if no preference stored
- Listen for OS theme changes when mode is "system"
- Apply immediately without page reload

---

### 5. Service

**Description**: Represents a service offered by the developer

**Source**: `src/data/services.json`

**Attributes**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | string | Yes | Unique, kebab-case | Unique identifier |
| `title` | string | Yes | 1-100 chars | Service name |
| `description` | string | Yes | 100-500 chars | Service overview |
| `icon` | string | No | Valid SVG path or icon name | Icon for visual representation |
| `deliverables` | array[string] | Yes | 1-10 items | What client receives |
| `processSteps` | array[string] | No | 1-10 items | High-level process overview |
| `estimatedDuration` | string | No | 1-50 chars | Typical project duration (e.g., "2-4 weeks") |
| `priceRange` | string | No | 1-50 chars | Price range (e.g., "$5,000 - $15,000") |
| `featured` | boolean | No | Default: false | Highlight on homepage |
| `order` | number | No | Integer, default: 0 | Display order |

**Example**:
```json
{
  "id": "web-development",
  "title": "Web Development",
  "description": "Custom web applications built with modern frameworks and best practices",
  "icon": "code",
  "deliverables": [
    "Responsive website",
    "Admin panel",
    "Documentation",
    "3 months support"
  ],
  "processSteps": [
    "Discovery & Planning",
    "Design & Prototyping",
    "Development & Testing",
    "Launch & Support"
  ],
  "estimatedDuration": "4-8 weeks",
  "priceRange": "$5,000 - $20,000",
  "featured": true,
  "order": 1
}
```

**Relationships**:
- No direct relationships (standalone entity)

**Validation Rules**:
- `deliverables` must have at least 1 item
- `order` determines display sequence

---

### 6. AboutContent

**Description**: Stores developer's bio and professional information

**Source**: `src/data/about.json`

**Attributes**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `name` | string | Yes | 1-100 chars | Developer's full name |
| `tagline` | string | Yes | 1-200 chars | Professional tagline/headline |
| `bio` | string | Yes | 200-1000 chars | Professional biography |
| `photoUrl` | string (URL) | Yes | Valid image path | Professional photo (recommended: 400x400px) |
| `yearsExperience` | number | Yes | Integer > 0 | Years of professional experience |
| `location` | string | No | 1-100 chars | City/country |
| `skills` | array[object] | Yes | 1-20 items | Skill categories with items |
| `socialLinks` | object | No | Valid URLs | Social media/professional links |
| `contactEmail` | string | Yes | Valid email format | Professional email |
| `telegram` | string | No | Valid Telegram username | Telegram handle |
| `availability` | string | No | enum: "available", "limited", "unavailable" | Current availability status |

**Skills Structure**:
```json
"skills": [
  {
    "category": "Frontend",
    "items": ["React", "Vue", "Tailwind CSS"]
  },
  {
    "category": "Backend",
    "items": ["Node.js", "PostgreSQL", "Redis"]
  }
]
```

**Social Links Structure**:
```json
"socialLinks": {
  "github": "https://github.com/username",
  "linkedin": "https://linkedin.com/in/username",
  "twitter": "https://twitter.com/username"
}
```

**Example**:
```json
{
  "name": "Alex Developer",
  "tagline": "Full-Stack Developer specializing in modern web applications",
  "bio": "Passionate developer with 5 years of experience building scalable web applications...",
  "photoUrl": "/images/profile/photo.jpg",
  "yearsExperience": 5,
  "location": "San Francisco, CA",
  "skills": [
    { "category": "Frontend", "items": ["React", "Vue", "Tailwind"] },
    { "category": "Backend", "items": ["Node.js", "Python", "PostgreSQL"] }
  ],
  "socialLinks": {
    "github": "https://github.com/alexdev",
    "linkedin": "https://linkedin.com/in/alexdev"
  },
  "contactEmail": "alex@example.com",
  "telegram": "@alexdev",
  "availability": "available"
}
```

**Validation Rules**:
- `photoUrl` must be optimized (max 500KB)
- At least one skill category required
- `contactEmail` must be valid and monitored

---

### 7. NavigationItem

**Description**: Represents a navigation menu item

**Source**: Hardcoded in Navigation component (not external data file)

**Attributes**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | string | Yes | Unique | Identifier for the nav item |
| `label` | string | Yes | 1-50 chars | Display text |
| `path` | string | Yes | Valid route path | Route to navigate to |
| `icon` | string | No | Icon name/SVG | Optional icon |
| `order` | number | Yes | Integer | Display order |
| `showInMobile` | boolean | No | Default: true | Show in mobile menu |
| `showInDesktop` | boolean | No | Default: true | Show in desktop menu |

**Example**:
```javascript
const navigationItems = [
  { id: 'home', label: 'Home', path: '/', icon: 'home', order: 1 },
  { id: 'projects', label: 'Projects', path: '/projects', icon: 'work', order: 2 },
  { id: 'about', label: 'About', path: '/about', icon: 'person', order: 3 },
  { id: 'services', label: 'Services', path: '/services', icon: 'star', order: 4 },
  { id: 'contact', label: 'Contact', path: '/contact', icon: 'email', order: 5 }
];
```

**Validation Rules**:
- `path` must be valid route in router configuration
- `order` must be unique across items

---

## Data Relationships Diagram

```
┌─────────────────┐
│   Project       │
│                 │
│  - id           │◄────────┐
│  - title        │         │
│  - description  │         │
│  - thumbnail    │         │
│  - ...          │         │
└─────────────────┘         │
                            │ Many-to-One
                            │
                    ┌───────┴────────┐
                    │   Reaction     │
                    │                │
                    │  - projectId   │
                    │  - type        │
                    │  - timestamp   │
                    └────────────────┘

┌──────────────────┐
│  ContactRequest  │  (No relationships)
│                  │
│  - name          │
│  - email         │
│  - description   │
└──────────────────┘

┌──────────────────┐
│ ThemePreference  │  (No relationships)
│                  │
│  - mode          │
│  - timestamp     │
└──────────────────┘

┌──────────────────┐
│     Service      │  (No relationships)
│                  │
│  - id            │
│  - title         │
│  - description   │
└──────────────────┘

┌──────────────────┐
│  AboutContent    │  (No relationships)
│                  │
│  - name          │
│  - bio           │
│  - skills        │
└──────────────────┘
```

---

## Data Storage Strategy

### JSON Files (Static Content)

**Location**: `src/data/`

**Files**:
- `projects.json`: Array of Project entities
- `services.json`: Array of Service entities
- `about.json`: Single AboutContent entity (object, not array)

**Access Pattern**:
- Fetched once on app initialization
- Cached in memory for session duration
- Can be pre-loaded during build for static generation

**Example Load Function**:
```javascript
// dataService.js
let projectsCache = null;

async function getProjects() {
  if (projectsCache) return projectsCache;

  const response = await fetch('/src/data/projects.json');
  projectsCache = await response.json();
  return projectsCache.filter(p => p.status === 'published');
}
```

### LocalStorage (User Data)

**Location**: Browser LocalStorage

**Keys**:
- `portfolio:theme`: ThemePreference
- `portfolio:reactions`: Map of projectId → Reaction
- `portfolio:userId`: Anonymous user identifier (UUID)

**Access Pattern**:
- Read on component mount
- Write on user action (reaction, theme toggle)
- Sync reaction counts to UI immediately

**Data Integrity**:
- Validate data structure on read
- Provide fallback for corrupted data
- Implement versioning for future migrations

**Example Storage Structure**:
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
  "portfolio:userId": "uuid-v4-string"
}
```

---

## Data Validation Schemas

### JSON Schema for projects.json

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "title", "slug", "description", "longDescription", "thumbnail", "technologies", "category", "completedDate", "status"],
    "properties": {
      "id": { "type": "string", "pattern": "^[a-z0-9-]+$" },
      "title": { "type": "string", "minLength": 1, "maxLength": 100 },
      "slug": { "type": "string", "pattern": "^[a-z0-9-]+$" },
      "description": { "type": "string", "minLength": 50, "maxLength": 500 },
      "longDescription": { "type": "string", "minLength": 200, "maxLength": 2000 },
      "thumbnail": { "type": "string", "format": "uri-reference" },
      "images": {
        "type": "array",
        "items": { "type": "string", "format": "uri-reference" },
        "maxItems": 10
      },
      "technologies": {
        "type": "array",
        "items": { "type": "string", "maxLength": 30 },
        "minItems": 1,
        "maxItems": 10
      },
      "category": { "type": "string", "enum": ["web", "mobile", "design", "other"] },
      "featured": { "type": "boolean" },
      "completedDate": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" },
      "demoUrl": { "type": "string", "format": "uri" },
      "githubUrl": { "type": "string", "format": "uri" },
      "challenges": { "type": "string", "maxLength": 500 },
      "results": { "type": "string", "maxLength": 500 },
      "reactionCounts": {
        "type": "object",
        "properties": {
          "like": { "type": "integer", "minimum": 0 },
          "love": { "type": "integer", "minimum": 0 },
          "celebrate": { "type": "integer", "minimum": 0 }
        }
      },
      "status": { "type": "string", "enum": ["published", "draft", "archived"] },
      "order": { "type": "integer" }
    }
  }
}
```

---

## Data Migration Strategy

### Version 1.0 (MVP)
- JSON files for static content
- LocalStorage for user data
- No backend persistence

### Version 2.0 (Future)
- Add backend API
- Migrate reactions to database
- Keep JSON for content (CMS-like)
- Add authentication for admin

**Migration Path**:
1. Add API endpoints alongside JSON files (gradual migration)
2. Sync LocalStorage reactions to backend on first load
3. Add admin authentication for content management
4. Replace JSON with headless CMS (optional)

**Backward Compatibility**:
- Data structures remain stable
- Add version field to entities
- Implement data transformers for old formats

---

## Summary

This data model provides:
- ✅ Clear entity definitions with validation rules
- ✅ Relationships between entities
- ✅ Storage strategies (JSON + LocalStorage)
- ✅ JSON schemas for validation
- ✅ Migration path for future scaling
- ✅ Business rules and state transitions

All entities align with functional requirements from spec.md and support the user stories defined for the portfolio website.

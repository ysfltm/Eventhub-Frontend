# EventHub UI - Project Structure

## Complete File Tree

```
eventhub-ui/
├── .env                              # Environment variables (API base URL)
├── .gitignore                        # Git ignore rules
├── .oxlintrc.json                    # Oxlint configuration
├── index.html                        # HTML entry point
├── package.json                      # NPM dependencies and scripts
├── package-lock.json                 # Locked dependency versions
├── vite.config.js                    # Vite build configuration
├── README.md                         # Project documentation
├── PROJECT_STRUCTURE.md              # This file
│
├── .kiro/                            # Kiro AI configuration
│   └── steering/
│       └── react-norms.md            # React/frontend conventions guide
│
├── public/                           # Static assets served as-is
│   ├── favicon.svg
│   └── icons.svg                     # SVG sprite for icons
│
└── src/                              # Source code
    ├── main.jsx                      # React DOM entry point
    ├── App.jsx                       # Root component with providers
    ├── index.css                     # Global Tailwind CSS imports
    ├── App.css                       # Legacy styles (to be migrated)
    │
    ├── api/                          # API client and endpoints
    │   ├── axiosClient.js            # Axios instance with JWT interceptors
    │   └── endpoints.js              # Centralized API endpoint constants
    │
    ├── assets/                       # Images and media files
    │   ├── hero.png
    │   ├── react.svg
    │   └── vite.svg
    │
    ├── components/                   # Reusable React components
    │   ├── layout/                   # Layout components
    │   │   └── Navbar.jsx            # Top navigation bar with auth state
    │   │
    │   ├── protection/               # Route protection components
    │   │   └── RoleGuard.jsx         # Role-based access control wrapper
    │   │
    │   └── ui/                       # UI primitive components (shadcn-style)
    │       ├── Alert.jsx             # Alert/notification component
    │       ├── Button.jsx            # Button component with variants
    │       ├── Card.jsx              # Card container with header/content/footer
    │       ├── Input.jsx             # Text input with focus states
    │       ├── Label.jsx             # Form label component
    │       └── Select.jsx            # Dropdown select component
    │
    ├── context/                      # React Context providers
    │   └── AuthContext.jsx           # Global auth state (user, token, login/logout)
    │
    ├── lib/                          # Utility functions
    │   └── utils.js                  # cn() helper for Tailwind class merging
    │
    ├── pages/                        # Page-level components (routes)
    │   ├── auth/                     # Authentication pages
    │   │   ├── LoginPage.jsx         # Sign in page
    │   │   └── RegisterPage.jsx      # Account creation page
    │   │
    │   └── events/                   # Event management pages
    │       └── EventsPage.jsx        # Event listing and creation
    │
    └── routes/                       # Routing configuration
        └── AppRoutes.jsx             # Centralized route definitions
```

## Directory Responsibilities

### `/src/api`
- **Purpose**: Centralized API communication layer
- **Key Files**:
  - `axiosClient.js`: Pre-configured Axios instance with JWT token injection and 401 handling
  - `endpoints.js`: Constants for all API routes (AUTH, PERSON, COMPANY, EVENT, etc.)

### `/src/components/ui`
- **Purpose**: Low-level, reusable UI primitives following shadcn/ui patterns
- **Design System**: Tailwind-based, composable, accessible components
- **Components**: Alert, Button, Card, Input, Label, Select

### `/src/components/layout`
- **Purpose**: High-level layout components that structure pages
- **Components**: Navbar (with role display and logout functionality)

### `/src/components/protection`
- **Purpose**: Authorization and access control wrappers
- **Components**: RoleGuard (protects routes based on user role)

### `/src/context`
- **Purpose**: Global state management via React Context
- **Context Providers**: AuthContext (JWT token, decoded user, login/logout methods)

### `/src/pages`
- **Purpose**: Page-level components mapped to routes
- **Structure**: Organized by feature area (auth, events, dashboard)
- **Convention**: Each page is a default export

### `/src/routes`
- **Purpose**: Single source of truth for application routing
- **Structure**: All `<Route>` definitions in `AppRoutes.jsx`

### `/src/lib`
- **Purpose**: Shared utility functions and helpers
- **Key Utilities**: `cn()` for Tailwind class merging (clsx + tailwind-merge)

## Tech Stack Summary

| Layer              | Technology                     |
|--------------------|--------------------------------|
| Framework          | React 19 (JSX)                |
| Build Tool         | Vite 8                        |
| Styling            | Tailwind CSS v4               |
| Icons              | Lucide React                  |
| HTTP Client        | Axios                         |
| State Management   | React Context + TanStack Query|
| Routing            | React Router v7               |
| Data Fetching      | TanStack Query v5             |

## Key Conventions

1. **No Inline Styles**: Use Tailwind utility classes exclusively
2. **Functional Components**: All components use hooks (no class components)
3. **Named Exports**: For utilities and UI primitives
4. **Default Exports**: For pages and layouts
5. **File Naming**: PascalCase for components, camelCase for utilities
6. **API Integration**: All requests through `axiosClient`, endpoints from `endpoints.js`
7. **Form Handling**: Controlled components with `useState`
8. **Error Handling**: User-friendly messages, never raw errors
9. **Role-Based Access**: Use `RoleGuard` for routes, check `user.role` for UI

## Environment Variables

```env
VITE_API_BASE_URL=https://localhost:7001/api
```

## NPM Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run Oxlint
npm run preview  # Preview production build
```

## Authentication Flow

1. User submits credentials to `/auth/login`
2. Backend returns JWT token
3. Token stored in `localStorage` as `eventhub_token`
4. `axiosClient` attaches token to all subsequent requests
5. `AuthContext` decodes token to extract user info (id, email, role)
6. Protected routes use `RoleGuard` to verify access
7. 401 responses auto-logout and redirect to `/login`

## Future Enhancements

- [ ] Add TypeScript for type safety
- [ ] Implement full CRUD for events (edit, delete)
- [ ] Add event detail page with participant management
- [ ] Build QR code check-in system (using `html5-qrcode`)
- [ ] Add feedback/rating system for events
- [ ] Implement real-time notifications
- [ ] Add unit tests (Vitest) and E2E tests (Playwright)
- [ ] Optimize bundle size with lazy loading
- [ ] Add dark mode support

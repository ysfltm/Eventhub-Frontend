---
inclusion: always
---

# EventHub Frontend Conventions

## Tech Stack & Dependencies

- **Framework**: React 19 with Vite 8, JSX syntax
- **Styling**: Tailwind CSS v4 with `@tailwindcss/vite`, `tailwind-merge`, `clsx`
- **Icons**: Lucide React
- **Data Fetching**: TanStack Query v5 (`@tanstack/react-query`)
- **HTTP Client**: Axios via `src/api/axiosClient.js`
- **Routing**: React Router v7
- **Auth**: JWT stored in `localStorage` as `eventhub_token`

## Backend Integration

- **API Base URL**: `https://localhost:7001/api` (configured via `VITE_API_BASE_URL`)
- **Authentication**: JWT Bearer tokens attached via Axios interceptors
- **Token Claims**: .NET 8 standard claims (long-form URIs like `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`)
- **Auto-Incremented IDs**: Never send primary keys (`IdPerson`, `IdEvent`, `IdCompany`) in POST requests for creation
- **Password Handling**: Raw password hashing is backend-managed; never hash on frontend

## Code Style & Patterns

### Component Structure
- Use functional components with hooks exclusively
- Keep components in feature-based directories (`pages/`, `components/`)
- Extract reusable UI primitives into `components/ui/`
- Use named exports for utilities, default exports for page/layout components

### State Management
- Use `useState` for local UI state
- Use `useContext` for global auth state via `AuthContext`
- Use TanStack Query (`useQuery`, `useMutation`) for server state
- Never mix server state in React state; let Query handle caching

### API Communication
- All HTTP requests go through `axiosClient` from `src/api/axiosClient.js`
- Use endpoint constants from `src/api/endpoints.js`
- Handle loading, error, and success states explicitly in components
- Display user-friendly error messages, never raw stack traces

### Styling Conventions
- Use Tailwind utility classes exclusively; avoid inline styles
- Combine classes with `cn()` utility (from `clsx` + `tailwind-merge`)
- Follow mobile-first responsive design
- Use semantic color variables and design tokens
- Apply focus states for accessibility (`focus-visible:ring-2`)

### Form Handling
- Use controlled components (`value` + `onChange`)
- Validate on submit, not on every keystroke
- Disable submit buttons during loading states
- Show validation errors inline near the relevant field
- Never expose auto-incremented database IDs to users

### Role-Based Access Control
- Three roles: `SuperAdmin`, `EventOrganiser`, `Participant`
- Use `RoleGuard` component with `allowedRoles` prop for route protection
- Check `user.role` from `AuthContext` for conditional UI rendering
- Redirect unauthorized users to `/unauthorized`

## File Organization

```
src/
├── api/
│   ├── axiosClient.js       # Axios instance with JWT interceptors
│   └── endpoints.js          # API endpoint constants
├── assets/                   # Static images, icons
├── components/
│   ├── layout/               # Navbar, Footer, Layout wrappers
│   ├── protection/           # RoleGuard, AuthGuard
│   └── ui/                   # Reusable UI primitives (Button, Card, Input)
├── context/
│   └── AuthContext.jsx       # Global auth state & JWT handling
├── pages/
│   ├── auth/                 # LoginPage, RegisterPage
│   ├── events/               # EventsPage, EventDetailPage
│   └── dashboard/            # DashboardPage
├── routes/
│   └── AppRoutes.jsx         # Centralized route definitions
├── App.jsx                   # Root component with providers
├── main.jsx                  # React DOM entry point
└── index.css                 # Global Tailwind imports
```

## Accessibility Requirements

- Use semantic HTML (`button`, `nav`, `main`, `label`)
- Ensure keyboard navigation works (tab order, focus states)
- Provide `aria-label` for icon-only buttons
- Use `label` elements correctly associated with inputs
- Test color contrast ratios (WCAG AA minimum)

## Performance Best Practices

- Use `React.memo()` only when profiling shows benefit
- Avoid premature optimization; prioritize readability
- Leverage TanStack Query's automatic caching and deduplication
- Use lazy loading (`React.lazy`) for route-level code splitting when app grows

## Security Rules

- Never log sensitive data (tokens, passwords) to console in production
- Validate all user inputs on both frontend and backend
- Use `httpOnly` cookies for token storage if backend supports it (currently using `localStorage`)
- Sanitize user-generated content before rendering (XSS prevention)

## Testing Strategy (Future)

- Unit tests for utility functions and hooks
- Integration tests for API interactions using MSW (Mock Service Worker)
- E2E tests for critical user flows (auth, event creation, registration)

## Anti-Patterns to Avoid

- ❌ Inline styles (use Tailwind classes)
- ❌ Mixing server state in `useState` (use TanStack Query)
- ❌ Hardcoded API URLs (use `endpoints.js`)
- ❌ Exposing database IDs in forms
- ❌ Client-side password hashing
- ❌ Suppressing ESLint warnings without understanding them
- ❌ Using `any` type when TypeScript is eventually added

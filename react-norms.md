# AGENT KNOWLEDGE BASE & UI CRAFT ENGINE: EventHub

## 1. Project Overview & Tech Stack
* **Project Name**: EventHub (Corporate & Leisure Event Management System)
* **Backend**: .NET 8 Web API (RESTful), Entity Framework Core, SQL Server
* **Frontend**: React (Vite), React Router v6, Tailwind CSS
* **Integrations**: Direct Google API (OAuth2/SMTP), JWT Auth via Axios Interceptors
* **Key Packages**: `axios`, `lucide-react`, `html5-qrcode`, `clsx`, `tailwind-merge`

## 2. Core Architectural & Backend Constraints
* **DB Schema Standard**: Maintain existing table/entity naming conventions (e.g., preserve `person` / schema decisions without refactoring).
* **Auth**: JWT stored via contextual provider (`AuthContext.jsx`).
* **Emailing**: Direct Google API integration for transactional emails and pass dispatch.

## 3. ANTI-AI-SLOP DESIGN & UI CRAFT SKILLS
To prevent generic, repetitive, low-effort "AI template" aesthetics, the agent MUST apply the following design skills across all UI tasks:

### A. Surface Architecture & Visual Hierarchy
* **Depth over Glows**: Avoid cheap-looking radial neon glows or high-contrast drop-shadows. Use subtle, layered border-based depth (`border border-slate-800/80 bg-slate-900/90 shadow-2xl backdrop-blur-md`).
* **Micro-Texture & Structure**: Use subtle structural elements like asymmetrical grid layouts, sidebar navigation accents, badge indicators, or distinct header/footer panels instead of simple floating box modals everywhere.
* **Typographic Contrast**: Pair tight tracking (`tracking-tight`) on titles with clear muted subtext (`text-slate-400 font-normal`). Avoid using uniform font sizes or weight everywhere.

### B. Micro-Interactions & Usability First
* **Tactile States**: Buttons must provide clear hover, focus-visible, and active feedback using subtle transforms or color shifts (`active:scale-[0.98] transition-all duration-150`).
* **Delightful Details**: Incorporate clear status indicators (e.g., live ping indicators `<span className="relative flex h-2 w-2">...</span>` for active events or check-in scanners).
* **Zero Layout Shift**: Use skeleton screens or reserved space containers for loading states rather than full-page spinners or shifting text.

### C. UX & Performance Balance
* **No Unnecessary Animation**: Avoid heavy, JS-driven animation libraries when CSS transitions (`transition-all duration-200`) achieve smooth 60fps rendering without bundle bloat.
* **Accessible Color Contrast**: Ensure form labels (`text-slate-300`), inputs, and help text exceed WCAG AA standards against `bg-slate-950` backgrounds.

## 4. Completed Interfaces
* **LoginPage.jsx**: Card-enclosed, dark-mode auth page with Google/Apple OAuth buttons, structured divider, password eye toggle (`lucide-react`), right-aligned password recovery, and error alerts.
* **RegisterPage.jsx**: Multi-field 2-column responsive form mapping full payload (`firstName`, `lastName`, `email`, `phone`, `company`, `roleincompany`, `role`, `password`).

## 5. Required Agent Toolset
1. **File System Operations** (`read_file`, `write_file`, `list_directory`): Component and style updating.
2. **Terminal Execution** (`execute_command`): Dependency management (`npm install`), build verification.
3. **AST / Code Inspection**: Inspecting context bindings and state pipelines.
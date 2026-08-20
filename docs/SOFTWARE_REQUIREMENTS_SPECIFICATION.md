# Software Requirements Specification (SRS) & Technical Architecture Document

**Project Name:** EventHub Enterprise Platform  
**Document Version:** 2.0.0-RELEASE  
**Author:** Principal Software Architect & Technical Lead  
**Classification:** Official Business Specification Handbook  
**Target Audience:** Engineering Teams, DevOps, Product Managers, Client Stakeholders  

---

## 1. EXECUTIVE SUMMARY & TECH STACK OVERVIEW

### 1.1 Project Vision
**EventHub** is a high-performance, enterprise-grade multiplatform event management, engagement, and access control ecosystem. The platform unifies the full event lifecycle: corporate event creation, capacity-governed public and personnel registration, cryptographic QR-coded digital entry pass generation, multi-channel dispatch (Email & WhatsApp), live gamified audience engagement (Kahoot Arena), AI-powered sentiment and summary analytics, social campaign automation (LinkedIn & MCP), and native mobile door check-in via Android APK.

```
                    ┌────────────────────────────────────────┐
                    │          EventHub Ecosystem            │
                    └───────────────────┬────────────────────┘
                                        │
     ┌──────────────────┬───────────────┴───────────────┬──────────────────┐
     ▼                  ▼                               ▼                  ▼
┌──────────────┐ ┌──────────────┐              ┌────────────────┐ ┌────────────────┐
│ React (Vite) │ │ Android APK  │              │ .NET 8 Web API │ │   SQL Server   │
│  Web Portal  │ │ (Capacitor)  │              │   Core Engine  │ │ Database Engine│
└──────────────┘ └──────────────┘              └────────────────┘ └────────────────┘
```

---

### 1.2 Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend Framework** | .NET Web API / C# | .NET 8 / C# 12 | High-throughput REST API & business domain engine |
| **ORM / Data Layer** | Entity Framework Core | EF Core 8.0 | Code-First database modeling, migrations, & LINQ queries |
| **Relational Database** | Microsoft SQL Server | 2022 / Azure SQL | ACID-compliant relational data store |
| **Frontend Framework** | React.js / JavaScript (ESNext) | React 19 / Vite 8 | Reactive single-page application & state management |
| **Styling & Design System** | Tailwind CSS / Vanilla CSS Variables | Tailwind 4.x | CST Corporate Dark Design System & Glassmorphic UI |
| **State & Data Fetching** | TanStack Query (React Query) | v5.101 | Server-state caching, optimistic mutations, & revalidation |
| **Mobile Runtime** | Capacitor & Android SDK | Capacitor 8.5 / SDK 36 | Native Android WebView container & hardware camera bridging |
| **Document Generation** | QuestPDF | 2024.x | C# Fluent API for PDF passes, badges, and session agendas |
| **Artificial Intelligence** | Google Gemini 1.5 Flash / Pro API | v1 / v1beta | Sentiment analysis, event copy generation, executive summaries |
| **Messaging & Channels** | Meta WhatsApp Cloud API / SMTP | Graph API v18.0 | Automated multi-channel pass & invitation dispatch |

---

## 2. SYSTEM ARCHITECTURE & DESIGN PATTERNS

### 2.1 Layered Architecture Pattern
EventHub adheres to an enterprise **N-Tier Layered Architecture** ensuring strict separation of concerns, testability, and maintainability:

```
 ┌────────────────────────────────────────────────────────┐
 │   Presentation Layer (Controllers & Endpoints)         │
 │   - EventController, ParticipationController, ...      │
 └───────────────────────────┬────────────────────────────┘
                             │ Dependency Injection
 ┌───────────────────────────▼────────────────────────────┐
 │   Application & Service Layer                          │
 │   - AuthService, GeminiAiService, QuestPdfService, ... │
 └───────────────────────────┬────────────────────────────┘
                             │ Data Access Abstraction
 ┌───────────────────────────▼────────────────────────────┐
 │   Data Layer (EF Core DbContext & Repositories)        │
 │   - EventHubDbContext, Entity Configurations           │
 └───────────────────────────┬────────────────────────────┘
                             │ SQL Commands
 ┌───────────────────────────▼────────────────────────────┐
 │   Infrastructure Layer (SQL Server & External APIs)    │
 │   - SQL Server, Meta Graph API, Gemini API, SMTP       │
 └────────────────────────────────────────────────────────┘
```

---

### 2.2 Authentication, Authorization & RBAC
Authentication is implemented via **JSON Web Tokens (JWT)** with cryptographically signed HMAC-SHA256 tokens. Role-Based Access Control (RBAC) enforces granular permissions across three primary personas:

```
                     ┌──────────────────┐
                     │   Identity JWT   │
                     └────────┬─────────┘
                              │ Claims: [sub, email, role, companyId]
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   [ SuperAdmin ]       [ Organiser ]         [ Attendee ]
   • All Companies      • Scoped Company     • Personal Passes
   • System Personnel   • Manage Events      • Event Registration
   • Global Analytics   • Door Check-in      • Submit Feedback
   • Database Config    • LinkedIn Campaigns • Kahoot Participation
```

1. **`SuperAdmin`**: Unrestricted global governance across all corporate tenants, user accounts, and system configuration.
2. **`Organiser`**: Tenant-scoped event creator, personnel manager, attendee roster controller, and door check-in scanner.
3. **`Attendee`**: End-user with access to public/corporate discovery, pass claiming, interactive Kahoot play, and feedback submission.

---

### 2.3 Configuration Management & Secrets Isolation
The platform implements strict environment configuration boundaries:
- **`appsettings.json`**: Contains non-sensitive structure, log levels, and template placeholders checked into source control.
- **`appsettings.Development.json` / `appsettings.Production.json`**: Excluded via `.gitignore`, storing decrypted database connection strings, JWT secret keys (`Min 32 characters`), Gemini API tokens, and SMTP application passwords.
- **Frontend `.env` / `.env.local`**: Isolates `VITE_API_BASE_URL`, `VITE_GEOAPIFY_API_KEY`, and `VITE_IMGBB_API_KEY`.

---

## 3. DATABASE ARCHITECTURE & ENTITY-RELATIONSHIP SCHEMA

```
 ┌──────────────┐        1..N        ┌──────────────┐
 │  Companies   │───────────────────<│    People    │
 └──────────────┘                    └──────────────┘
        │ 1                                 │ 1
        │                                   │
        │ 1..N                              │ 1..N
        ▼                                   ▼
 ┌──────────────┐        1..N        ┌──────────────┐
 │    Events    │───────────────────<│Participation │
 └──────────────┘                    └──────────────┘
        │ 1                                 ▲
        │                                   │
        │ 1..N                              │ 1..N
        ▼                                   │
 ┌──────────────┐                           │
 │  Feedbacks   │───────────────────────────┘
 └──────────────┘
```

---

### 3.1 Entity Specifications

#### 1. Entity: `Company` (`[dbo].[Companies]`)
Represents the corporate tenant organizing and hosting events.
```csharp
public class Company
{
    [Key]
    public int IdCompany { get; set; }

    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [MaxLength(200)]
    public string? Email { get; set; }

    [MaxLength(50)]
    public string? Phone { get; set; }

    [MaxLength(255)]
    public string? Website { get; set; }

    [MaxLength(500)]
    public string? LogoUrl { get; set; }

    [MaxLength(500)]
    public string? LinkedInUrl { get; set; }

    public virtual ICollection<Person> People { get; set; } = new List<Person>();
    public virtual ICollection<Event> Events { get; set; } = new List<Event>();
}
```

#### 2. Entity: `Person` (`[dbo].[People]`)
Represents users, organisers, attendees, and personnel.
```csharp
public class Person
{
    [Key]
    public int IdPerson { get; set; }

    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? Phone { get; set; }

    [Required, MaxLength(50)]
    public string Role { get; set; } = "Attendee"; // SuperAdmin | Organiser | Attendee

    public int? IdCompany { get; set; }
    [ForeignKey(nameof(IdCompany))]
    public virtual Company? Company { get; set; }

    [MaxLength(500)]
    public string? LinkedInUrl { get; set; }

    public virtual ICollection<Participation> Participations { get; set; } = new List<Participation>();
    public virtual ICollection<Feedback> Feedbacks { get; set; } = new List<Feedback>();
}
```

#### 3. Entity: `Event` (`[dbo].[Events]`)
Represents scheduled corporate summits, conferences, or workshops.
```csharp
public class Event
{
    [Key]
    public int IdEvent { get; set; }

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(4000)]
    public string? Description { get; set; }

    [Required]
    public DateTime Date { get; set; }

    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }

    [Required, MaxLength(300)]
    public string Address { get; set; } = string.Empty;

    public int Capacity { get; set; } = 100;

    [MaxLength(100)]
    public string Category { get; set; } = "Technology & Innovation";

    public int? IdCompany { get; set; }
    [ForeignKey(nameof(IdCompany))]
    public virtual Company? Company { get; set; }

    [MaxLength(500)]
    public string? ProgramPath { get; set; }

    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    public virtual ICollection<Participation> Participations { get; set; } = new List<Participation>();
    public virtual ICollection<Feedback> Feedbacks { get; set; } = new List<Feedback>();
}
```

#### 4. Entity: `Participation` (`[dbo].[Participations]`)
Represents an individual attendee registration, ticket pass, and door check-in state.
```csharp
public class Participation
{
    [Key]
    public int IdParticipation { get; set; }

    [Required]
    public int IdEvent { get; set; }
    [ForeignKey(nameof(IdEvent))]
    public virtual Event Event { get; set; } = null!;

    [Required]
    public int IdPerson { get; set; }
    [ForeignKey(nameof(IdPerson))]
    public virtual Person Person { get; set; } = null!;

    [Required, MaxLength(50)]
    public string Status { get; set; } = "Confirmed"; // Pending | Invited | Confirmed | CheckedIn | Cancelled

    public DateTime RegistrationDate { get; set; } = DateTime.UtcNow;
    public DateTime? CheckInTime { get; set; }

    [MaxLength(255)]
    public string? QrCodeHash { get; set; }

    public bool SentEmail { get; set; } = false;
    public bool SentWhatsApp { get; set; } = false;
}
```

#### 5. Entity: `Feedback` (`[dbo].[Feedbacks]`)
Represents attendee reviews, ratings, and AI sentiment analysis.
```csharp
public class Feedback
{
    [Key]
    public int IdFeedback { get; set; }

    [Required]
    public int IdEvent { get; set; }
    [ForeignKey(nameof(IdEvent))]
    public virtual Event Event { get; set; } = null!;

    [Required]
    public int IdPerson { get; set; }
    [ForeignKey(nameof(IdPerson))]
    public virtual Person Person { get; set; } = null!;

    [Range(1, 5)]
    public int Rating { get; set; }

    [MaxLength(2000)]
    public string? Comment { get; set; }

    [MaxLength(50)]
    public string? Sentiment { get; set; } // Positive | Neutral | Negative

    [MaxLength(500)]
    public string? ExtractedKeywords { get; set; }

    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
}
```

---

### 3.2 Database Business Rules & Cascading Constraints

```sql
-- 1. Cascading Delete Configuration on Feedbacks
ALTER TABLE [dbo].[Feedbacks]
ADD CONSTRAINT [FK_Feedbacks_Events_Cascade]
FOREIGN KEY ([IdEvent]) REFERENCES [dbo].[Events] ([IdEvent])
ON DELETE CASCADE;

-- 2. Capacity Validation Trigger / Constraint
-- Ensures event capacity is never exceeded during concurrent registration
```

1. **Capacity Invariant Enforcement**: Registration transactions evaluate `COUNT(IdParticipation) WHERE IdEvent = @EventId AND Status != 'Cancelled'` against `Event.Capacity`. If `COUNT >= Capacity`, transaction terminates with `HTTP 409 Conflict: Event Full`.
2. **Cascading Delete Integrity**: Deleting an `Event` cascades and cleans up all dependent `Participations` and `Feedbacks` to maintain referential integrity without orphan records.
3. **Unique Participation Constraint**: A unique composite index on `(IdEvent, IdPerson)` guarantees that an attendee cannot claim duplicate passes for the same event.

---

## 4. CORE FEATURE SPECIFICATIONS

### 4.1 Access Control & QuestPDF Pass Engine
- **Engine**: QuestPDF Fluent C# API.
- **Pass Structure**: Standard 105mm × 148mm (A6) digital pass containing:
  - Corporate Header & Host Branding.
  - Event Title, Category, Date, Time, and Venue.
  - Attendee Full Name, Role Badge, and Organization.
  - Cryptographic 2D QR Code containing `EVENTHUB:TICKET:{IdParticipation}:{Hash}`.
  - Official Verification Footer.
- **Door Check-In Scanning**: Browser-based webcam scanning (`Html5Qrcode`) and Android Native Camera bridge. Scans decode QR data in <200ms, execute `PUT /api/Participation/{id}/status` to `CheckedIn`, trigger a synthesized 880Hz audio chime, and update attendance counters.

---

### 4.2 Multi-Channel Communication Engine
- **Meta WhatsApp Cloud API**:
  - Endpoint: `POST https://graph.facebook.com/v18.0/{Phone_Number_ID}/messages`
  - Dispatches registered WhatsApp template messages (`hello_world` or custom invitation templates) to attendee phone numbers.
- **SMTP Email Dispatcher**:
  - Generates QuestPDF binary stream and dispatches HTML MIME email with attached PDF pass and event program via secure TLS SMTP.

---

### 4.3 Google Gemini AI Analytics Engine
- **Smart Event Generator**: Prompts Gemini 1.5 Flash to generate executive marketing descriptions, agenda outlines, and SEO category tags.
- **Sentiment & Keyword Extraction**: Evaluates incoming attendee reviews, assigns sentiment classification (`Positive`, `Neutral`, `Negative`), and extracts top keywords for organiser analytics dashboards.
- **Executive Summary Engine**: Compiles attendance numbers, check-in percentages, and feedback scores into post-event summary reports.

---

### 4.4 LinkedIn Campaign & MCP Workaround Engine
- **Direct Feed Share Composer**: Auto-copies formatted post copy with Unicode emojis, agenda bullets, and hashtags to clipboard and launches LinkedIn's native composer.
- **1200×627 HTML5 Canvas Social Banner Generator**: Compiles high-resolution branded social card downloadable as PNG.
- **LinkedIn PDF Document Carousel Export**: Generates and downloads the official Event Program PDF ready to attach via LinkedIn's Document (📄) feature.
- **Attendee 1-Click Direct Message Ping**: Formats personalized VIP invitation text and opens the attendee's LinkedIn profile in a new tab.
- **Model Context Protocol (MCP) & Webhook Dispatcher**: Generates JSON-RPC 2.0 schema payloads (`linkedin_publish_campaign`) for execution by local AI agents or dispatch to Zapier/Buffer webhooks.

---

### 4.5 Native Mobile Deployment Pipeline (Capacitor & Android SDK)
- **Runtime**: Capacitor 8.5 on Android SDK 36.
- **Hardware Integration**: Camera hardware access (`android.permission.CAMERA`), network state, and storage permissions.
- **Artifact**: `android/app/build/outputs/apk/debug/app-debug.apk`.
- **Offline Capabilities**: Service Worker precaching (`vite-plugin-pwa`) and cached ticket passes.

---

## 5. TASK AUDIT & ENGINEERING SPRINT LOG

```
 ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
 │   Sprint 1   │───►│   Sprint 2   │───►│   Sprint 3   │───►│   Sprint 4   │───►│   Sprint 5   │───►│   Sprint 6   │
 │ REST API & DB│    │ JWT & RBAC   │    │  Ticketing   │    │Security Audit│    │  Gemini AI   │    │LinkedIn & APK│
 └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

- **Sprint 1 — Core REST API & Database Schema**: Initialized .NET 8 Web API, EF Core 8 Code-First migrations, SQL Server schema creation (`People`, `Events`, `Companies`, `Participations`, `Feedbacks`).
- **Sprint 2 — Authentication & RBAC**: Implemented JWT Bearer token generation, password hashing, and role-based endpoint authorization (`SuperAdmin`, `Organiser`, `Attendee`).
- **Sprint 3 — Automated Ticketing & Dispatch**: Developed QuestPDF pass generation engine, SMTP email dispatcher, and Meta WhatsApp Cloud API integration.
- **Sprint 4 — Security Audit & Secret Isolation**: Performed Git history purge of sensitive credentials via `git-filter-repo`, separated `appsettings.Development.json`, and configured environment variables.
- **Sprint 5 — Gemini AI Integration**: Integrated Google Gemini AI service using native `HttpClient` for description generation, review sentiment analysis, and executive summaries.
- **Sprint 6 — Advanced Features, LinkedIn Suite & Mobile APK (Completed Today)**:
  1. **Live Kahoot Arena (`/live-arena`)**: Built interactive multi-player quiz arena with real-time timers, scoreboards, and podium animations.
  2. **Attendee Roster Engine**: Implemented 0ms optimistic UI updates (`onMutate`), multi-tier HTTP method fallbacks, and company-scoped personnel assignment.
  3. **User Directory Dual-Sync**: Implemented dual-sync on user creation (`[dbo].[People]` + ASP.NET Identity) with secure auto-generated credentials and company filtering.
  4. **LinkedIn Campaign & MCP Suite**: Built 1-click feed composer, 1200×627 Canvas social banner generator, editable program agenda highlights, PDF Document carousel export, Attendee Direct Message Ping, and JSON-RPC 2.0 MCP/Webhook dispatcher.
  5. **Native Android APK Pipeline**: Configured Capacitor Android SDK project, added native camera/storage permissions, and generated compiled `app-debug.apk`.
  6. **UI/UX Executive Redesign**: Refactored Event Details hero action buttons into a balanced glassmorphic 2-column command panel.

---

## 6. DEVELOPER GUIDELINES & ENVIRONMENT SETUP

### 6.1 Backend Setup (.NET 8 & SQL Server)
1. **Clone Repository & Navigate to API**:
   ```bash
   cd EventHub.Api
   ```
2. **Configure Database Connection**:
   Update `appsettings.Development.json` with your SQL Server instance:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Server=localhost;Database=EventHubDb;Trusted_Connection=True;TrustServerCertificate=True;"
     },
     "Jwt": {
       "Key": "YOUR_SUPER_SECRET_KEY_AT_LEAST_32_CHARS_LONG",
       "Issuer": "EventHubApi",
       "Audience": "EventHubClient"
     }
   }
   ```
3. **Apply Database Migrations**:
   ```bash
   dotnet ef database update
   ```
4. **Run Backend API**:
   ```bash
   dotnet run
   # API listening on https://localhost:7001 / http://localhost:5000
   ```

---

### 6.2 Frontend Setup (React & Vite)
1. **Navigate to UI Directory & Install Dependencies**:
   ```bash
   cd eventhub-ui
   npm install
   ```
2. **Configure Environment Variables (`.env`)**:
   ```env
   VITE_API_BASE_URL=https://localhost:7001/api
   ```
3. **Start Development Server**:
   ```bash
   npm run dev
   # Web app available at http://localhost:5173
   ```
4. **Build Production Bundle**:
   ```bash
   npm run build
   ```

---

### 6.3 Mobile Android APK Build Pipeline
1. **Sync Web Assets with Native Android Project**:
   ```bash
   npm run cap:build
   ```
2. **Build Debug APK via Android Studio**:
   - Open Android Studio $\rightarrow$ Open `eventhub-ui/android` folder.
   - Click **Build $\rightarrow$ Build Bundle(s) / APK(s) $\rightarrow$ Build APK(s)**.
3. **Build Debug APK via Terminal (Gradle)**:
   ```bash
   cd android
   .\gradlew.bat assembleDebug
   ```
   - Compiled APK artifact location:
     `android/app/build/outputs/apk/debug/app-debug.apk`

---

*Document approved by Lead Technical Architect for official enterprise distribution.*

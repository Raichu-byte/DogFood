# DOGFOOD 2026 — Comprehensive Repository & Specification Audit (Phase 0)

**Date**: 2026-09-26  
**Auditor**: Lead Architect, Full-Stack Engineer, Security & QA Team  
**Scope**: Complete codebase inspection, system environment audit, team battle plan documents (`Person_1`, `Person_2`, `Person_3`), and visual reference (`screen-capture.mp4`).

---

## Executive Summary

A comprehensive forensic inspection of the host system, user directories, environment binaries, and project documents was conducted. 

Key Findings:
1. **Existing Codebase State**: There is currently **no existing code repository, package.json, Prisma schema, or source tree** initialized on the system. The project directory is being established at `/Users/rachnakumari/.gemini/antigravity/scratch/dogfood`.
2. **Environment & Host Dependencies**: The host operating system (macOS) currently lacks runtime installations of `node`, `npm`, `psql`/PostgreSQL, and `docker`. Homebrew is present at `/opt/homebrew/bin/brew`. Node.js and containerization/database tooling must be installed cleanly in Phase 1 without polluting or creating runtime internet dependencies.
3. **Specification Documents**: Three detailed specification documents (`Person_1_Core_Platform_Lead (1).docx`, `Person_2_Judging_Engine_Lead.docx`, `Person_3_Frontend_DevOps_Docs_Security_Lead.docx`) and visual references (`screen-capture.mp4` / `.webm`) were recovered from the Desktop and analyzed. They define three strict ownership spheres across Core Platform (T1), Judging Engine (T2), and Frontend/DevOps/Security (T3).
4. **Visual Direction**: The visual reference demonstrates a dark-mode, spatial, interactive design language ("Modular", "Tidy", "RedSun") featuring monospace metadata accents, micro-borders, translucent depth layers, cursor-reactive elements, and typographic hierarchy rather than generic SaaS card grids.
5. **Phase Gate Adherence**: Phase 0 is strictly an audit and planning phase. No application code has been altered or prematurely synthesized.

---

## A. Current Architecture

- **State**: Greenfield / Uninitialized.
- **Planned Architecture**:
  - **Monolithic / Single-Repo Full-Stack Structure**: Node.js/Express backend coupled with a React/Vite/Tailwind frontend, orchestrated via Docker Compose with PostgreSQL 16.
  - **Client-Server Communication**: RESTful JSON APIs communicating over standard HTTP, with JWT Bearer tokens passed via `Authorization` header.
  - **Persistence**: Relational schema managed via Prisma ORM connected to PostgreSQL.
  - **Static Asset Serving**: Backend Express static file serving for local user uploads (`/uploads`) handled via Multer to avoid external object storage/S3/CDN dependencies.
  - **Offline Enclosure**: Zero runtime CDNs or external APIs (Google Fonts, Cloudinary, AWS S3, OpenAI, Clerk, Supabase, Auth0). All fonts, assets, and libraries are locally bundled.

---

## B. Current Frontend Structure

- **State**: Not initialized.
- **Planned Structure**:
  - `/frontend/src`:
    - `main.jsx` / `App.jsx`: Root router setup (React Router v6 or lightweight declarative routing).
    - `components/`:
      - `ui/`: Design system primitives (buttons, inputs, modal dialogs, status badges, spatial containers).
      - `layout/`: Top navigation, interactive status bar, contextual footer.
      - `interaction/`: Mouse/pointer glow effects, magnetic cards, animated counters.
    - `pages/`:
      - `LandingPage`: Cinematic interactive entry ("BUILD / BREAK / SHIP / BITE").
      - `AuthPage`: Register / Login with tab switching and role selection.
      - `ParticipantDashboard`: Stage-based hackathon journey ("REGISTERED → TEAM → BUILD → SHIP → JUDGING → RESULTS").
      - `EventDetailPage`: Event overview, tracks, prizes, real-time server-grounded deadline countdown.
      - `TeamPage`: Team formation, roster management, invite link generation and joining.
      - `SubmissionPage`: Multi-step "Ship It" drafting interface with local asset upload and real-time backend validation.
      - `GalleryPage`: Spatial project galaxy with search, track filtering, and expand-to-inspect previews.
      - `JudgeConsolePage`: High-efficiency single-project evaluation workspace with keyboard shortcuts (`←`/`→`), split rubric panel, and autosave.
      - `JudgingProgressPage`: Real-time organizer view of scoring completion across all judges and tracks.
      - `VotingPage`: Community voting ballot with server-shuffled order and hidden live tallies.
      - `OrganizerControlRoom`: Master control room with event management, audit logs, duplicate flags, and results publication.
      - `ResultsPage`: Ceremonial results reveal with raw vs. normalized z-score breakdowns.
    - `services/api.js`: Centralized Axios/fetch client with JWT interceptors, standardized error handling, and offline fallbacks.

---

## C. Current Backend Structure

- **State**: Not initialized.
- **Planned Structure**:
  - `/backend/src`:
    - `server.js` / `app.js`: Express application initialization, CORS, JSON parsing, rate limiting, and route mounting.
    - `config/`: Environment variable validation (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `UPLOAD_DIR`).
    - `middleware/`:
      - `auth.js`: JWT verification, token decoding, user context attachment (`req.user`).
      - `roles.js`: Strict RBAC checking (`requireRole(['organizer', 'admin'])`).
      - `judgeIsolation.js`: Defense-in-depth middleware preventing judges from accessing unassigned projects or other judges' score records.
      - `deadline.js`: Server-authoritative submission deadline verification.
      - `rateLimiter.js`: Endpoint-specific throttling using `express-rate-limit`.
      - `auditLogger.js`: Interceptor writing security-critical events to the audit table.
      - `errorHandler.js`: Standardized error envelope (`{ error: { message, code, details, requestId } }`).
    - `controllers/`:
      - `authController.js`
      - `eventController.js`
      - `teamController.js`
      - `submissionController.js`
      - `galleryController.js`
      - `judgingController.js`
      - `normalizationController.js`
      - `exportController.js`
      - `auditController.js`
    - `services/`:
      - `normalizationService.js`: Pure mathematical implementation of judge z-score normalization with zero-variance fallbacks.
      - `assignmentService.js`: Deterministic round-robin judge assignment.
      - `antiAbuseService.js`: Duplicate submission, account, and voting pattern detection.

---

## D. Database Structure

- **State**: No Prisma schema or database migrations present.
- **Planned Schema (Prisma / PostgreSQL)**:
  - `User`: `id`, `email` (unique), `passwordHash`, `name`, `role` (`VISITOR`, `PARTICIPANT`, `JUDGE`, `ORGANIZER`, `ADMIN`), `createdAt`, `updatedAt`.
  - `Event`: `id`, `name`, `slug` (unique), `description`, `submissionDeadline` (DateTime), `judgingDeadline` (DateTime), `votingDeadline` (DateTime), `status` (`DRAFT`, `ACTIVE`, `JUDGING`, `VOTING`, `FINALIZED`, `PUBLISHED`), `organizerId` (FK User).
  - `Track`: `id`, `eventId` (FK Event), `name`, `description`.
  - `Prize`: `id`, `eventId` (FK Event), `title`, `amount`, `trackId` (optional FK Track).
  - `Team`: `id`, `eventId` (FK Event), `name`, `inviteCode` (unique), `creatorId` (FK User), `createdAt`.
  - `TeamMember`: `id`, `teamId` (FK Team), `userId` (FK User), `role` (`LEADER`, `MEMBER`), joinedAt. (Unique constraint on `[teamId, userId]` and business rule enforcing single team per event).
  - `Submission`: `id`, `eventId` (FK Event), `teamId` (FK Team, unique per event), `title`, `tagline`, `description`, `trackId` (FK Track), `techStack` (String[] or JSON), `repoUrl`, `demoUrl`, `videoUrl`, `thumbnailUrl`, `isDraft` (Boolean), `submittedAt` (DateTime nullable), `createdAt`, `updatedAt`.
  - `RubricCriteria`: `id`, `eventId` (FK Event), `name`, `description`, `weight` (Float, e.g. 0.25), `minScore` (Int, 1), `maxScore` (Int, 10).
  - `JudgeAssignment`: `id`, `eventId` (FK Event), `judgeId` (FK User), `submissionId` (FK Submission), `assignedAt`, `status` (`PENDING`, `COMPLETED`). (Unique constraint on `[judgeId, submissionId]`).
  - `Score`: `id`, `assignmentId` (FK JudgeAssignment), `criteriaId` (FK RubricCriteria), `scoreValue` (Float), `feedback` (String), `createdAt`, `updatedAt`. (Unique constraint on `[assignmentId, criteriaId]`).
  - `ProjectScoreSummary`: `id`, `submissionId` (FK Submission), `rawScoreMean` (Float), `normalizedZScore` (Float), `rank` (Int nullable), `updatedAt`.
  - `CommunityVote`: `id`, `eventId` (FK Event), `voterId` (FK User), `submissionId` (FK Submission), `createdAt`. (Unique constraint on `[eventId, voterId]`).
  - `AuditLog`: `id`, `actorId` (FK User nullable), `action` (String), `targetResource` (String), `targetId` (String nullable), `ipAddress` (String), `userAgent` (String), `metadata` (JSON), `timestamp` (DateTime).

---

## E. Authentication Implementation

- **Current State**: Non-existent.
- **Specification Requirements**:
  - Self-hosted JWT-based authentication using `jsonwebtoken`.
  - Passwords salted and hashed with `bcrypt` (minimum 10 salt rounds).
  - Standard bearer authentication via HTTP Authorization header: `Bearer <token>`.
  - Defensive rejection of missing tokens, expired tokens, invalid signatures, and malformed strings.
  - No plain-text passwords or secret credentials committed to source.

---

## F. Authorization Implementation

- **Current State**: Non-existent.
- **Specification Requirements**:
  - Five distinct roles: `VISITOR`, `PARTICIPANT`, `JUDGE`, `ORGANIZER`, `ADMIN`.
  - Strict backend RBAC middleware checking user roles against route privileges.
  - Ownership validation:
    - Participants can only view/edit their own team and draft submissions.
    - Non-team members cannot submit or alter a project.
    - Judges can **never** view scores from other judges or projects not assigned to them.
    - Only Organizers/Admins can trigger judge assignment, view live judging progress, finalize/publish results, and download unredacted exports.
  - No reliance on frontend UI button disabling or route masking for security.

---

## G. API Inventory

- **Current State**: No endpoints currently live.
- **Planned REST API Specification**:
  - **Auth**:
    - `POST /api/auth/register` (Register user)
    - `POST /api/auth/login` (Login, returns JWT & user profile)
    - `GET /api/auth/me` (Current authenticated user profile)
  - **Events**:
    - `GET /api/events` (List public active events)
    - `GET /api/events/:id` (Event details, tracks, prizes, deadlines)
    - `POST /api/events` (Organizer creates event)
    - `PUT /api/events/:id` (Organizer updates event)
  - **Teams**:
    - `POST /api/teams` (Create team in an event)
    - `GET /api/teams/:id` (Team details and member list)
    - `POST /api/teams/join` (Join team via invite code)
    - `GET /api/teams/my-team` (Get current user's team for active event)
  - **Submissions**:
    - `POST /api/submissions/draft` (Create or update draft)
    - `GET /api/submissions/:id` (Get submission details)
    - `POST /api/submissions/:id/ship` (Finalize and lock submission before deadline)
    - `POST /api/submissions/:id/upload` (Multer local asset upload)
  - **Gallery**:
    - `GET /api/gallery` (Public submissions list with search, track filter, no private data)
    - `GET /api/gallery/:id` (Public detail view of single eligible project)
  - **Judging**:
    - `POST /api/judging/assign` (Organizer triggers round-robin assignment)
    - `GET /api/judging/assignments` (Judge fetches only assigned ballots in server-randomized order)
    - `GET /api/judging/rubric/:eventId` (Fetch rubric criteria for event)
    - `POST /api/judging/scores` (Submit or update score for assigned project)
    - `GET /api/judging/scores/:assignmentId` (Retrieve own scores for verification)
    - `GET /api/judging/progress/:eventId` (Organizer views judging progress)
    - `POST /api/judging/normalize/:eventId` (Organizer triggers z-score normalization)
    - `GET /api/judging/export/:eventId` (Organizer exports sanitized CSV via `json2csv`)
  - **Community Voting & Anti-Abuse (T3)**:
    - `POST /api/voting/vote` (Participant/visitor submits single community vote)
    - `GET /api/voting/my-vote` (Fetch current user's vote)
    - `GET /api/voting/results` (Organizer/Admin only until officially published)
    - `GET /api/admin/audit-logs` (Organizer/Admin access to append-only audit trail)
    - `GET /api/admin/abuse-flags` (Organizer review of detected duplicates)

---

## H. Frontend Route Inventory

- **Current State**: Non-existent.
- **Planned Routes**:
  - `/` — Interactive Cinematic Landing & Platform Narrative
  - `/login` — User Authentication & Profile Entry
  - `/register` — Account Registration
  - `/events` — Active Hackathons Explorer
  - `/events/:id` — Event Overview, Schedule, Tracks, & Live Countdown
  - `/dashboard` — Participant Interactive Journey ("Next Action" Stepper)
  - `/team` — Team Formation & Roster Management
  - `/submit` — "Ship It" Submission Studio (Drafting, Verification, Lock)
  - `/gallery` — Spatial Public Projects Explorer (Search, Filters, Detail Overlays)
  - `/judge` — Focused Judge Console (Single-project focus, rubric, keyboard controls)
  - `/organizer` — Organizer Control Room (Assignments, Progress, Abuse Flags, Audit Log)
  - `/results` — Ceremonial Hackathon Results & Normalized Breakdown Reveal

---

## I. Existing Components

- **Current State**: None.
- **Planned Component Hierarchy**:
  - `UI Primitives`: `MagneticButton`, `Input`, `TextArea`, `Badge`, `Modal`, `Callout`, `ProgressBar`, `SkeletonLoader`.
  - `Spatial & Microinteractions`: `CursorGlow`, `ParticleCanvas` (lightweight 2D canvas), `ProjectCard` (pointer tilt and reactive borders), `CounterTicker`.
  - `Layout`: `Navbar` with role-aware switcher, `StatusBar` displaying current network/offline state and active event stage, `Footer`.
  - `Workflow Modules`: `RosterList`, `InviteModal`, `RubricScorer`, `CriteriaRow`, `ShipChecklist`, `ExportButton`.

---

## J. Existing Tests

- **Current State**: Zero tests existing in the workspace.
- **Planned Test Strategy**:
  - **Unit Tests (`Jest`)**:
    - Pure z-score normalization calculation (`mean`, `stddev`, `z-score`, zero-stddev handling, missing scores).
    - Password hashing & token generation utilities.
    - Date and deadline verification utilities.
  - **Integration & Security Tests (`Jest + Supertest`)**:
    - T1 Auth: Valid registration, duplicate email rejection, invalid credentials, malformed/missing JWT.
    - T1 RBAC: Participant blocked from organizer endpoints, visitor blocked from participant endpoints.
    - T1 Deadlines: Submissions rejected post-deadline; draft updates blocked after final lock.
    - T2 Judge Isolation: Judge A receives 403 when querying Judge B's scores; Judge cannot score unassigned project.
    - T2 Export: Non-organizer blocked from CSV export; exported CSV verified against database rows.
    - T3 Anti-Abuse: Rate limiter responds with 429 upon threshold breach; duplicate votes rejected; audit logs appended.

---

## K. Docker / Compose State

- **Current State**: No `Dockerfile` or `docker-compose.yml` present on the system.
- **Planned Configuration**:
  - `docker-compose.yml`:
    - `postgres`: Image `postgres:16-alpine`, health check via `pg_isready -U postgres`, persistent volume `db-data`.
    - `app`: Multi-stage build packaging Node.js backend, built React frontend static assets, Prisma migrations, and seed scripts.
  - Startup resilience: App container waits for PostgreSQL health check before running migrations and starting the Express server.
  - Fully offline verified: Images cached locally; no external network fetches during `docker compose up`.

---

## L. Seed / Fixture State

- **Current State**: No fixtures or seeds exist.
- **Planned Fixtures (`prisma/seed.ts` or `prisma/seed.js`)**:
  - Deterministic fixture loading covering:
    - 1 Organizer (`organizer@dogfood.test`)
    - 4 Judges (`judge1@dogfood.test` ... `judge4@dogfood.test`)
    - 8 Participants (`alice@dogfood.test`, `bob@dogfood.test`, etc.)
    - 1 Active Hackathon ("Dogfood 2026: The Builder's Playground") with 3 tracks and 4 rubric criteria.
    - 4 Formed Teams with 4 Submitted Projects.
    - Pre-computed Judge Assignments (Round-Robin).
    - Hand-calculable test scores for normalization verification, including deliberate edge cases (Judge with zero standard deviation, incomplete review).
    - Pre-configured audit log entries and duplicate test cases.

---

## M. Current Acceptance-Test State

- **Current State**: Acceptance suite uninitialized.
- **Planned Acceptance Verification**:
  - Automated acceptance suite (`npm run test:acceptance`) validating:
    1. Public gallery returns only published submissions without sensitive contact data.
    2. Fixture seed data loads completely and idempotently.
    3. Deadline enforcement rejects late submissions with 403/400.
    4. Judge can access assigned project and submit valid rubric score.
    5. Judge is denied access (403/404) when querying another judge's score.
    6. Participant is denied access (403) to judge-only endpoints.
    7. Organizer can export sanitized results CSV.
    8. Complete lifecycle executes cleanly offline.

---

## N. Security Weaknesses (Target Architecture & Mitigations)

1. **Broken Object Level Authorization (BOLA)**:
   - *Risk*: A user alters `teamId`, `submissionId`, or `assignmentId` in URL or body.
   - *Mitigation*: Every controller queries ownership/assignment from the authenticated session context (`req.user.id`), not client-supplied identity fields.
2. **Judge Score Peeking & Collusion**:
   - *Risk*: A judge queries scores of competitor judges or other projects to adjust scoring biasedly.
   - *Mitigation*: Backend query filter forces `where: { judgeId: req.user.id }` and returns 403 Forbidden if unassigned.
3. **Post-Deadline Submission Tampering**:
   - *Risk*: Modifying team submissions after the official deadline has passed.
   - *Mitigation*: Backend deadline middleware compares server timestamp (`new Date()`) against event deadline; once shipped, status is locked permanently.
4. **Credential & Secret Leakage**:
   - *Risk*: Accidental commit of JWT secrets, database credentials, or API keys.
   - *Mitigation*: Strict `.env` parsing with defaults for local offline development; `.gitignore` enforcement.
5. **No Rate Limiting / Abuse**:
   - *Risk*: Bot or malicious user flooding registration, voting, or scoring endpoints.
   - *Mitigation*: Dedicated `express-rate-limit` instances on auth, submission, and voting routes.

---

## O. Missing Dogfood Requirements (To Be Implemented)

- **Core T1**:
  - User Registration, Login, JWT auth, RBAC.
  - Event CRUD, tracks, prizes, deadline enforcement.
  - Team creation, unique invite links, join verification.
  - Submissions studio, draft persistence, final "Ship It" lock.
  - Public gallery with search and filtering.
- **Judging T2**:
  - Round-robin judge assignment engine.
  - Configurable weighted rubrics with criteria range validation.
  - Isolated judge score submission and verification.
  - Z-score normalization calculation with zero-stddev fallback.
  - Real-time judging progress metrics.
  - Sanitized CSV export via `json2csv`.
- **Security & Anti-Abuse T3**:
  - Rate limiting on sensitive routes.
  - Duplicate detection engine (accounts, submissions, voting patterns).
  - Append-only audit logging.
  - Server-randomized ballot ordering per judge.
  - Hidden community voting tallies prior to publication.
- **Frontend & UX**:
  - Dark, spatial, interactive design system following video reference principles.
  - Animated participant hackathon journey.
  - High-efficiency judge scoring console.
  - Control room dashboard for organizers.
  - Ceremonial results reveal.
- **DevOps & Offline Reliability**:
  - Docker Compose setup for PostgreSQL and Node.js.
  - Offline-first asset bundling.
  - Comprehensive Jest + Supertest suite.

---

## P. UI/UX Weaknesses to Avoid

1. **Generic SaaS Syndrome**: Rejecting plain white dashboards with boilerplate rectangular cards, KPI widgets, and purple gradients.
2. **Cartoon Mascot Clutter**: Eliminating goofy dog cartoons; adhering to the "BUILD / BREAK / SHIP / BITE" dark tech aesthetic.
3. **Motion Bloat**: Eliminating slow, gratuitous WebGL or CPU-heavy animations that degrade responsiveness during data entry.
4. **Poor Accessibility & Keyboard Inoperability**: Ensuring judge workflow operates effortlessly via keyboard shortcuts (`←`/`→`), with WCAG AA color contrast and full screen reader support.

---

## Q. Technical Debt (Preemptive Rules)

- Centralize all API client calls in `services/api.js` rather than scattered `fetch` calls.
- Enforce strict typing/validation of request payloads using schema validation or explicit helper validators.
- Keep business logic in services (`normalizationService.js`, `assignmentService.js`) rather than stuffing controllers.

---

## R. Duplicate Code Elimination

- Shared authentication middleware for token extraction.
- Reusable role-checking higher-order middleware: `requireRole('ORGANIZER', 'ADMIN')`.
- Shared normalization math module referenced by both the API controller and unit test suite.

---

## S. Potential Race Conditions

1. **Simultaneous Final Submission**:
   - Multiple team members clicking "Ship It" simultaneously right before the deadline.
   - *Resolution*: Database transaction with optimistic locking / atomic status transition (`isDraft: true -> false`).
2. **Simultaneous Team Join**:
   - Multiple users joining a team exceeding maximum team size.
   - *Resolution*: Prisma transaction verifying member count inside a database lock.
3. **Deadline Edge Timestamp**:
   - Submissions initiated 100ms before deadline completing 500ms after.
   - *Resolution*: Enforce deadline at start of request handler; log exact millisecond timestamps.

---

## T. Potential Data-Leakage Paths

1. **Public Gallery Returning Author Contact Info**:
   - Sensitive user emails or team member phone numbers leaking into the public gallery API.
   - *Resolution*: Explicit Prisma `select` projection excluding private user fields.
2. **Community Voting API Leaking Real-Time Tallies**:
   - API endpoints returning aggregate vote counts before results publication.
   - *Resolution*: Omit vote tallies completely from public payloads until `event.status === 'PUBLISHED'`.
3. **Audit Log Leaking Passwords or Tokens**:
   - Audit logger capturing raw request bodies containing passwords.
   - *Resolution*: Explicit redaction of `password`, `token`, and secret fields before persisting metadata.

---

## U. Potential Loopholes (Adversarial Vector Matrix)

- **Parameter Tampering**: Changing `submissionId` in score submission payload to score unassigned project → Prevented by verifying assignment table foreign key match against `req.user.id`.
- **Role Escalation**: Participant sending `{ role: 'ORGANIZER' }` in registration body → Prevented by hard-defaulting registration role to `PARTICIPANT` unless generated via specific admin bootstrap.
- **Stale Token Replay**: Revoked or obsolete tokens → Validated on every request.
- **Client Clock Manipulation**: Changing system clock to bypass deadlines → Handled solely via server timestamp (`new Date()`).

---

## V. Offline-Runtime Risks

- **CDN Fonts**: Using Google Fonts (`fonts.googleapis.com`) will break when Wi-Fi is disabled. Must bundle local system font stack (`system-ui`, `-apple-system`, `Inter`, `JetBrains Mono`).
- **CDN Icons / Scripts**: Lucide/FontAwesome via CDN will fail. Must use locally bundled SVG or inline icons.
- **External Image Hosts**: Projects with Unsplash or Imgur URLs will fail offline. Use locally served thumbnails and SVGs.
- **External Auth Providers**: No OAuth/Google/GitHub sign-in; local JWT + bcrypt only.

---

## W. Dependency Risks

- **Dependencies to REJECT**:
  - `firebase`, `supabase`, `@clerk/clerk-react`, `auth0`: Violates offline and self-hosted requirement.
  - `openai`, `@google/genai`, `langchain`: Violates the rule prohibiting external AI dependencies.
  - `three`, `@react-three/fiber`: Heavy 3D libraries causing performance bottlenecks and high memory footprint.
  - `framer-motion` (excessive use): Use Tailwind CSS transitions and lightweight CSS keyframes for snappy 60fps performance.
- **Approved Core Dependencies**:
  - Backend: `express`, `cors`, `dotenv`, `bcrypt`, `jsonwebtoken`, `@prisma/client`, `prisma`, `multer`, `json2csv`, `express-rate-limit`.
  - Frontend: `react`, `react-dom`, `vite`, `@tailwindcss/vite` (or `tailwindcss`), `lucide-react` (locally bundled), `canvas-confetti` (local).
  - Testing: `jest`, `supertest`.

---
*Audit Completed and Certified for Phase 0.*

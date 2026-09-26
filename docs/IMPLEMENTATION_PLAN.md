# DOGFOOD 2026 — Master Implementation Plan (Phase 0)

**Date**: 2026-09-26  
**Auditor / Architect**: Lead Architect, Full-Stack Engineer, Security & QA Team  
**Adherence Standard**: Strict Phase Gate System (Phase 0 to Phase 42). Work strictly step-by-step. No jumping, no skipping, no premature bundling.

---

## Priority Hierarchy
- **P0**: Security / Data Integrity / Backend Authorization / Startup Baseline
- **P1**: T1 Core Platform (Auth, Roles, Events, Teams, Submissions, Deadlines, Public Gallery)
- **P2**: T2 Judging Engine (Assignments, Rubrics, Scoring, Isolation, Normalization, Progress, Export)
- **P3**: Acceptance Testing & Offline Reliability
- **P4**: T3 Security & Anti-Abuse (Rate limiting, Duplicate detection, Audit logging, Randomized ballot, Hidden results)
- **P5**: UI/UX Polish & Modern Spatial Interaction (Interactive landing, Participant journey, Ship It studio, Judge console, Organizer control room, Results reveal)
- **P6**: Bonus Features & Final Polish

---

## Requirement Mapping Matrix

### 1. P0: Environment, Docker & Containerized Baseline

#### REQ-P0-01: Runtime Environment & Core Tooling Setup
- **CURRENT STATE**: Host machine currently lacks `node`, `npm`, `docker`, and `psql` in active PATH. Homebrew is installed at `/opt/homebrew/bin/brew`.
- **FILE(S)**: Host environment / Homebrew, `package.json`, `.nvmrc`
- **IMPLEMENTATION STEP**: Install Node.js LTS (v20+) and container runtime via Homebrew. Initialize root project structure at `/Users/rachnakumari/.gemini/antigravity/scratch/dogfood` with monorepo/dual package layout (`backend/`, `frontend/`).
- **TEST**: Run `node -v`, `npm -v`, verify version matches `>= 20.0.0`.
- **ACCEPTANCE CONDITION**: Clean invocation of `npm` and `node` without errors.

#### REQ-P0-02: Docker Compose Orchestration & Offline Packaging
- **CURRENT STATE**: Non-existent.
- **FILE(S)**: `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`
- **IMPLEMENTATION STEP**: Create production-grade Docker Compose manifest defining `postgres` (PostgreSQL 16 alpine with health check) and `app` (Node.js Express + built Vite frontend). Implement dependency health ordering (`depends_on.condition: service_healthy`).
- **TEST**: Execute `docker compose config` and test container boots with Wi-Fi disabled.
- **ACCEPTANCE CONDITION**: `docker compose up` brings up database and web services from clean state with no external network calls.

---

### 2. P1: T1 Core Platform

#### REQ-T1-01: User Registration, Password Hashing & JWT Authentication
- **CURRENT STATE**: Non-existent.
- **FILE(S)**:
  - `backend/src/controllers/authController.js`
  - `backend/src/middleware/auth.js`
  - `backend/src/routes/authRoutes.js`
  - `backend/prisma/schema.prisma`
- **IMPLEMENTATION STEP**: Define `User` model with `email`, `passwordHash`, `name`, `role`. Implement `register` endpoint with email uniqueness validation and `bcrypt.hash(password, 10)`. Implement `login` returning signed JWT with 24h expiration. Implement Bearer token extraction and verification middleware attaching `req.user`.
- **TEST**: Supertest suite `tests/api/auth.test.js`:
  - Register valid user (201).
  - Register duplicate email (409).
  - Login valid credentials (200 + token).
  - Login invalid credentials (401).
  - Access protected route without token (401).
  - Access protected route with malformed/expired token (401).
- **ACCEPTANCE CONDITION**: Secure JWT auth functioning end-to-end with zero plain-text passwords stored.

#### REQ-T1-02: Role-Based Access Control (RBAC)
- **CURRENT STATE**: Non-existent.
- **FILE(S)**:
  - `backend/src/middleware/roles.js`
  - `backend/prisma/schema.prisma`
- **IMPLEMENTATION STEP**: Implement Prisma enum `Role { VISITOR, PARTICIPANT, JUDGE, ORGANIZER, ADMIN }`. Build `requireRole(...allowedRoles)` middleware that verifies `req.user.role`.
- **TEST**: Supertest suite `tests/api/roles.test.js`:
  - Participant calling organizer endpoint receives 403 Forbidden.
  - Judge calling organizer endpoint receives 403 Forbidden.
  - Organizer calling organizer endpoint succeeds (200).
- **ACCEPTANCE CONDITION**: Backend strictly blocks unauthorized roles regardless of client-side state.

#### REQ-T1-03: Hackathon Event Management (Organizer CRUD, Tracks, Prizes, Deadlines)
- **CURRENT STATE**: Non-existent.
- **FILE(S)**:
  - `backend/src/controllers/eventController.js`
  - `backend/src/routes/eventRoutes.js`
  - `backend/prisma/schema.prisma`
- **IMPLEMENTATION STEP**: Create `Event`, `Track`, and `Prize` models. Implement endpoints for creating, editing, and querying events. Add backend date validation (`submissionDeadline < judgingDeadline < votingDeadline`).
- **TEST**: Supertest suite `tests/api/events.test.js`:
  - Organizer creates event with tracks and prizes (201).
  - Non-organizer denied event creation (403).
  - Public lists active events without authentication (200).
  - Event with invalid chronological dates rejected (400).
- **ACCEPTANCE CONDITION**: Events persist with full relational tracks, prizes, and validated deadlines.

#### REQ-T1-04: Team Formation, Roster & Secure Invite System
- **CURRENT STATE**: Non-existent.
- **FILE(S)**:
  - `backend/src/controllers/teamController.js`
  - `backend/src/routes/teamRoutes.js`
  - `backend/prisma/schema.prisma`
- **IMPLEMENTATION STEP**: Create `Team` and `TeamMember` models. Team creation generates cryptographically random `inviteCode`. Add membership constraints: user can only belong to one team per event. Joining requires valid `inviteCode` and checks maximum team size.
- **TEST**: Supertest suite `tests/api/teams.test.js`:
  - Create team creates unique invite code (201).
  - Join team with valid invite code succeeds (200).
  - Join team with invalid/expired invite code rejected (404/400).
  - User attempting to join second team in same event rejected (400).
- **ACCEPTANCE CONDITION**: Teams form reliably, invites are tamper-proof, and single-team integrity is enforced.

#### REQ-T1-05: Project Submissions, Drafting & Server-Enforced Deadlines
- **CURRENT STATE**: Non-existent.
- **FILE(S)**:
  - `backend/src/controllers/submissionController.js`
  - `backend/src/middleware/deadline.js`
  - `backend/src/routes/submissionRoutes.js`
  - `backend/prisma/schema.prisma`
- **IMPLEMENTATION STEP**: Define `Submission` model with draft flag (`isDraft`), track, repo URL, demo URL, media, and description. Implement draft save endpoint. Implement "Ship It" endpoint that validates required fields, verifies current server time is before `submissionDeadline`, and marks `isDraft = false`. Subsequent edits to locked submissions rejected.
- **TEST**: Supertest suite `tests/api/submissions.test.js`:
  - Team saves draft (200).
  - Non-member cannot edit team draft (403).
  - Final submission before deadline succeeds and locks project (200).
  - Submission attempt after deadline rejected (403/400).
  - Modification attempt on locked submission rejected (403).
- **ACCEPTANCE CONDITION**: Submissions are strictly locked upon final ship or deadline expiry.

#### REQ-T1-06: Public Project Gallery API
- **CURRENT STATE**: Non-existent.
- **FILE(S)**:
  - `backend/src/controllers/galleryController.js`
  - `backend/src/routes/galleryRoutes.js`
- **IMPLEMENTATION STEP**: Implement public gallery query returning non-draft submissions for published/active events. Support search by title/tagline/techStack and filter by track. Use explicit Prisma field selection to exclude private user data (email, password hash, draft status).
- **TEST**: Supertest suite `tests/api/gallery.test.js`:
  - Anonymous visitor fetches gallery (200).
  - Draft submissions excluded from public results.
  - Search by query string filters matching projects.
  - Response payload verified to contain zero user emails or sensitive hashes.
- **ACCEPTANCE CONDITION**: Public gallery performs fast, accurate filtering with zero data leaks.

---

### 3. P2: T2 Judging Engine

#### REQ-T2-01: Deterministic Round-Robin Judge Assignment
- **CURRENT STATE**: Non-existent.
- **FILE(S)**:
  - `backend/src/services/assignmentService.js`
  - `backend/src/controllers/judgingController.js`
  - `backend/prisma/schema.prisma`
- **IMPLEMENTATION STEP**: Create `JudgeAssignment` model with unique constraint on `[judgeId, submissionId]`. Implement round-robin assignment algorithm ensuring each submitted project receives a minimum number of judges (e.g. 3) and judges receive balanced workloads.
- **TEST**: Unit test `tests/unit/assignment.test.js`:
  - 10 projects and 4 judges assigned evenly.
  - No duplicate assignments for same judge and project.
  - All projects meet minimum review target.
- **ACCEPTANCE CONDITION**: Assignments stored explicitly and verifiable in database.

#### REQ-T2-02: Configurable Weighted Rubrics
- **CURRENT STATE**: Non-existent.
- **FILE(S)**:
  - `backend/src/controllers/judgingController.js`
  - `backend/prisma/schema.prisma`
- **IMPLEMENTATION STEP**: Create `RubricCriteria` model (`name`, `description`, `weight`, `minScore`, `maxScore`). Validate that total criteria weights sum to 1.0 (or 100%) upon event setup.
- **TEST**: Unit test `tests/unit/rubric.test.js`:
  - Validate weight sum equals 1.0 (valid).
  - Reject rubric where weights sum to 0.85 or 1.15 (invalid).
- **ACCEPTANCE CONDITION**: Dynamic rubrics configurable per event with validated weights.

#### REQ-T2-03: Backend-Enforced Judge Isolation (T2.03)
- **CURRENT STATE**: Non-existent.
- **FILE(S)**:
  - `backend/src/middleware/judgeIsolation.js`
  - `backend/src/controllers/judgingController.js`
  - `backend/src/routes/judgingRoutes.js`
- **IMPLEMENTATION STEP**: Implement scoring endpoint: a judge can only submit scores for an assigned project (`JudgeAssignment` exists matching `req.user.id` and `submissionId`). Implement strict isolation query: judges can only retrieve their own scores. Querying another judge's score returns 403 Forbidden or 404 Not Found.
- **TEST**: Supertest suite `tests/api/judgeIsolation.test.js`:
  - Judge A scores assigned project (200).
  - Judge A attempts to score unassigned project → rejected with 403.
  - Judge A requests scores submitted by Judge B → rejected with 403/404.
  - Participant attempts to call score API → rejected with 403.
- **ACCEPTANCE CONDITION**: 100% backend isolation of judge scoring data with Supertest proof.

#### REQ-T2-04: Mathematically Correct Z-Score Normalization Engine
- **CURRENT STATE**: Non-existent.
- **FILE(S)**:
  - `backend/src/services/normalizationService.js`
  - `backend/src/controllers/normalizationController.js`
  - `docs/JUDGING.md`
- **IMPLEMENTATION STEP**: Implement pure mathematical z-score normalization:
  1. For each judge $j$, compute mean $\mu_j$ and sample standard deviation $\sigma_j$ across all projects they scored.
  2. For each score $s_{j,p}$, compute standard score: $z_{j,p} = \frac{s_{j,p} - \mu_j}{\sigma_j}$.
  3. For each project $p$, compute final normalized score: $Z_p = \frac{1}{N_p} \sum_{j} z_{j,p}$.
  4. Edge case: if $\sigma_j = 0$ (judge gives identical scores to all projects), fall back safely to 0 (or normalized neutral offset) without division by zero.
  5. Handle incomplete batches cleanly.
- **TEST**: Jest unit test `tests/unit/normalization.test.js`:
  - Hand-calculated fixture verification (matches manual calculation to 4 decimal places).
  - Zero standard deviation judge does not throw error.
  - Incomplete review batches calculate average correctly.
- **ACCEPTANCE CONDITION**: Z-score calculation matches hand calculations exactly and is fully documented in `JUDGING.md`.

#### REQ-T2-05: Real-Time Judging Progress & Sanitized CSV Export
- **CURRENT STATE**: Non-existent.
- **FILE(S)**:
  - `backend/src/controllers/judgingController.js`
  - `backend/src/services/exportService.js`
- **IMPLEMENTATION STEP**: Provide organizer API returning completed vs. pending reviews per judge and per project. Implement CSV export using `json2csv` exporting project ranks, titles, teams, raw scores, and normalized z-scores. Ensure individual judge identities and isolated scores are omitted unless explicitly authorized.
- **TEST**: Supertest suite `tests/api/export.test.js`:
  - Organizer exports CSV (200, Content-Type: `text/csv`).
  - Participant or Judge denied CSV export (403).
  - CSV header and row content match database rankings.
- **ACCEPTANCE CONDITION**: Clean, accurate CSV export generated without data leakage.

---

### 4. P3: Acceptance Testing & Offline Reliability

#### REQ-P3-01: End-to-End Acceptance Suite
- **CURRENT STATE**: Non-existent.
- **FILE(S)**: `tests/acceptance/fullLifecycle.test.js`, `acceptance-report.txt`
- **IMPLEMENTATION STEP**: Write comprehensive Supertest acceptance scenario executing:
  Register Organizer → Create Event → Register Participants → Form Teams → Submit Projects → Lock at Deadline → Assign Judges → Submit Scores → Normalize Z-Scores → Publish Results → Query Public Gallery → Verify Security Invariants.
- **TEST**: `npm run test:acceptance`
- **ACCEPTANCE CONDITION**: All 8 primary acceptance conditions pass and output is written to `acceptance-report.txt`.

#### REQ-P3-02: Zero-Network Offline Operation
- **CURRENT STATE**: Non-existent.
- **FILE(S)**: `frontend/index.html`, `frontend/src/styles/fonts.css`
- **IMPLEMENTATION STEP**: Audit all frontend and backend dependencies. Bundle local web fonts and SVG icon sets. Verify zero runtime calls to external endpoints.
- **TEST**: Disconnect network / disable Wi-Fi, run `docker compose up`, and execute full user lifecycle in browser.
- **ACCEPTANCE CONDITION**: Complete platform runs offline with zero console network errors.

---

### 5. P4: T3 Security & Anti-Abuse

#### REQ-P4-01: Endpoint Rate Limiting
- **CURRENT STATE**: Non-existent.
- **FILE(S)**: `backend/src/middleware/rateLimiter.js`
- **IMPLEMENTATION STEP**: Configure `express-rate-limit` with tiered limits:
  - Auth routes: 15 requests per 15 minutes.
  - Voting routes: 10 requests per minute per IP/user.
  - Submissions: 30 requests per minute.
- **TEST**: Supertest test flooding auth endpoint verifies 429 Too Many Requests response.
- **ACCEPTANCE CONDITION**: Abuse-sensitive endpoints protected against brute-force and spam.

#### REQ-P4-02: Duplicate Account, Submission & Vote Detection
- **CURRENT STATE**: Non-existent.
- **FILE(S)**:
  - `backend/src/services/antiAbuseService.js`
  - `backend/src/controllers/adminController.js`
  - `backend/prisma/schema.prisma`
- **IMPLEMENTATION STEP**: Build heuristic anti-abuse analyzer:
  - Flags submissions with identical titles, repo URLs, or near-identical descriptions.
  - Flags accounts with matching IP/User-Agent patterns during voting.
  - Does NOT automatically disqualify; generates `AbuseFlag` records for organizer review.
- **TEST**: Supertest verifies suspicious duplicate submission creates review flag.
- **ACCEPTANCE CONDITION**: Flagged items surface in Organizer Control Room without disrupting innocent users.

#### REQ-P4-03: Append-Only Immutable Audit Log
- **CURRENT STATE**: Non-existent.
- **FILE(S)**:
  - `backend/src/middleware/auditLogger.js`
  - `backend/prisma/schema.prisma`
- **IMPLEMENTATION STEP**: Implement `AuditLog` model (`id`, `actorId`, `action`, `targetResource`, `targetId`, `ipAddress`, `metadata`, `timestamp`). No update or delete endpoints exposed. Intercept all mutations (team edits, deadline changes, judge assignments, score submissions, results publication).
- **TEST**: Verify audit record created on team creation and score submission; verify non-admin cannot view logs.
- **ACCEPTANCE CONDITION**: Complete tamper-evident audit trail accessible only to organizers.

#### REQ-P4-04: Server-Side Randomized Ballot Ordering
- **CURRENT STATE**: Non-existent.
- **FILE(S)**: `backend/src/controllers/judgingController.js`
- **IMPLEMENTATION STEP**: When a judge fetches assigned ballots, shuffle the ordering server-side based on a deterministic seed derived from `judgeId` and `event.id` (or cryptographically secure random sort per session). Never rely on client-side React array shuffling.
- **TEST**: Verify two distinct judges receive assigned projects in differing order.
- **ACCEPTANCE CONDITION**: Position bias mitigated through backend-enforced ballot permutation.

#### REQ-P4-05: Server-Enforced Hidden Results
- **CURRENT STATE**: Non-existent.
- **FILE(S)**:
  - `backend/src/controllers/votingController.js`
  - `backend/src/controllers/resultsController.js`
- **IMPLEMENTATION STEP**: Voting and score tally endpoints return 403 or omit aggregate counts if `event.status !== 'PUBLISHED'`. Participants can only see that their vote was recorded, not current standings.
- **TEST**: Supertest verifies participant cannot fetch live vote totals before event results are published.
- **ACCEPTANCE CONDITION**: Zero live tally leakage prior to official announcement.

---

### 6. P5: Frontend & Modern Spatial UX

#### REQ-P5-01: Dogfood Brand Identity & Design System
- **CURRENT STATE**: Non-existent.
- **FILE(S)**:
  - `frontend/src/index.css`
  - `frontend/tailwind.config.js`
  - `frontend/src/components/ui/*`
- **IMPLEMENTATION STEP**: Establish dark editorial tech aesthetic inspired by reference video:
  - Base palette: Deep charcoal/near-black (`#0a0b0e`), slate zinc borders (`#1e222a`), warm off-white text (`#f3f4f6`).
  - Accent: High-energy electric amber/orange (`#f97316` / `#ff5500`) for "BUILD / BREAK / SHIP / BITE" motifs.
  - Typography: Monospace accents (`JetBrains Mono`, `ui-monospace`) for metadata, clean sans (`Inter`, `system-ui`) for UI hierarchy.
  - Tactility: Hairline borders (`border border-white/10`), subtle cursor reactive glow, magnetic hover physics.
- **TEST**: Visual verification across desktop, tablet, and mobile breakpoints; reduced-motion query checks.
- **ACCEPTANCE CONDITION**: Design language feels like a premium hacker playground, completely distinct from generic SaaS.

#### REQ-P5-02: Interactive Landing & Platform Narrative
- **CURRENT STATE**: Non-existent.
- **FILE(S)**: `frontend/src/pages/LandingPage.jsx`
- **IMPLEMENTATION STEP**: Create non-traditional narrative landing page. Hero displays bold editorial typography ("BUILD. BREAK. SHIP. BITE."). User interaction/scroll reveals live seeded hackathon metrics, interactive project cards, and active stage telemetry.
- **TEST**: Verify interactive scroll transitions and navigation to register/gallery.
- **ACCEPTANCE CONDITION**: Immersive, memorable entry experience with zero layout shift.

#### REQ-P5-03: Participant Hackathon Journey Dashboard
- **CURRENT STATE**: Non-existent.
- **FILE(S)**: `frontend/src/pages/ParticipantDashboard.jsx`
- **IMPLEMENTATION STEP**: Build active stage progression tracker:
  `REGISTERED → TEAM FORMED → BUILDING → SHIPPED → JUDGING → RESULTS`.
  Prominently answers "What do I do next?". Displays live server-calculated countdown to submission deadline, team roster with copyable invite link, and instant submission status.
- **TEST**: Verify status transitions dynamically when user joins team or submits project.
- **ACCEPTANCE CONDITION**: Participant dashboard is unambiguous, focused, and responsive.

#### REQ-P5-04: "Ship It" Submission Studio
- **CURRENT STATE**: Non-existent.
- **FILE(S)**: `frontend/src/pages/SubmissionPage.jsx`
- **IMPLEMENTATION STEP**: Multi-step submission drafting studio. Real-time form autosaving. Multi-checkpoint pre-flight verification:
  - Project Title & Tagline Verified
  - Track Selected
  - Repository & Demo URLs Validated
  - Team Member Roster Confirmed
  - Server Deadline Checked
  Final "SHIP IT" action triggers atomic backend lock with celebratory visual feedback.
- **TEST**: Verify draft persistence across page reload; test locking behavior post-ship.
- **ACCEPTANCE CONDITION**: Submitting feels like shipping a real product; locks reliably.

#### REQ-P5-05: Spatial Project Gallery & Inspect Overlay
- **CURRENT STATE**: Non-existent.
- **FILE(S)**: `frontend/src/pages/GalleryPage.jsx`
- **IMPLEMENTATION STEP**: Public project explorer with instant client-side search, track filters, and interactive project cards with pointer-following subtle illumination. Clicking a project expands into an immersive preview displaying demo links, media, and team credits.
- **TEST**: Test filter switching, search query matching, modal expansion, keyboard navigation (`Esc` to close).
- **ACCEPTANCE CONDITION**: Highly interactive, responsive gallery with full accessibility.

#### REQ-P5-06: High-Efficiency Judge Console
- **CURRENT STATE**: Non-existent.
- **FILE(S)**: `frontend/src/pages/JudgeConsolePage.jsx`
- **IMPLEMENTATION STEP**: Single-project evaluation interface designed for maximum judging speed:
  - Left panel: Project preview, repo link, video demo, tech stack, team details.
  - Right panel: Interactive rubric sliders/buttons with real-time weighted score calculation.
  - Top bar: Progress indicator (e.g., `Project 3 of 8`), `← Previous` / `Next →` buttons and keyboard bindings.
  - Instant score autosave with visual confirmation badge ("SAVED").
- **TEST**: Evaluate project with keyboard shortcuts; verify scores save to backend and survive page refresh.
- **ACCEPTANCE CONDITION**: Judges can evaluate a project in seconds with zero friction.

#### REQ-P5-07: Organizer Control Room
- **CURRENT STATE**: Non-existent.
- **FILE(S)**: `frontend/src/pages/OrganizerControlRoom.jsx`
- **IMPLEMENTATION STEP**: Tactical command center answering "What needs my attention?":
  - Live judging progress matrix (assigned vs. completed).
  - Round-robin trigger button with confirmation modal.
  - Normalization execution button with instant preview table.
  - Duplicate detection review queue (Flagged Submissions).
  - Real-time audit log stream.
  - One-click sanitized CSV export.
- **TEST**: Execute round-robin assignment, trigger normalization, review flags, export CSV.
- **ACCEPTANCE CONDITION**: Complete hackathon administration manageable from a single cohesive panel.

#### REQ-P5-08: Results Reveal Ceremony
- **CURRENT STATE**: Non-existent.
- **FILE(S)**: `frontend/src/pages/ResultsPage.jsx`
- **IMPLEMENTATION STEP**: Dramatic podium reveal for published hackathons. Shows top winners, track prizes, and transparent score breakdowns (Raw Average vs. Normalized Z-Score) with explanatory mathematical tooltips.
- **TEST**: Verify unauthenticated user sees published results; verify unpublished event displays "Judging In Progress".
- **ACCEPTANCE CONDITION**: Exciting, polished reveal experience grounded in mathematical normalization.

---

## Phase Gate Execution Sequence

| Phase | Description | Deliverables | Verification Gate |
|---|---|---|---|
| **Phase 0** | Repo & Specification Audit | `ANTIGRAVITY_AUDIT.md`, `IMPLEMENTATION_PLAN.md` | Audit complete; user sends `CONTINUE` |
| **Phase 1** | Baseline Environment & Project Scaffolding | Node.js installation, root package.json, Dockerfile, Compose | `npm test` runs; containers build |
| **Phase 2** | Database, Prisma Schema & Deterministic Seed | `schema.prisma`, migrations, `seed.js` with fixture data | Database migrates & seeds deterministically |
| **Phase 3** | Authentication Engine | JWT, bcrypt, `authController.js`, auth routes | Supertest auth suite 100% passing |
| **Phase 4** | Roles & RBAC Middleware | `roles.js`, 5 roles enforced | Supertest RBAC suite 100% passing |
| **Phase 5** | Event Management API | Event CRUD, tracks, prizes, deadline dates | Supertest event suite 100% passing |
| **Phase 6** | Team Formation & Invites | Team CRUD, secure invite tokens, roster limits | Supertest team suite 100% passing |
| **Phase 7** | Submissions Studio & Server Deadlines | Draft persistence, "Ship It" atomic lock, deadline middleware | Supertest deadline & lock suite passing |
| **Phase 8** | Public Gallery API | Public submissions query, search, track filter, data sanitization | Supertest gallery suite passing |
| **Phase 9** | T1 Acceptance Testing | Automated T1 lifecycle verification suite | All T1 requirements green |
| **Phase 10** | Round-Robin Judge Assignment | `assignmentService.js`, balanced distribution | Unit & API tests passing |
| **Phase 11** | Rubrics & Score Ingestion | Weighted criteria validation, score ranges | Unit & API tests passing |
| **Phase 12** | Backend Judge Isolation (T2.03) | Strict score access controls (403/404 on cross-judge access) | Supertest isolation tests passing |
| **Phase 13** | Mathematical Z-Score Normalization | Normalization engine, zero-stddev handling, tests | Hand-calculated tests matching exactly |
| **Phase 14** | Judging Progress & CSV Export | Progress API, `json2csv` export | Exported CSV verified against DB |
| **Phase 15** | T2 Acceptance Testing | Automated T2 lifecycle verification suite | All T2 requirements green |
| **Phase 16** | T3 Rate Limiting | `express-rate-limit` on sensitive routes | Brute-force flood tests return 429 |
| **Phase 17** | T3 Duplicate & Anti-Abuse Detection | Submissions/voting pattern heuristics, review queue | Flag creation verified |
| **Phase 18** | Immutable Audit Logging | `AuditLog` interceptor, append-only persistence | Mutation auditing verified |
| **Phase 19** | Randomized Ballot Ordering | Server-side per-judge ballot permutation | Differing judge ballot orders confirmed |
| **Phase 20** | Hidden Results Enforcement | Strict masking of voting tallies until published | Leakage tests pass |
| **Phase 21** | T3 Security Testing | Full security & anti-abuse automated suite | All T3 requirements green |
| **Phase 22** | Frontend Architecture & Client Scaffolding | Vite, React 18, React Router, centralized API client | App shell mounts cleanly |
| **Phase 23** | Design System & Visual Primitives | Dark editorial aesthetic, Tailwind styling, buttons, inputs | Primitives render consistently |
| **Phase 24** | Interactive Landing Experience | Hero typography, spatial scroll reveal | Interactive landing verified |
| **Phase 25** | Authentication UI | Login & Register pages, JWT storage, role routing | Auth flow functional in browser |
| **Phase 26** | Participant Journey Dashboard | Stepper tracker, real-time deadline countdown | Dynamic stage updates verified |
| **Phase 27** | Team Formation UI | Team creation, invite copy, roster management | Team flow functional in browser |
| **Phase 28** | "Ship It" Submission Studio | Draft autosave, checklist verification, lock animation | Project ships and locks in browser |
| **Phase 29** | Interactive Public Gallery | Spatial card grid, search, filter, expand modal | Gallery search/filter verified |
| **Phase 30** | High-Efficiency Judge Console | Project preview, rubric sliders, keyboard navigation | Keyboard evaluation workflow verified |
| **Phase 31** | Organizer Control Room | Assignments, progress matrix, flags, audit log, export | Control room fully operational |
| **Phase 32** | Results Reveal Ceremony | Podium reveal, normalized z-score tooltips | Results ceremony verified |
| **Phase 33** | Microinteractions & Motion Polish | Cursor glow, card tilt, button feedback, reduced-motion | 60fps performance verified |
| **Phase 34** | Responsive & Accessibility Audit | Mobile/tablet testing, WCAG AA contrast, screen reader labels | a11y tests green |
| **Phase 35** | Full Frontend-Backend Integration | End-to-end user journeys connected | All screens wired to live APIs |
| **Phase 36** | Adversarial Loophole Audit | BOLA, tampering, replay, deadline race checks | Penetration audit clean |
| **Phase 37** | Performance Audit | Lighthouse / bundle size / DOM count checks | Fast load & snappy response |
| **Phase 38** | Offline Docker Verification | Network OFF, `docker compose up` test | Runs completely offline |
| **Phase 39** | Full Acceptance Suite Verification | Commit `acceptance-report.txt` | 100% acceptance suite passing |
| **Phase 40** | Documentation Synchronization | Sync `README.md`, `ARCHITECTURE.md`, `DATA-MODEL.md`, `JUDGING.md` | Docs match actual implementation |
| **Phase 41** | Final Demo Rehearsal | 5-minute full lifecycle walk-through | Flawless demo flow |
| **Phase 42** | Final Pre-Submission Audit | Final verification against all master instructions | Ready for delivery |

---
*Implementation Plan Certified for Phase 0.*

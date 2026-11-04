# SPEC-001 — Foundation & Infrastructure

**Module:** 001-foundation  
**Version:** 1.0.0  
**Date:** 2026-11-04  
**Status:** Approved

---

## 1. Objective

Establish the full technical foundation: Docker Compose infrastructure, NestJS backend skeleton, Next.js frontend skeleton, database, queue, and observability — such that all subsequent modules can be built on top of it.

## 2. Functional Description

The foundation provides:
- A running PostgreSQL database accessible to the backend via Prisma.
- A running Redis instance for BullMQ job queues.
- A NestJS API with health check, Swagger docs, auth module scaffold, and global exception handling.
- A Next.js 15 frontend with layout, navigation scaffold, and design system wired up.
- A scanner service container stub (ClamAV installed, ready for use in Phase 4).
- Environment variable management with `.env.example`.
- A single `docker compose up` command that starts everything.

## 3. Scope

Included:
- Docker Compose configuration for all services.
- NestJS project with modules: `auth`, `health`, `config`.
- Next.js 15 project with shadcn/ui setup.
- Prisma schema (User, Analysis base models).
- BullMQ queue service wiring.
- Logging (pino).
- Swagger configuration.
- Initial database migration.
- Health endpoint.
- Backend unit test setup (Jest).
- Frontend unit test setup (Vitest).

Excluded:
- Any analysis-specific business logic (covered in Phases 3–7).
- Dashboard data (covered in Phase 2).

## 4. Users Involved

- TIC Administrator (operator who runs `docker compose up`).

## 5. User Stories

**US-FOUND-001:** As the administrator, I want to start the entire platform with a single command so that I don't need to manage individual services manually.

**US-FOUND-002:** As the administrator, I want a health check endpoint so that I can verify the system is running correctly.

**US-FOUND-003:** As the administrator, I want to log in with a username and password so that unauthorized access is prevented.

## 6. Functional Requirements

**FR-FOUND-001:** The system must start all services (frontend, backend, PostgreSQL, Redis, scanner) with `docker compose up`.  
**FR-FOUND-002:** The backend must expose `GET /api/health` returning `{ status: "ok", timestamp, services: { db, redis } }`.  
**FR-FOUND-003:** The backend must expose Swagger UI at `/api/docs` in development mode.  
**FR-FOUND-004:** The backend must implement JWT-based authentication with login and logout endpoints.  
**FR-FOUND-005:** The backend must apply a global exception filter returning structured error responses.  
**FR-FOUND-006:** The frontend must render a layout with sidebar navigation and main content area.  
**FR-FOUND-007:** The Prisma schema must define User and Analysis models with their base fields.  
**FR-FOUND-008:** Initial database migration must run automatically on first startup.

## 7. Non-Functional Requirements

**NFR-FOUND-001:** All services must be bound to `127.0.0.1` only.  
**NFR-FOUND-002:** Backend and frontend must compile with TypeScript strict mode, zero errors.  
**NFR-FOUND-003:** ESLint must pass with zero errors on initial scaffold.  
**NFR-FOUND-004:** `docker compose up` must complete startup within 120 seconds on first run.

## 8. Security Requirements

**SEC-FOUND-001:** Database password, JWT secret, and all credentials must be in `.env`, never committed.  
**SEC-FOUND-002:** JWT tokens stored in httpOnly, SameSite=Strict cookies.  
**SEC-FOUND-003:** Default admin credentials must be changed on first setup (documented in START.md).  
**SEC-FOUND-004:** PostgreSQL and Redis must not be exposed on host-reachable ports in production mode.

## 9. API Contracts

### GET /api/health
```json
Response 200:
{
  "status": "ok",
  "timestamp": "2026-11-04T10:00:00.000Z",
  "services": {
    "database": "ok",
    "redis": "ok"
  }
}
```

### POST /api/v1/auth/login
```json
Request: { "email": "admin@centinela.local", "password": "string" }
Response 200: { "user": { "id", "email", "role" } }
// JWT set in httpOnly cookie
```

### POST /api/v1/auth/logout
```json
Response 200: { "message": "Logged out" }
// Cookie cleared
```

### GET /api/v1/auth/me
```json
Response 200: { "id", "email", "role" }
```

## 10. Acceptance Criteria

**AC-FOUND-001:** `docker compose up` starts all services without errors.  
**AC-FOUND-002:** `GET http://localhost:3001/api/health` returns 200 with `status: "ok"`.  
**AC-FOUND-003:** `http://localhost:3000` renders the application layout.  
**AC-FOUND-004:** `http://localhost:3001/api/docs` renders Swagger UI.  
**AC-FOUND-005:** Login with valid credentials returns a JWT cookie and 200.  
**AC-FOUND-006:** Login with invalid credentials returns 401.  
**AC-FOUND-007:** TypeScript compiles with zero errors (backend + frontend).  
**AC-FOUND-008:** ESLint passes with zero errors (backend + frontend).

## 11. Test Cases

**TEST-FOUND-001:** Health endpoint returns 200 when all services are up.  
**TEST-FOUND-002:** Health endpoint returns degraded status when database is down.  
**TEST-FOUND-003:** Login with correct credentials → 200 + cookie set.  
**TEST-FOUND-004:** Login with wrong password → 401.  
**TEST-FOUND-005:** Protected endpoint without token → 401.  
**TEST-FOUND-006:** Protected endpoint with valid token → 200.

## 12. Dependencies

- Docker Desktop with WSL2 (confirmed present).
- Node.js 24 (confirmed present).
- npm 12 (confirmed present).

## 13. Implementation Tasks

- TASK-001: Create `docker-compose.yml` with all services.
- TASK-002: Scaffold NestJS backend with TypeScript.
- TASK-003: Configure Prisma with PostgreSQL, define base schema.
- TASK-004: Implement health module.
- TASK-005: Implement auth module (JWT, bcrypt, login/logout/me).
- TASK-006: Configure global exception filter.
- TASK-007: Configure Swagger.
- TASK-008: Configure pino logging.
- TASK-009: Configure BullMQ module.
- TASK-010: Scaffold Next.js 15 frontend with TypeScript.
- TASK-011: Install and configure shadcn/ui, Tailwind CSS.
- TASK-012: Create base layout (sidebar + main content).
- TASK-013: Create `.env.example`.
- TASK-014: Create `START.md` with setup instructions.
- TASK-015: Write unit tests for auth module.
- TASK-016: Write integration tests for health endpoint.

## 14. Definition of Done

All acceptance criteria in §10 verified. All tests in §11 passing. TypeScript + ESLint clean. Phase 1 quality gate in QUALITY_GATE.md updated to PASSED.

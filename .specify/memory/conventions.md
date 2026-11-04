# CENTINELA TIC — Development Conventions

## Identifier Schema

| Prefix | Meaning | Example |
|--------|---------|---------|
| FR | Functional Requirement | FR-EMAIL-001 |
| NFR | Non-Functional Requirement | NFR-PERF-001 |
| SEC | Security Requirement | SEC-FILE-001 |
| US | User Story | US-EMAIL-001 |
| AC | Acceptance Criteria | AC-EMAIL-001 |
| TEST | Test Case | TEST-EMAIL-001 |
| TASK | Implementation Task | TASK-001 |
| DEC | Decision Log Entry | DEC-001 |

## File Naming

- Spec files: `spec.md` inside each module folder under `.specify/specs/`
- Components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts`
- Services: `kebab-case.service.ts`
- Controllers: `kebab-case.controller.ts`
- DTOs: `kebab-case.dto.ts`
- Prisma models: `PascalCase`

## Git

- Branch: `main` (single branch for local development)
- Commits: Conventional Commits — `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
- No force-push to main without explicit authorization.

## TypeScript

- `strict: true` everywhere.
- No `any` — use `unknown` and narrow.
- Explicit return types on all public functions.
- Zod for all external input validation.

## API Design

- REST, versioned at `/api/v1/`
- Consistent response envelope: `{ data, meta?, error? }`
- HTTP status codes used semantically.
- Swagger docs auto-generated via NestJS decorators.

## Error Handling

- Backend: global exception filter, structured JSON errors.
- Frontend: error boundaries per route segment.
- Never expose stack traces to the client in production.

## Logging

- Structured JSON logs (pino).
- Log levels: `error`, `warn`, `info`, `debug`.
- Every analysis operation logs: `analysisId`, `type`, `inputHash`, `startedAt`, `completedAt`, `result`.

## Security

- All file uploads validated (magic bytes + MIME + extension).
- Max upload size: 50MB (configurable).
- Files stored in an isolated temp directory, never in the web root.
- Passwords hashed with bcrypt (cost ≥ 12).
- JWT for session management, stored in httpOnly cookies.
- CSRF protection on all state-changing endpoints.

## Testing

- Unit: Vitest (frontend), Jest (backend).
- Integration: Supertest (backend API).
- E2E: Playwright (key flows only).
- Test files colocated: `*.spec.ts` / `*.test.ts`.
- Coverage threshold: 80% for backend services.

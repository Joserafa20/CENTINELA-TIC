# CENTINELA TIC — Security Policy

**Version:** 1.0.0  
**Date:** 2026-11-04

---

## 1. Threat Model

### Assets
- Uploaded files (may contain malware).
- Uploaded emails (may contain sensitive institutional information).
- Analysis results and reports.
- API keys for external services.
- Administrator credentials.

### Threat Actors
- Malicious files attempting to escape the analysis sandbox.
- Crafted inputs attempting to exploit parsers (ZIP bombs, path traversal, etc.).
- Local attackers on the same host attempting privilege escalation.

### Trust Boundary
- **Trusted:** Administrator browser on localhost.
- **Untrusted:** All uploaded content, all external API responses.

---

## 2. Security Requirements

### SEC-UPLOAD
- SEC-UPLOAD-001: Every uploaded file must be validated by magic bytes before processing.
- SEC-UPLOAD-002: Files exceeding 50MB are rejected before entering the pipeline.
- SEC-UPLOAD-003: Only whitelisted extensions are accepted per module.
- SEC-UPLOAD-004: Files are stored with a SHA-256 hash as filename, never the original filename.
- SEC-UPLOAD-005: Uploaded files are stored outside the web-accessible root.

### SEC-ARCHIVE
- SEC-ARCHIVE-001: ZIP extraction depth is limited to 5 levels.
- SEC-ARCHIVE-002: Total extracted size is limited to 200MB.
- SEC-ARCHIVE-003: Maximum number of extracted files: 1000.
- SEC-ARCHIVE-004: Extraction timeout: 30 seconds.
- SEC-ARCHIVE-005: Extracted files land on a tmpfs volume; they are never persisted.
- SEC-ARCHIVE-006: Extracted files are never executed.
- SEC-ARCHIVE-007: Path traversal attempts (entries with `../`) cause immediate rejection.
- SEC-ARCHIVE-008: Passwords for encrypted archives are accepted from analyst input, never stored in plaintext.

### SEC-CONTAINER
- SEC-CONTAINER-001: Scanner container runs as UID 1001 (non-root).
- SEC-CONTAINER-002: Scanner container has no outbound network access.
- SEC-CONTAINER-003: Scanner container is read-only except for tmpfs scratch.
- SEC-CONTAINER-004: CPU limit: 1 core. Memory limit: 512MB.
- SEC-CONTAINER-005: `no-new-privileges` security option enabled.

### SEC-API
- SEC-API-001: All state-changing endpoints require valid JWT.
- SEC-API-002: CORS restricted to `http://localhost:3000`.
- SEC-API-003: Rate limiting: 100 requests/minute per IP for analysis endpoints.
- SEC-API-004: All inputs validated with class-validator + Zod before processing.
- SEC-API-005: Stack traces never returned to client in any environment.

### SEC-DATA
- SEC-DATA-001: Passwords hashed with bcrypt, cost factor ≥ 12.
- SEC-DATA-002: JWT tokens stored in httpOnly, SameSite=Strict cookies.
- SEC-DATA-003: API keys encrypted (AES-256-GCM) before storage in database.
- SEC-DATA-004: Database port not exposed outside Docker internal network.

### SEC-SSRF
- SEC-SSRF-001: URL analysis never fetches the target URL automatically.
- SEC-SSRF-002: Threat intel queries accept only normalized indicators (hash, domain, IP, URL string) — never raw user input forwarded directly.
- SEC-SSRF-003: Private/internal IP ranges blocked from URL analysis requests.

---

## 3. Incident Response (Analyst Guidance)

If an analysis reveals a confirmed threat:
1. The file/email is quarantined (marked in DB, flagged for review).
2. The analyst generates a PDF report.
3. The report is stored locally; never automatically shared externally.
4. The analyst decides whether to escalate.

CENTINELA TIC does not take automated remediation actions.

# SPEC-009 — Configuration & Security Audit

**Module:** 009-security-audit  
**Version:** 1.0.0  
**Date:** 2026-11-04  
**Status:** Approved

---

## 1. Objective

Provide administrator-facing configuration management (API keys, ClamAV, YARA rules, storage policies), user authentication management, and a complete audit log of all platform activities.

## 2. Functional Requirements

**FR-CONF-001:** Administrator can configure API keys for VirusTotal, URLhaus, Google Safe Browsing.  
**FR-CONF-002:** Administrator can view ClamAV version and database update status.  
**FR-CONF-003:** Administrator can upload and manage custom YARA rules.  
**FR-CONF-004:** Administrator can configure storage retention policies (auto-delete after N days).  
**FR-CONF-005:** Administrator can view audit log: timestamp, user, action, resource, metadata.  
**FR-CONF-006:** Administrator can filter and export audit log.  
**FR-CONF-007:** Administrator can change their password.  
**FR-CONF-008:** System records every analysis action, login, logout, config change, and report generation in the audit log.

## 3. Security Requirements

**SEC-CONF-001:** API keys displayed only partially (last 4 chars) in UI; full key accessible only at time of entry.  
**SEC-CONF-002:** Password change requires current password verification.  
**SEC-CONF-003:** YARA rule uploads validated before loading (syntax check, size limit 1MB per file).  
**SEC-CONF-004:** Audit log is append-only — no edit or delete via UI.  
**SEC-CONF-005:** All configuration changes logged in audit log.

## 4. API Contracts

### GET /api/v1/config/providers
### PUT /api/v1/config/providers/:name  — sets API key (encrypted)
### DELETE /api/v1/config/providers/:name — removes API key

### GET /api/v1/config/clamav  — returns version + db date
### POST /api/v1/config/clamav/update  — triggers freshclam update

### GET /api/v1/config/yara-rules  — list uploaded rules
### POST /api/v1/config/yara-rules  — upload rule file
### DELETE /api/v1/config/yara-rules/:id

### GET /api/v1/audit-log  — paginated, filterable
### GET /api/v1/audit-log/export  — CSV

### POST /api/v1/auth/change-password

## 5. Acceptance Criteria

**AC-CONF-001:** API key saved → returned as masked in GET.  
**AC-CONF-002:** YARA rule uploaded → applied to next file analysis.  
**AC-CONF-003:** Invalid YARA syntax rejected with error.  
**AC-CONF-004:** Audit log shows login event after successful login.  
**AC-CONF-005:** Audit log shows analysis started/completed events.  
**AC-CONF-006:** Password change with wrong current password returns 401.

## 6. Implementation Tasks

- TASK-130: Create config NestJS module.
- TASK-131: Implement API key storage with AES-256-GCM encryption.
- TASK-132: Implement ClamAV status endpoint.
- TASK-133: Implement YARA rule management (upload, validate, store).
- TASK-134: Implement audit log service (append-only).
- TASK-135: Create audit log endpoint with filters.
- TASK-136: Implement retention policy enforcement (scheduled job).
- TASK-137: Create frontend settings page.
- TASK-138: Create frontend audit log viewer.
- TASK-139: Write unit + integration tests.

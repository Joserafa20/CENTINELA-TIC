# SPEC-003 — Email Analyzer

**Module:** 003-email-analysis  
**Version:** 1.0.0  
**Date:** 2026-11-04  
**Status:** Approved

---

## 1. Objective

Enable analysts to upload suspicious emails (EML, MSG, TXT) and receive a detailed technical analysis of their headers, authentication results, embedded URLs, attachments, and phishing indicators.

## 2. Functional Description

The analyst uploads an email file. The system parses its MIME structure, extracts all headers and authentication records, identifies embedded URLs and attachments, evaluates authentication (SPF, DKIM, DMARC, ARC), scores the email against a phishing indicator ruleset, and returns a structured result with risk classification.

## 3. Scope

Included:
- File upload and validation (EML, MSG, TXT; max 10MB).
- MIME parsing and structure extraction.
- Header extraction (all standard and security headers).
- Authentication analysis: SPF, DKIM, DMARC, ARC.
- URL extraction from body (plain and HTML).
- Attachment identification (name, type, hash — not deep analysis here; queued for Module 04).
- Phishing indicator detection (social engineering language, urgency, credential requests, impersonation indicators).
- Risk classification engine.
- Results display with expandable sections.
- Persist result to database.
- Link to file analyzer for attachments.

Excluded:
- Deep file analysis of attachments (Module 04).
- Threat intel enrichment of URLs (Module 07).

## 4. User Stories

**US-EMAIL-001:** As the analyst, I want to upload an EML file and receive a parsed breakdown of all headers so that I can understand the email's routing and authentication.  
**US-EMAIL-002:** As the analyst, I want to see SPF, DKIM, and DMARC results clearly labeled so that I can assess email authentication without reading raw headers.  
**US-EMAIL-003:** As the analyst, I want to see all URLs extracted from the email so that I can decide which ones to analyze further.  
**US-EMAIL-004:** As the analyst, I want to see a risk classification with explanation so that I can prioritize my response.

## 5. Functional Requirements

**FR-EMAIL-001:** The system must accept EML, MSG, and TXT file uploads (max 10MB).  
**FR-EMAIL-002:** The system must extract: From, To, CC, BCC, Reply-To, Return-Path, Subject, Date, Message-ID, all Received headers, Authentication-Results, DKIM-Signature, Received-SPF, ARC headers.  
**FR-EMAIL-003:** The system must parse authentication headers and report SPF result as: PASS | FAIL | SOFTFAIL | NEUTRAL | NONE | PERMERROR | TEMPERROR.  
**FR-EMAIL-004:** The system must parse DKIM-Signature and report: PASS | FAIL | NONE | SYNTAX_ERROR.  
**FR-EMAIL-005:** The system must parse DMARC policy and result: PASS | FAIL | NONE.  
**FR-EMAIL-006:** The system must extract all URLs from plain text and HTML body.  
**FR-EMAIL-007:** The system must identify all MIME attachments with: filename, MIME type, size, SHA-256 hash.  
**FR-EMAIL-008:** The system must check: Reply-To ≠ From domain (indicator), Return-Path ≠ From domain (indicator), display name ≠ actual address.  
**FR-EMAIL-009:** The system must detect social engineering language patterns (urgency keywords, credential request keywords) and flag them as indicators, not as confirmed malicious.  
**FR-EMAIL-010:** The system must classify risk as: CRITICAL | HIGH | MEDIUM | LOW | CLEAN | INCONCLUSIVE based on documented rules.  
**FR-EMAIL-011:** The system must never classify an email as CLEAN solely because SPF/DKIM/DMARC pass.  
**FR-EMAIL-012:** The result must be persisted to the database with full structured output.

## 6. Risk Classification Rules

| Condition | Risk |
|-----------|------|
| Authentication FAIL + credential request keyword | CRITICAL |
| Authentication FAIL + Reply-To/Return-Path mismatch + suspicious domain | HIGH |
| Authentication FAIL or NONE + no other indicators | MEDIUM |
| All auth PASS + Reply-To mismatch | MEDIUM |
| All auth PASS + no indicators | LOW (not CLEAN — absence of detection ≠ safe) |
| Parse failed or format unsupported | INCONCLUSIVE |

Rules are documented in `backend/src/modules/email/risk-engine/rules.ts`.

## 7. Security Requirements

**SEC-EMAIL-001:** Uploaded files validated by magic bytes and extension before parsing.  
**SEC-EMAIL-002:** File stored in isolated temp directory, cleaned up after analysis.  
**SEC-EMAIL-003:** HTML body rendered only in a sandboxed display (no inline execution).  
**SEC-EMAIL-004:** URLs extracted but never fetched automatically.

## 8. API Contracts

### POST /api/v1/email-analysis
```
Content-Type: multipart/form-data
Body: file (EML|MSG|TXT, max 10MB)

Response 202:
{ "analysisId": "uuid", "status": "PROCESSING" }
```

### GET /api/v1/email-analysis/:id
```json
Response 200:
{
  "id": "uuid",
  "status": "COMPLETED",
  "riskLevel": "HIGH",
  "riskExplanation": "Authentication failed: SPF FAIL. Reply-To domain differs from From domain.",
  "headers": {
    "from": "support@bank.com",
    "replyTo": "attacker@evil.com",
    "subject": "Urgent: Verify your account",
    "spf": "fail",
    "dkim": "none",
    "dmarc": "fail"
  },
  "urls": ["https://evil.com/login"],
  "attachments": [
    { "filename": "invoice.pdf", "mimeType": "application/pdf", "sha256": "abc...", "size": 102400 }
  ],
  "indicators": [
    { "id": "IND-001", "type": "AUTH_FAIL", "description": "SPF check failed", "severity": "HIGH" },
    { "id": "IND-002", "type": "REPLY_TO_MISMATCH", "description": "Reply-To domain differs from From", "severity": "MEDIUM" }
  ]
}
```

## 9. Acceptance Criteria

**AC-EMAIL-001:** System extracts correct From, To, Subject, Date from a valid EML file.  
**AC-EMAIL-002:** System correctly identifies SPF FAIL in a crafted test email.  
**AC-EMAIL-003:** System correctly identifies DKIM PASS in a signed test email.  
**AC-EMAIL-004:** System extracts all URLs from an HTML email body.  
**AC-EMAIL-005:** System identifies all attachments with correct MIME type and SHA-256.  
**AC-EMAIL-006:** An email with SPF FAIL + credential keyword is classified HIGH or CRITICAL.  
**AC-EMAIL-007:** An email with all auth PASS is NOT classified CLEAN — classified LOW minimum.  
**AC-EMAIL-008:** A malformed EML file returns INCONCLUSIVE, not an error 500.  
**AC-EMAIL-009:** Result is persisted and retrievable via GET endpoint.

## 10. Test Cases

**TEST-EMAIL-001:** Parse headers from a known EML fixture — verify From, To, Subject, Date.  
**TEST-EMAIL-002:** Parse SPF FAIL from authentication headers.  
**TEST-EMAIL-003:** Parse DKIM PASS from DKIM-Signature header.  
**TEST-EMAIL-004:** Extract 3 URLs from an HTML body fixture.  
**TEST-EMAIL-005:** Identify 1 attachment with correct filename and SHA-256.  
**TEST-EMAIL-006:** Risk engine: SPF FAIL + "verify your account" → HIGH.  
**TEST-EMAIL-007:** Risk engine: SPF PASS + DKIM PASS + DMARC PASS → LOW (not CLEAN).  
**TEST-EMAIL-008:** Malformed EML → INCONCLUSIVE.  
**TEST-EMAIL-009:** Upload endpoint rejects files > 10MB.  
**TEST-EMAIL-010:** Upload endpoint rejects non-EML/MSG/TXT files.

## 11. Dependencies

- SPEC-001 (foundation) VALIDATED.
- Library: `mailparser` (npm) for EML/MSG parsing.
- Library: `node-forge` or native crypto for SHA-256.

## 12. Implementation Tasks

- TASK-030: Install and configure `mailparser`.
- TASK-031: Create email analysis NestJS module.
- TASK-032: Create file upload endpoint with validation.
- TASK-033: Implement MIME parser service.
- TASK-034: Implement header extraction service.
- TASK-035: Implement authentication analysis service (SPF, DKIM, DMARC, ARC).
- TASK-036: Implement URL extractor service.
- TASK-037: Implement attachment identifier service.
- TASK-038: Implement phishing indicator detection service.
- TASK-039: Implement risk classification engine.
- TASK-040: Create Prisma models for EmailAnalysis.
- TASK-041: Create analysis result GET endpoint.
- TASK-042: Create frontend upload page.
- TASK-043: Create results display components.
- TASK-044: Create EML test fixtures.
- TASK-045: Write unit tests for all services.
- TASK-046: Write integration tests for endpoints.

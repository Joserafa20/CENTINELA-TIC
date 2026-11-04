# SPEC-008 — Reports & History

**Module:** 008-reports  
**Version:** 1.0.0  
**Date:** 2026-11-04  
**Status:** Approved

---

## 1. Objective

Enable generation of institutional PDF technical reports from analysis results, and provide a searchable, filterable history of all past analyses with export capability.

## 2. Functional Requirements — Reports

**FR-RPT-001:** Generate PDF report from any completed analysis.  
**FR-RPT-002:** Report must include: cover page, analysis identification, date, responsible analyst, methodology, analyzed object, results, evidence, indicators, risk classification, conclusions, recommendations.  
**FR-RPT-003:** Report must have institutional presentation (TIC Coordination Unit branding).  
**FR-RPT-004:** PDF generated server-side, never in the browser.  
**FR-RPT-005:** Report stored locally; never automatically sent externally.  
**FR-RPT-006:** Report downloadable via authenticated endpoint.  

## 3. Functional Requirements — History

**FR-HIST-001:** Display paginated list of all analyses: id, date, type, input name, risk level, status.  
**FR-HIST-002:** Support filters: date range, type, risk level, status.  
**FR-HIST-003:** Support text search by input name or hash.  
**FR-HIST-004:** Support navigation to full analysis result from history.  
**FR-HIST-005:** Support CSV export of filtered results.  
**FR-HIST-006:** Display indicators of compromise (IOCs) associated with each analysis.

## 4. API Contracts

### POST /api/v1/reports/generate
```json
Request: { "analysisId": "uuid", "analystName": "string", "notes": "string?" }
Response 200: { "reportId": "uuid", "downloadUrl": "/api/v1/reports/uuid/download" }
```

### GET /api/v1/reports/:id/download
Returns: PDF file (application/pdf)

### GET /api/v1/analyses (History)
```
Query params: page, limit, type, riskLevel, status, from, to, search
Response 200: { data: [...], meta: { total, page, limit } }
```

### GET /api/v1/analyses/:id/iocs
```json
Response 200:
{
  "iocs": [
    { "type": "HASH", "value": "abc...", "context": "File SHA-256" },
    { "type": "URL", "value": "https://evil.com", "context": "Found in email body" },
    { "type": "DOMAIN", "value": "evil.com", "context": "Reply-To domain" }
  ]
}
```

## 5. Acceptance Criteria

**AC-RPT-001:** PDF generated for a completed email analysis contains all required sections.  
**AC-RPT-002:** PDF generated for a completed file analysis contains SHA-256 and ClamAV results.  
**AC-RPT-003:** History list is paginated, 20 items per page default.  
**AC-RPT-004:** Filter by risk level HIGH returns only HIGH analyses.  
**AC-RPT-005:** CSV export contains all columns and correct data.  
**AC-RPT-006:** IOC list extracted correctly from analysis result.

## 6. Test Cases

**TEST-RPT-001:** Generate PDF from fixture email analysis → PDF contains correct sections.  
**TEST-RPT-002:** Generate PDF from fixture file analysis → PDF contains SHA-256 and ClamAV.  
**TEST-RPT-003:** History filtered by type=EMAIL returns only email analyses.  
**TEST-RPT-004:** CSV export matches filtered result count.  
**TEST-RPT-005:** IOCs extracted from analysis with known indicators.

## 7. Dependencies

- SPEC-001 through SPEC-007 (all analyses must exist before generating reports).
- Library: `puppeteer` or `@react-pdf/renderer` for PDF generation. Decision: `puppeteer` (server-side, full layout control). Documented in DEC-006.

## 8. Implementation Tasks

- TASK-115: Create reports NestJS module.
- TASK-116: Implement PDF template (HTML → Puppeteer → PDF).
- TASK-117: Create report download endpoint.
- TASK-118: Implement IOC extractor service.
- TASK-119: Create history endpoint with filters, search, pagination.
- TASK-120: Implement CSV export.
- TASK-121: Create frontend history page (TanStack Table + filters).
- TASK-122: Create frontend report preview and download.
- TASK-123: Write unit + integration tests.

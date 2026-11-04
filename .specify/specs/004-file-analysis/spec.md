# SPEC-004 — File Analyzer

**Module:** 004-file-analysis  
**Version:** 1.0.0  
**Date:** 2026-11-04  
**Status:** Approved

---

## 1. Objective

Enable static analysis of potentially malicious files using ClamAV, YARA rules, SHA-256 hashing, format-specific inspection, and safe handling of password-protected archives — all within an isolated container environment.

## 2. Functional Description

The analyst uploads a file. The system validates it, computes its SHA-256, identifies its true type via magic bytes, dispatches it to the scanner container, and returns results from ClamAV, YARA, metadata extraction, and format-specific analyzers (PDF, Office, ZIP). Files are never executed. Encrypted archives require an optional analyst-supplied password and are extracted only in an ephemeral tmpfs environment.

## 3. Supported Formats

PDF, ZIP, RAR, DOC, DOCX, XLS, XLSX, PPT, PPTX, EXE, DLL, JS, VBS, BAT, PS1, EML, TXT, PNG, JPG, and other formats (identified but reported as limited analysis available).

## 4. User Stories

**US-FILE-001:** As the analyst, I want to upload a suspicious file and get its SHA-256, file type, and ClamAV result so that I can determine if it is a known threat.  
**US-FILE-002:** As the analyst, I want YARA rules applied so that I can detect patterns beyond ClamAV signatures.  
**US-FILE-003:** As the analyst, I want to inspect a ZIP file and see its contents listed so that I can assess what it contains without executing anything.  
**US-FILE-004:** As the analyst, I want to supply a password for an encrypted ZIP so that I can inspect its contents safely.

## 5. Functional Requirements

**FR-FILE-001:** Accept file uploads up to 50MB. Reject larger files with a clear error.  
**FR-FILE-002:** Validate file by magic bytes, not just extension.  
**FR-FILE-003:** Compute SHA-256 of the uploaded file.  
**FR-FILE-004:** Identify file type (MIME + magic bytes) independently of the filename extension.  
**FR-FILE-005:** Report when declared extension does not match detected type.  
**FR-FILE-006:** Run ClamAV scan and return: clean | detected (with signature name) | error.  
**FR-FILE-007:** Run YARA rules and return: list of matching rules (name, description, tags) or no matches.  
**FR-FILE-008:** Extract metadata (file size, creation date if available, author for Office files, etc.).  
**FR-FILE-009:** For PDF: detect JavaScript, embedded files, suspicious object streams, encrypted state.  
**FR-FILE-010:** For Office (DOC/XLS/PPT and OOXML): detect macros, embedded objects, external links.  
**FR-FILE-011:** For ZIP/RAR: list contents (name, size, type); detect encryption; check for ZIP bomb, path traversal, excessive nesting.  
**FR-FILE-012:** For encrypted ZIP: accept optional password from analyst, extract in tmpfs only, apply depth/size/count/time limits from SEC-ARCHIVE rules.  
**FR-FILE-013:** Never execute any extracted file.  
**FR-FILE-014:** Never store extracted files outside the scanner container's tmpfs.  
**FR-FILE-015:** Never store analyst-supplied passwords in plaintext in the database.  
**FR-FILE-016:** Classify risk based on documented rules. Report INCONCLUSIVE if analysis could not complete.

## 6. Risk Classification Rules

| Condition | Risk |
|-----------|------|
| ClamAV detection | HIGH (minimum) |
| YARA rule match (severity: critical) | CRITICAL |
| YARA rule match (severity: high) | HIGH |
| Macro detected + external connections | HIGH |
| PDF JavaScript detected | HIGH |
| Path traversal detected in archive | CRITICAL |
| ZIP bomb indicators detected | CRITICAL |
| Extension mismatch (EXE disguised as PDF, etc.) | HIGH |
| ClamAV clean + no YARA + no structural issues | LOW |
| Analysis could not complete | INCONCLUSIVE |
| Encrypted archive, no password provided | INCONCLUSIVE |

## 7. Security Requirements

**SEC-FILE-001:** Scanner container has no network access.  
**SEC-FILE-002:** Scanner container runs as UID 1001, no new privileges.  
**SEC-FILE-003:** Extracted files land exclusively on tmpfs, auto-cleared on job completion.  
**SEC-FILE-004:** ZIP extraction depth limit: 5. Total extracted size: 200MB. File count: 1000. Timeout: 30s.  
**SEC-FILE-005:** Path traversal entries (`../`, absolute paths) in archives cause immediate rejection with CRITICAL indicator.  
**SEC-FILE-006:** Archive passwords accepted via API, never logged in plaintext, never stored in DB as plaintext.  
**SEC-FILE-007:** Uploaded file stored as SHA-256-named file in a directory outside web root; deleted after analysis.

## 8. API Contracts

### POST /api/v1/file-analysis
```
Content-Type: multipart/form-data
Body: file (any, max 50MB), password? (string, optional — for encrypted archives)

Response 202: { "analysisId": "uuid", "status": "PROCESSING" }
```

### GET /api/v1/file-analysis/:id
```json
Response 200:
{
  "id": "uuid",
  "status": "COMPLETED",
  "riskLevel": "HIGH",
  "riskExplanation": "ClamAV detected: Trojan.GenericKD.123456",
  "file": {
    "originalName": "invoice.exe",
    "sha256": "abc...",
    "detectedType": "application/x-dosexec",
    "declaredExtension": ".pdf",
    "extensionMismatch": true,
    "size": 204800
  },
  "clamav": { "result": "detected", "signature": "Trojan.GenericKD.123456" },
  "yara": { "matches": [{ "rule": "RANSOMWARE_GENERIC", "tags": ["ransomware"], "severity": "HIGH" }] },
  "metadata": {},
  "structuralFindings": [],
  "indicators": []
}
```

## 9. Acceptance Criteria

**AC-FILE-001:** SHA-256 matches known hash of a test file.  
**AC-FILE-002:** ClamAV detects EICAR test string.  
**AC-FILE-003:** YARA rule matches a test file containing a known pattern.  
**AC-FILE-004:** Extension mismatch is detected when an EXE is renamed to .pdf.  
**AC-FILE-005:** ZIP listing shows contents without extraction errors.  
**AC-FILE-006:** ZIP bomb is rejected with CRITICAL indicator before extraction completes.  
**AC-FILE-007:** Path traversal in ZIP is rejected with CRITICAL indicator.  
**AC-FILE-008:** PDF with embedded JavaScript is flagged HIGH.  
**AC-FILE-009:** Office file with macro is flagged HIGH.  
**AC-FILE-010:** File > 50MB is rejected before processing.  
**AC-FILE-011:** Clean EICAR-free test file returns LOW risk.

## 10. Test Cases

**TEST-FILE-001:** Upload EICAR test file → ClamAV: detected → risk HIGH.  
**TEST-FILE-002:** Upload clean text file → ClamAV: clean → risk LOW.  
**TEST-FILE-003:** Upload EXE renamed as .pdf → extension mismatch indicator → risk HIGH.  
**TEST-FILE-004:** Upload ZIP with path traversal → CRITICAL + rejected.  
**TEST-FILE-005:** Upload ZIP bomb → CRITICAL + rejected before memory exhaustion.  
**TEST-FILE-006:** Upload encrypted ZIP without password → INCONCLUSIVE.  
**TEST-FILE-007:** Upload encrypted ZIP with correct password → contents listed.  
**TEST-FILE-008:** Upload PDF with /JavaScript entry → indicator HIGH.  
**TEST-FILE-009:** Upload DOCX with macro → indicator HIGH.  
**TEST-FILE-010:** Upload 51MB file → rejected 413.

## 11. Dependencies

- SPEC-001 (foundation) VALIDATED.
- ClamAV in scanner container.
- YARA in scanner container.
- Python libraries: `python-magic`, `PyPDF2` or `pypdf`, `oletools`, `zipfile` (stdlib).

## 12. Implementation Tasks

- TASK-050: Create scanner Dockerfile (ClamAV + YARA + Python + libraries).
- TASK-051: Configure scanner container in docker-compose with resource limits and no-network.
- TASK-052: Create file analysis NestJS module + BullMQ producer.
- TASK-053: Create scanner worker (Python or Node) that processes BullMQ jobs.
- TASK-054: Implement SHA-256 + magic bytes identification.
- TASK-055: Implement ClamAV scan via clamd socket.
- TASK-056: Implement YARA scan with bundled ruleset.
- TASK-057: Implement ZIP/RAR analysis with safety limits.
- TASK-058: Implement PDF structural analysis.
- TASK-059: Implement Office macro detection (oletools).
- TASK-060: Implement risk classification engine for files.
- TASK-061: Create Prisma model for FileAnalysis.
- TASK-062: Create frontend upload page + results view.
- TASK-063: Create EICAR + test fixtures.
- TASK-064: Write unit + integration tests.

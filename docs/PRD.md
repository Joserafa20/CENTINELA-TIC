# CENTINELA TIC — Product Requirements Document (PRD)

**Version:** 1.0.0  
**Date:** 2026-11-04  
**Status:** Approved  
**Author:** TIC Coordination Unit

---

## 1. Executive Summary

CENTINELA TIC is a local cybersecurity analysis platform designed for the TIC Coordination Unit. It provides a unified interface to analyze suspicious emails, files, URLs, and domains, consult threat intelligence sources, and generate institutional technical reports — all running locally on Windows 11 without public cloud dependencies.

---

## 2. Problem Statement

The TIC Coordination Unit currently lacks a standardized, secure, and auditable toolset for:
- Analyzing phishing emails received by institutional users.
- Examining potentially malicious files before they reach internal systems.
- Verifying the legitimacy of domains, email addresses, and URLs.
- Generating formal technical reports for incident documentation.

Analysts rely on a fragmented set of online tools that: (a) may upload institutional data to external servers, (b) produce no audit trail, (c) generate no standardized reports, and (d) cannot operate offline.

---

## 3. Goals

| # | Goal | Priority |
|---|------|----------|
| G-01 | Enable safe analysis of suspicious emails (EML, MSG, TXT) | Critical |
| G-02 | Enable static analysis of files using ClamAV, YARA, and hash | Critical |
| G-03 | Verify email addresses and domains via DNS | High |
| G-04 | Analyze URLs for phishing and reputation indicators | High |
| G-05 | Optionally enrich analysis with VirusTotal, URLhaus, GSB | Medium |
| G-06 | Generate institutional PDF technical reports | High |
| G-07 | Maintain an auditable history of all analyses | High |
| G-08 | Operate fully offline for all core functions | Critical |
| G-09 | Run entirely on localhost with Docker Compose | Critical |

---

## 4. Non-Goals

- No public hosting or SaaS deployment.
- No multi-user collaboration (single administrator initially).
- No automatic threat response or remediation.
- No real-time network traffic monitoring.
- No dynamic malware analysis / sandboxed execution.
- No automatic submission of samples to external services.

---

## 5. User Personas

### Primary: Security Analyst / TIC Administrator
- Receives reports of suspicious emails from institutional users.
- Needs to triage, analyze, and document findings.
- Requires formal PDF reports for incident records.
- Works on Windows 11, no advanced Linux knowledge required.

---

## 6. Functional Requirements Summary

| Module | Description |
|--------|-------------|
| M-01 Dashboard | Overview of analyses, threat distribution, activity |
| M-02 Email Analyzer | Parse and analyze EML/MSG/TXT for phishing indicators |
| M-03 File Analyzer | Static analysis with ClamAV, YARA, SHA-256, format inspection |
| M-04 Email Verifier | Validate email addresses via DNS, MX, SPF, DMARC |
| M-05 URL Analyzer | Analyze URLs for phishing, TLS, redirects, reputation |
| M-06 Threat Intelligence | Query VirusTotal, URLhaus, Google Safe Browsing |
| M-07 History | Browse, filter, search, export past analyses |
| M-08 PDF Reports | Generate institutional technical reports |
| M-09 Admin & Audit | User management, API keys, audit log, system config |

---

## 7. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-PERF-001 | File analysis (< 10MB) completes in < 60 seconds |
| NFR-PERF-002 | Email parsing completes in < 10 seconds |
| NFR-PERF-003 | UI response < 2 seconds for dashboard load |
| NFR-SEC-001 | All uploads validated before processing |
| NFR-SEC-002 | No services exposed outside localhost |
| NFR-SEC-003 | All analysis actions logged with actor and input hash |
| NFR-REL-001 | System recoverable from Docker restart without data loss |
| NFR-MAIN-001 | TypeScript strict mode, ESLint, test coverage ≥ 80% (services) |

---

## 8. Constraints

- Windows 11 host, Docker Desktop + WSL2.
- Node.js 24, TypeScript.
- No paid APIs required for core functionality.
- External API integrations are opt-in; API keys configured by administrator.
- Maximum file upload size: 50MB (configurable).

---

## 9. Success Criteria

CENTINELA TIC is successfully delivered when all items in Section 13 of the SDD Maestro spec are met and verified.

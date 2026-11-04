# SPEC-006 — URL Analyzer

**Module:** 006-url-analysis  
**Version:** 1.0.0  
**Date:** 2026-11-04  
**Status:** Approved

---

## 1. Objective

Analyze a URL for phishing indicators, reputation signals, TLS certificate validity, redirect chains, Unicode/punycode manipulation, and suspicious structural patterns — without automatically fetching the target page.

## 2. Functional Requirements

**FR-URL-001:** Accept a single URL string as input.  
**FR-URL-002:** Parse the URL structure: scheme, subdomain, domain, TLD, path, query parameters, fragment.  
**FR-URL-003:** Resolve domain to IP addresses (A/AAAA records).  
**FR-URL-004:** Check TLS certificate: issuer, subject, validity dates, SANs, self-signed indicator.  
**FR-URL-005:** Detect HTTP → HTTPS redirect chains (maximum 5 hops; timeout: 10s).  
**FR-URL-006:** Detect URL shorteners and flag them.  
**FR-URL-007:** Detect Unicode/punycode characters in domain (homograph attack indicator).  
**FR-URL-008:** Detect lookalike domains (e.g., paypa1.com, pay-pal.com).  
**FR-URL-009:** Detect suspicious query parameters (login, token, password, redirect, etc.).  
**FR-URL-010:** Detect excessive subdomains (> 4 levels).  
**FR-URL-011:** Detect IP-literal URLs (e.g., http://192.168.1.1/login).  
**FR-URL-012:** Classify risk and return structured result.  
**FR-URL-013:** Never download page content automatically.  
**FR-URL-014:** Block SSRF: private IP ranges, localhost, metadata endpoints must not be followed.

## 3. Security Requirements

**SEC-URL-001:** Private IP ranges (RFC1918, loopback, link-local, metadata IPs) are blocked from HTTP requests.  
**SEC-URL-002:** Redirect following limited to 5 hops; content is never read.  
**SEC-URL-003:** TLS check uses a HEAD request (not GET), no body downloaded.  
**SEC-URL-004:** Connection timeout: 10 seconds per hop.  
**SEC-URL-005:** User-supplied URL is never passed unvalidated to any downstream service.

## 4. API Contracts

### POST /api/v1/url-analysis
```json
Request: { "url": "https://suspicious-site.com/login?redirect=http://evil.com" }

Response 202: { "analysisId": "uuid", "status": "PROCESSING" }
```

### GET /api/v1/url-analysis/:id
```json
Response 200:
{
  "id": "uuid",
  "url": "https://suspicious-site.com/login",
  "riskLevel": "HIGH",
  "parsed": {
    "scheme": "https",
    "subdomain": null,
    "domain": "suspicious-site.com",
    "tld": "com",
    "path": "/login",
    "queryParams": { "redirect": "http://evil.com" }
  },
  "dns": { "ipAddresses": ["203.0.113.1"] },
  "tls": { "valid": true, "issuer": "Let's Encrypt", "expiresAt": "2027-01-01", "selfSigned": false },
  "redirectChain": [],
  "indicators": [
    { "type": "SUSPICIOUS_PARAM", "description": "Query parameter 'redirect' points to external URL", "severity": "MEDIUM" }
  ]
}
```

## 5. Acceptance Criteria

**AC-URL-001:** URL parsed correctly into components.  
**AC-URL-002:** IP-literal URL is flagged as indicator.  
**AC-URL-003:** Punycode domain detected and original Unicode shown.  
**AC-URL-004:** URL shortener detected and flagged.  
**AC-URL-005:** TLS certificate validity and expiry returned.  
**AC-URL-006:** SSRF attempt (localhost URL) is blocked and not followed.  
**AC-URL-007:** Redirect chain (max 5) correctly followed and reported.

## 6. Test Cases

**TEST-URL-001:** Parse a complex URL with subdomain, path, query.  
**TEST-URL-002:** IP-literal URL → indicator flagged.  
**TEST-URL-003:** `xn--pypal-4ve.com` → punycode indicator.  
**TEST-URL-004:** `bit.ly/abc` → shortener indicator.  
**TEST-URL-005:** `http://localhost/admin` → SSRF blocked, error returned.  
**TEST-URL-006:** `http://169.254.169.254/latest/meta-data` → SSRF blocked.  
**TEST-URL-007:** Valid HTTPS domain → TLS cert details returned.

## 7. Dependencies

- SPEC-001 (foundation) VALIDATED.
- Library: `tldts`, `node:url`, `node:https` for TLS check.
- SSRF protection library or custom IP range validator.

## 8. Implementation Tasks

- TASK-085: Create URL analyzer NestJS module.
- TASK-086: Implement URL parser service.
- TASK-087: Implement SSRF guard (private IP blocker).
- TASK-088: Implement DNS resolver for URL domains.
- TASK-089: Implement TLS certificate checker.
- TASK-090: Implement redirect chain follower (max 5 hops, HEAD only).
- TASK-091: Implement URL shortener detector.
- TASK-092: Implement Unicode/punycode detector.
- TASK-093: Implement lookalike domain detector.
- TASK-094: Implement suspicious parameter detector.
- TASK-095: Implement risk engine for URLs.
- TASK-096: Create frontend URL analyzer form + results view.
- TASK-097: Write unit + integration tests.

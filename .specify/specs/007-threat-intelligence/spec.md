# SPEC-007 — Threat Intelligence

**Module:** 007-threat-intelligence  
**Version:** 1.0.0  
**Date:** 2026-11-04  
**Status:** Approved

---

## 1. Objective

Provide optional enrichment of analysis indicators (hashes, domains, IPs, URLs) by querying configured external threat intelligence providers — VirusTotal, URLhaus, Google Safe Browsing — with caching, rate limiting, and audit logging.

## 2. Functional Requirements

**FR-TI-001:** Support providers: VirusTotal, URLhaus, Google Safe Browsing (each independently configurable).  
**FR-TI-002:** Accept indicator types: SHA-256 hash, domain, IP address, URL.  
**FR-TI-003:** Each provider requires its API key configured by the administrator — never hardcoded.  
**FR-TI-004:** Cache results in Redis with configurable TTL (default: 1 hour for hashes, 15 minutes for URLs/domains).  
**FR-TI-005:** Respect rate limits: track query counts per provider per time window; return cached/error on limit exceeded.  
**FR-TI-006:** Return structured result per provider: { provider, queriedAt, indicatorType, indicator, result, detections?, error? }.  
**FR-TI-007:** Never treat absence of detections as confirmation of safety.  
**FR-TI-008:** Log every external query to audit log (indicator hash, provider, timestamp, result status).  
**FR-TI-009:** File upload to VirusTotal requires explicit per-analysis authorization from analyst (not automatic).  
**FR-TI-010:** Module functions correctly with zero providers configured (returns empty enrichment).

## 3. Security Requirements

**SEC-TI-001:** API keys stored encrypted (AES-256-GCM) in database, never in plaintext.  
**SEC-TI-002:** Only normalized, validated indicators are sent to external APIs — never raw user input.  
**SEC-TI-003:** External API calls made through a dedicated service with timeout (10s) and error handling.  
**SEC-TI-004:** Provider responses treated as untrusted external data, validated before storage.

## 4. API Contracts

### POST /api/v1/threat-intel/query
```json
Request:
{
  "indicator": "d41d8cd98f00b204e9800998ecf8427e",
  "type": "HASH",
  "providers": ["virustotal", "urlhaus"]
}

Response 200:
{
  "indicator": "d41d8cd98f00b204e9800998ecf8427e",
  "type": "HASH",
  "results": [
    {
      "provider": "virustotal",
      "queriedAt": "2026-11-04T10:00:00.000Z",
      "cached": false,
      "result": "clean",
      "detections": { "malicious": 0, "total": 72 },
      "error": null
    },
    {
      "provider": "urlhaus",
      "queriedAt": "2026-11-04T10:00:00.000Z",
      "cached": false,
      "result": "not_found",
      "error": null
    }
  ],
  "disclaimer": "Absence of detections does not confirm the indicator is safe."
}
```

### GET /api/v1/threat-intel/providers
```json
Response 200:
{
  "providers": [
    { "name": "virustotal", "configured": true, "rateLimit": { "remaining": 480, "resetAt": "2026-11-04T11:00:00.000Z" } },
    { "name": "urlhaus", "configured": false },
    { "name": "google-safe-browsing", "configured": false }
  ]
}
```

## 5. Acceptance Criteria

**AC-TI-001:** Query with valid API key returns real provider result.  
**AC-TI-002:** Query with no providers configured returns empty results array with disclaimer.  
**AC-TI-003:** Second identical query within TTL window returns cached result (cached: true).  
**AC-TI-004:** Provider result includes disclaimer about absence of detections.  
**AC-TI-005:** Rate limit exceeded returns error without crashing the platform.  
**AC-TI-006:** Every external query logged in audit log.  
**AC-TI-007:** API keys not returned in any API response.

## 6. Test Cases

**TEST-TI-001:** Query with mocked VirusTotal API → result parsed correctly.  
**TEST-TI-002:** Second query within TTL → cached: true returned.  
**TEST-TI-003:** Rate limit exceeded → error response with retry-after info.  
**TEST-TI-004:** No providers configured → empty results, no crash.  
**TEST-TI-005:** External API timeout → error result, no crash.  
**TEST-TI-006:** Audit log entry created for each query.

## 7. Dependencies

- SPEC-001 (foundation) VALIDATED.
- Redis (for caching) — already in infrastructure.
- VirusTotal API key (optional, analyst-provided).

## 8. Implementation Tasks

- TASK-100: Create threat intel NestJS module.
- TASK-101: Implement VirusTotal adapter (hash, domain, IP, URL queries).
- TASK-102: Implement URLhaus adapter.
- TASK-103: Implement Google Safe Browsing adapter.
- TASK-104: Implement Redis caching layer.
- TASK-105: Implement rate limit tracker.
- TASK-106: Implement indicator normalizer (input validation).
- TASK-107: Create API key management endpoints.
- TASK-108: Implement audit logging for external queries.
- TASK-109: Create frontend threat intel query panel.
- TASK-110: Write unit tests with mocked providers.
- TASK-111: Write integration tests with Redis cache.

# SPEC-005 — Email Verifier

**Module:** 005-email-verifier  
**Version:** 1.0.0  
**Date:** 2026-11-04  
**Status:** Approved

---

## 1. Objective

Allow analysts to verify an email address by validating its syntax, domain existence, DNS/MX records, authentication configuration (SPF, DMARC, DKIM with selector), and known disposable domain lists — without using intrusive SMTP techniques.

## 2. Functional Description

The analyst enters an email address. The system performs a layered verification, reporting results per category: syntax, domain, mail configuration, authentication, reputation, and mailbox status (with explicit disclaimer about DNS-only limitations).

## 3. Functional Requirements

**FR-VERIFY-001:** Accept a single email address string as input.  
**FR-VERIFY-002:** Validate syntax (RFC 5321/5322).  
**FR-VERIFY-003:** Resolve domain via DNS (A/AAAA records).  
**FR-VERIFY-004:** Query MX records.  
**FR-VERIFY-005:** Fetch and parse SPF record (TXT record starting with v=spf1).  
**FR-VERIFY-006:** Fetch and parse DMARC record (TXT record at _dmarc.domain).  
**FR-VERIFY-007:** If a DKIM selector is provided, query the DKIM TXT record and report key presence.  
**FR-VERIFY-008:** Check domain against a known disposable/temporary email domain list.  
**FR-VERIFY-009:** Detect potential typosquatting / lookalike domains (e.g., paypa1.com vs paypal.com).  
**FR-VERIFY-010:** Report results in independent categories (A through F as specified in SDD Maestro §4).  
**FR-VERIFY-011:** Explicitly state in the result that SMTP mailbox existence cannot be confirmed via DNS and that no SMTP probing was performed.  
**FR-VERIFY-012:** Never use SMTP VRFY or RCPT TO probing techniques.

## 4. Result Categories

**A. Syntax:** Valid / Invalid + reason  
**B. Domain:** Resolves / Does not resolve  
**C. Mail Configuration:** MX records present / absent / count  
**D. Authentication:** SPF policy, DMARC policy, DKIM (if selector provided)  
**E. Reputation:** Disposable domain: Yes / No. Lookalike indicators.  
**F. Mailbox Status:** CANNOT_CONFIRM_VIA_DNS (always — no SMTP probing)

## 5. Security Requirements

**SEC-VERIFY-001:** DNS queries use a configurable resolver timeout (default: 5s).  
**SEC-VERIFY-002:** No SMTP connections are made.  
**SEC-VERIFY-003:** DNS responses are treated as untrusted external data.

## 6. API Contracts

### POST /api/v1/email-verify
```json
Request: { "email": "user@domain.com", "dkimSelector": "google" }

Response 200:
{
  "email": "user@domain.com",
  "syntax": { "valid": true },
  "domain": { "resolves": true, "ipAddresses": ["93.184.216.34"] },
  "mailConfig": { "mxRecords": [{ "exchange": "aspmx.l.google.com", "priority": 1 }] },
  "authentication": {
    "spf": { "record": "v=spf1 include:_spf.google.com ~all", "policy": "softfail" },
    "dmarc": { "record": "v=DMARC1; p=reject; rua=mailto:dmarc@domain.com", "policy": "reject" },
    "dkim": { "selector": "google", "keyPresent": true }
  },
  "reputation": {
    "disposable": false,
    "lookalikesDetected": false,
    "lookalikes": []
  },
  "mailboxStatus": {
    "status": "CANNOT_CONFIRM_VIA_DNS",
    "disclaimer": "Mailbox existence cannot be confirmed through DNS queries alone. No SMTP probing was performed."
  }
}
```

## 7. Acceptance Criteria

**AC-VERIFY-001:** Valid email address passes syntax check.  
**AC-VERIFY-002:** `user@notareal-domain-xyz123.com` returns domain: does not resolve.  
**AC-VERIFY-003:** `user@gmail.com` returns MX records present.  
**AC-VERIFY-004:** Disposable domain (e.g. mailinator.com) is flagged.  
**AC-VERIFY-005:** Invalid syntax `user@` returns syntax: invalid.  
**AC-VERIFY-006:** Mailbox status always returns CANNOT_CONFIRM_VIA_DNS.  
**AC-VERIFY-007:** Result persisted to database.

## 8. Test Cases

**TEST-VERIFY-001:** Valid email → syntax valid.  
**TEST-VERIFY-002:** `@nodomain` → syntax invalid.  
**TEST-VERIFY-003:** Known MX domain → MX records present.  
**TEST-VERIFY-004:** Disposable domain → reputation.disposable: true.  
**TEST-VERIFY-005:** SPF record present → authentication.spf populated.  
**TEST-VERIFY-006:** DMARC record present → authentication.dmarc populated.  
**TEST-VERIFY-007:** Mailbox status always CANNOT_CONFIRM_VIA_DNS regardless of other results.

## 9. Dependencies

- SPEC-001 (foundation) VALIDATED.
- Library: `dns` (Node.js built-in) or `dns2`.
- Disposable domain list: open-source list (e.g., disposable-email-domains on GitHub).

## 10. Implementation Tasks

- TASK-070: Create email verifier NestJS module.
- TASK-071: Implement syntax validator.
- TASK-072: Implement DNS/A/AAAA resolver.
- TASK-073: Implement MX record query.
- TASK-074: Implement SPF record parser.
- TASK-075: Implement DMARC record parser.
- TASK-076: Implement DKIM selector query.
- TASK-077: Integrate disposable domain list.
- TASK-078: Implement lookalike domain detection.
- TASK-079: Create frontend verification form + results view.
- TASK-080: Write unit + integration tests.

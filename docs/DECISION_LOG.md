# CENTINELA TIC — Decision Log

---

## DEC-001: Modular monolith over microservices

**Date:** 2026-11-04  
**Status:** Accepted  
**Decision:** Backend implemented as a NestJS modular monolith, not individual microservices.  
**Rationale:** Single-user local tool. Microservices add operational overhead (service discovery, inter-service auth, distributed tracing) with no benefit at this scale. Module boundaries are clean enough for future extraction if needed.  
**Alternatives considered:** Express microservices, Fastify standalone services.  

---

## DEC-002: BullMQ for analysis jobs

**Date:** 2026-11-04  
**Status:** Accepted  
**Decision:** File and email analysis dispatched as BullMQ jobs via Redis.  
**Rationale:** Analysis can take 10–60 seconds. Synchronous HTTP would timeout. BullMQ provides retries, job state tracking, and worker isolation without blocking the API.  
**Alternatives considered:** Direct async in NestJS, Node worker threads. Rejected: no retry, no cross-container job tracking.  

---

## DEC-003: PostgreSQL over SQLite

**Date:** 2026-11-04  
**Status:** Accepted  
**Decision:** PostgreSQL as primary database.  
**Rationale:** BullMQ workers write results concurrently. SQLite's write serialization would create bottlenecks. PostgreSQL JSONB columns handle flexible indicator storage efficiently.  
**Alternatives considered:** SQLite (rejected: concurrency), MongoDB (rejected: adds operational complexity for relational data).  

---

## DEC-004: Scanner in isolated container

**Date:** 2026-11-04  
**Status:** Accepted  
**Decision:** ClamAV, YARA, and all file parsing run in a dedicated Docker container with no network, non-root user, tmpfs scratch, resource limits.  
**Rationale:** Analyzing untrusted files in the same process as the API creates unacceptable risk. Container isolation provides the necessary boundary without requiring a full VM.  
**Alternatives considered:** Same-process worker (rejected: security), separate VM (rejected: too heavy for local use).  

---

## DEC-005: External APIs optional / no forced payment

**Date:** 2026-11-04  
**Status:** Accepted  
**Decision:** VirusTotal, URLhaus, Google Safe Browsing are opt-in integrations. The platform is fully functional without them.  
**Rationale:** The platform must be usable in environments with no internet access or budget for paid APIs. Free tiers are rate-limited and must not be treated as guaranteed.  

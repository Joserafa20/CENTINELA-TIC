# CENTINELA TIC

**Local Cybersecurity Analysis Platform — TIC Coordination Unit**

CENTINELA TIC is a fully local, Docker-based cybersecurity platform for analyzing suspicious emails, files, URLs, and domains. It runs entirely on your Windows 11 machine — no public cloud, no mandatory paid APIs.

---

## Quick Start

See [START.md](START.md) for complete installation and startup instructions.

**TL;DR:**
```powershell
# 1. Copy and configure environment
Copy-Item .env.example .env
# Edit .env with your passwords

# 2. Start everything
docker compose up -d

# 3. Open in browser
# http://localhost:3000
```

---

## Features

| Module | Description |
|--------|-------------|
| Dashboard | Real-time analysis statistics and threat overview |
| Email Analyzer | Parse EML/MSG/TXT — headers, auth (SPF/DKIM/DMARC), URLs, attachments |
| File Analyzer | ClamAV + YARA + SHA-256 + format inspection (PDF, Office, ZIP) |
| Email Verifier | DNS/MX/SPF/DMARC/DKIM validation for email addresses |
| URL Analyzer | Phishing indicators, TLS check, redirects, reputation |
| Threat Intelligence | Optional VirusTotal, URLhaus, Google Safe Browsing enrichment |
| Reports | Institutional PDF technical reports |
| History | Searchable, filterable analysis history with IOC extraction |
| Audit | Complete activity log and configuration management |

---

## Architecture

- **Frontend:** Next.js 15 + TypeScript + shadcn/ui (port 3000)
- **Backend:** NestJS + TypeScript + Prisma (port 3001)
- **Database:** PostgreSQL 16
- **Queue:** Redis 7 + BullMQ
- **Scanner:** Isolated container with ClamAV + YARA

All services run on `localhost` only. No ports are exposed to the network.

---

## Requirements

- Windows 11
- Docker Desktop with WSL2 enabled
- 4GB RAM available for Docker
- 10GB disk space

---

## Development Phase

| Phase | Status |
|-------|--------|
| 0 — Specifications | ✅ Complete |
| 1 — Infrastructure | ⏳ Next |
| 2 — Dashboard | ⏳ Pending |
| 3–9 — Feature phases | ⏳ Pending |

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full plan.

---

## Security

CENTINELA TIC is designed with security by design principles. See [docs/SECURITY.md](docs/SECURITY.md).

Key principles:
- Uploaded files are never executed.
- Scanner runs in an isolated container with no network access.
- All analysis is logged with tamper-evident audit trail.
- External APIs are opt-in; core functionality works offline.

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/PRD.md](docs/PRD.md) | Product Requirements |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical Architecture |
| [docs/SECURITY.md](docs/SECURITY.md) | Security Policy |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Development Roadmap |
| [docs/TASKS.md](docs/TASKS.md) | Task Tracker |
| [docs/SESSION.md](docs/SESSION.md) | Session State (for resuming development) |
| [docs/DECISION_LOG.md](docs/DECISION_LOG.md) | Architecture Decisions |
| [.specify/specs/](./specify/specs/) | Full module specifications |

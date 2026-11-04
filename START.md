# CENTINELA TIC — Startup Guide

## Prerequisites

Before starting, ensure the following are installed on Windows 11:

1. **Docker Desktop** (with WSL2 integration enabled)
   - Download: https://www.docker.com/products/docker-desktop
   - After installing: Settings → General → "Use the WSL 2 based engine" ✓

2. **Git** (already installed if you cloned this repo)

---

## First-Time Setup

### Step 1 — Configure Environment

```powershell
Copy-Item .env.example .env
notepad .env
```

Edit `.env` and replace ALL `CHANGE_ME_*` values:

| Variable | How to generate |
|----------|----------------|
| `POSTGRES_PASSWORD` | Use a strong random password (16+ chars) |
| `REDIS_PASSWORD` | Use a strong random password (16+ chars) |
| `JWT_SECRET` | Run: `openssl rand -hex 32` in WSL |
| `ENCRYPTION_KEY` | Run: `openssl rand -hex 16` in WSL |
| `ADMIN_PASSWORD` | Choose your initial admin password |

> **Never commit .env to Git.**

### Step 2 — Start the Platform

```powershell
docker compose up -d
```

First run downloads images and builds containers (~5-10 minutes).

### Step 3 — Verify Everything Is Running

```powershell
docker compose ps
```

All services should show `healthy` or `running`.

```powershell
# Check backend health
Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing
```

Expected: `{"status":"ok",...}`

### Step 4 — Open the Application

Open your browser: **http://localhost:3000**

Log in with:
- Email: value of `ADMIN_EMAIL` from `.env` (default: `admin@centinela.local`)
- Password: value of `ADMIN_PASSWORD` from `.env`

**Change your password immediately after first login.**

---

## Daily Use

### Start
```powershell
docker compose up -d
```

### Stop
```powershell
docker compose down
```

### View logs
```powershell
docker compose logs -f backend
docker compose logs -f scanner
```

### Restart a service
```powershell
docker compose restart backend
```

---

## ClamAV Updates

Update the ClamAV virus database:
```powershell
docker compose exec scanner freshclam
```

Or use the Settings → ClamAV section in the web interface.

---

## Backup

```powershell
# Backup database
docker compose exec postgres pg_dump -U centinela centinela > backup_$(Get-Date -Format "yyyyMMdd").sql

# Backup all volumes
docker run --rm -v centinela-tic_postgres_data:/data -v ${PWD}/backup:/backup alpine tar czf /backup/postgres_data.tar.gz /data
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3000 or 3001 already in use | Stop the conflicting service, or change port in docker-compose.yml |
| Database connection failed | Check POSTGRES_PASSWORD in .env matches |
| ClamAV not scanning | Run `docker compose restart scanner` |
| Frontend not loading | Check `docker compose logs frontend` |

---

## Status: Phase 1 (Infrastructure) in progress

See [docs/ROADMAP.md](docs/ROADMAP.md) for current development status.

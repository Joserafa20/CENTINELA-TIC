# SPEC-002 — Dashboard

**Module:** 002-dashboard  
**Version:** 1.0.0  
**Date:** 2026-11-04  
**Status:** Approved

---

## 1. Objective

Provide a real-time overview of all analysis activity, threat distribution, and system status — pulling live data from the database.

## 2. Functional Description

The dashboard is the home screen of CENTINELA TIC. It shows aggregate statistics, recent activity, threat distribution charts, and quick navigation to analysis modules. All data comes from the database — no hardcoded or mock values in production.

## 3. Scope

Included:
- KPI stat tiles (totals by analysis type and risk level).
- Threat distribution chart (pie/donut).
- Activity timeline chart (line/bar, last 30 days).
- Recent analyses table (last 10).
- Quick action buttons (start new analysis).
- Dark/light mode toggle.

## 4. User Stories

**US-DASH-001:** As the analyst, I want to see the total number of analyses by type at a glance so that I can understand the platform's usage.  
**US-DASH-002:** As the analyst, I want to see how many critical and high threats were detected so that I can prioritize my work.  
**US-DASH-003:** As the analyst, I want to see recent analyses in a table so that I can quickly navigate to a previous result.

## 5. Functional Requirements

**FR-DASH-001:** Dashboard must display: total analyses, emails analyzed, files analyzed, domains verified, URLs analyzed.  
**FR-DASH-002:** Dashboard must display threat counts: CRITICAL, HIGH, MEDIUM, LOW, CLEAN, INCONCLUSIVE.  
**FR-DASH-003:** Dashboard must display a threat distribution chart.  
**FR-DASH-004:** Dashboard must display an activity chart (analyses per day, last 30 days).  
**FR-DASH-005:** Dashboard must display the 10 most recent analyses with: date, type, input name, risk level, status.  
**FR-DASH-006:** Dashboard must provide links to start each analysis type.  
**FR-DASH-007:** All statistics must be queried from the database — no hardcoded data.  
**FR-DASH-008:** Dashboard must support dark and light mode.

## 6. Non-Functional Requirements

**NFR-DASH-001:** Dashboard must load in < 2 seconds on localhost.  
**NFR-DASH-002:** Statistics must refresh when the analyst navigates to the page.

## 7. API Contracts

### GET /api/v1/dashboard/stats
```json
Response 200:
{
  "totals": {
    "analyses": 0,
    "emails": 0,
    "files": 0,
    "domains": 0,
    "urls": 0
  },
  "byRisk": {
    "CRITICAL": 0,
    "HIGH": 0,
    "MEDIUM": 0,
    "LOW": 0,
    "CLEAN": 0,
    "INCONCLUSIVE": 0
  },
  "activityLast30Days": [
    { "date": "2026-10-05", "count": 0 }
  ]
}
```

### GET /api/v1/analyses?limit=10&sort=createdAt:desc
```json
Response 200:
{
  "data": [
    {
      "id": "uuid",
      "type": "EMAIL",
      "inputName": "suspicious.eml",
      "riskLevel": "HIGH",
      "status": "COMPLETED",
      "createdAt": "2026-11-04T10:00:00.000Z"
    }
  ],
  "meta": { "total": 0, "page": 1, "limit": 10 }
}
```

## 8. Acceptance Criteria

**AC-DASH-001:** Dashboard renders all KPI tiles with values from the database.  
**AC-DASH-002:** Threat distribution chart renders correctly with real data.  
**AC-DASH-003:** Activity chart renders correctly for the last 30 days.  
**AC-DASH-004:** Recent analyses table shows the 10 most recent entries.  
**AC-DASH-005:** Dark/light mode toggle works and persists across page navigation.  
**AC-DASH-006:** When there are no analyses, an empty state is shown (not zeros that look like errors).  
**AC-DASH-007:** Dashboard is accessible at the root route `/`.

## 9. Test Cases

**TEST-DASH-001:** Dashboard stats API returns correct totals after inserting test analyses.  
**TEST-DASH-002:** Activity data returns correct per-day counts.  
**TEST-DASH-003:** Dashboard renders without errors when database is empty.  
**TEST-DASH-004:** Dark mode toggle changes theme and persists on reload.

## 10. Dependencies

- SPEC-001 (foundation) must be VALIDATED.
- Prisma Analysis model must exist.

## 11. Implementation Tasks

- TASK-020: Create dashboard stats endpoint in NestJS.
- TASK-021: Create activity timeline query.
- TASK-022: Create dashboard page in Next.js.
- TASK-023: Create KPI stat tile component.
- TASK-024: Create threat distribution chart (Recharts).
- TASK-025: Create activity chart (Recharts).
- TASK-026: Create recent analyses table (TanStack Table).
- TASK-027: Implement dark/light mode (Tailwind + next-themes).
- TASK-028: Write API tests for dashboard endpoint.
- TASK-029: Write component tests for stat tiles.

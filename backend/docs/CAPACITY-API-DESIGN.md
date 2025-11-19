# Capacity & Workload API Design

## 1. Objectives

Provide backend endpoints that centralize workforce-capacity calculations currently done in the frontend. Goals:

1. Serve consistent utilization metrics to all clients (web, reports, automation).
2. Reduce frontend computation and duplicated logic.
3. Unlock future planning features (drag‑and‑drop scheduling, what‑if analysis) by exposing forecasts and alerting metadata.

## 2. Data Sources

| Table | Purpose | Notes |
| --- | --- | --- |
| `users` | Identify active engineers, hourly capacity, roles | Use `is_active` + `role = 'engineer'`. Future: store `weekly_capacity_hours` per user (default 40). |
| `tasks` | Planned work, due date, estimated hours, project association | Use `estimated_hours`, `due_date`, `project_id`, `status`. |
| `projects` | Project metadata for display | Use `name`, `code`, `manager`, `client`. |
| `time_entries` | Actual hours logged for historical utilization | Filter by date range (month/quarter) and approval status. |

Optional future inputs: PTO/leave calendar, milestones, approvals.

## 3. Core Metrics

1. **Actual Utilization** (past period): `approved_time / capacity`.
2. **Planned Load** (future weeks): sum of estimated hours by due date bucket.
3. **Project Mix**: share of planned hours per project.
4. **Alerts**: thresholds for `>= 90%` (warning) and `>= 110%` (critical).

Capacity defaults:

- Monthly capacity = `weekly_capacity_hours * 4`.
- Weekly capacity = `weekly_capacity_hours` (default 40). Allow override via user profile once column exists.

## 4. Endpoints

### 4.1 `GET /api/capacity/summary`

**Purpose:** Current-month actual utilization + alerting snapshot.

**Security:** `authenticate` + `authorize('admin', 'supervisor')`. Engineers may call with `?me=true`.

**Query params**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `from` | ISO date | first day of current month | Inclusive start for time entries. |
| `to` | ISO date | last day of current month | Inclusive end. |
| `userId` | number | all | Filter to one engineer. Requires caller to be admin/supervisor unless matches own ID. |
| `me` | boolean | false | Shortcut to filter to `req.user.id`. |

**Response**

```json
{
  "period": { "from": "2025-03-01", "to": "2025-03-31" },
  "teamTotals": {
    "capacityHours": 640,
    "loggedHours": 512,
    "avgUtilization": 80
  },
  "members": [
    {
      "userId": 3,
      "name": "Jane Doe",
      "role": "engineer",
      "projects": 4,
      "tasks": 18,
      "loggedHours": 132,
      "capacityHours": 160,
      "utilization": 82.5,
      "alert": "warning"
    }
  ]
}
```

Computation steps:

1. Fetch engineers.
2. Fetch approved time entries within range (respect pagination by overriding limit to large value or using raw query).
3. Fetch tasks grouped per user for project/task counts.
4. Aggregate per user + team totals.

### 4.2 `GET /api/capacity/forecast`

**Purpose:** Four-week forward-looking plan used by the frontend timeline view.

**Security:** same as summary.

**Query params**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `weeks` | 1-8 | 4 | Number of weeks to forecast. |
| `start` | ISO date | next Monday | Anchor start date (week begins Monday). |
| `userId` | number | all | Filter to specific engineer. |
| `includeProjectMix` | boolean | false | When true, include project breakdown per member. |

**Response**

```json
{
  "window": { "start": "2025-03-24", "weeks": 4, "weekStartsOn": 1 },
  "weeks": [
    {
      "label": "Mar 24 – Mar 30",
      "start": "2025-03-24",
      "end": "2025-03-30",
      "health": "tight",
      "allocations": [
        {
          "userId": 3,
          "name": "Jane Doe",
          "hours": 42,
          "utilization": 105,
          "status": "overbooked",
          "topProjects": [
            { "projectId": 12, "name": "Airport Upgrade", "hours": 18 },
            { "projectId": 9, "name": "Water Plant", "hours": 12 }
          ]
        }
      ]
    }
  ]
}
```

Computation rules:

1. Group tasks by assigned engineer.
2. Determine task weight: use `estimated_hours`; fall back to `DEFAULT_TASK_ESTIMATE` (config, default 6).
3. Assign each task’s hours to the week containing its `due_date`. If missing due date, allocate to Week 0.
4. Calculate utilization = `(weekHours / weeklyCapacity) * 100`.
5. Derive `status` via thresholds.
6. Week `health` = highest status among allocations.

### 4.3 future: `POST /api/capacity/rebalance`

Not in scope yet, but design leaves room for adjustments (bulk reassign tasks). Requires transactional logic.

## 5. Implementation Plan

1. **Service Layer (`src/services/capacityService.ts`)**
   - `getCapacitySummary({ from, to, userId })`
   - `getCapacityForecast({ start, weeks, userId, includeProjectMix })`
   - Reuse Knex queries; prefer raw SQL for performance-critical aggregates.
   - Share constants (default weekly capacity, alert thresholds) in config.

2. **Routes (`src/routes/capacity.ts`)**
   - Register under `/capacity`.
   - Add express-validator for params.
   - Update `src/index.ts` to mount new router.

3. **Performance considerations**
   - Use batch queries (`whereIn` on user IDs) to avoid N+1.
   - For forecasts, prefetch projects (`select id,name,code`).
   - Cache results (optional) via in-memory Map with TTL (e.g., 5 min) for admin dashboards.

4. **Testing**
   - Unit: service functions with mocked DB (knex-mock or transaction rollback).
   - Integration: supertest for endpoints ensuring RBAC + validation.

5. **Config additions**
   - `CAPACITY_DEFAULT_WEEKLY_HOURS=40`
   - `CAPACITY_ALERT_WARNING=0.9`
   - `CAPACITY_ALERT_CRITICAL=1.1`

## 6. Frontend Consumption

1. Replace `Workload.tsx` data-fetching with calls to new endpoints.
2. Map `summary.members` to utilization chart/table.
3. Map `forecast.weeks` to timeline card UI.
4. Use `projectBreakdown` data to populate the “Project Mix” widget (only request when a user is selected to reduce payload).

## 7. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Missing `estimated_hours` leads to inaccurate forecasts | Use configurable default + surface “estimation needed” badge when >40% of hours are defaults. |
| Large datasets cause slow responses | Add pagination/cursor for timeline, limit to active engineers, consider caching. |
| Engineers with custom schedules (part-time) skew capacity | Add `weekly_capacity_hours` column and expose in API once available. |

---

**Next steps:** Implement service + routes per plan, then switch frontend to consume `/api/capacity/*` endpoints.


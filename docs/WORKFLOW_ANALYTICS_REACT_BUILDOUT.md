# Workflow: Analytics Dashboard React E2E

**workflow_key:** `analytics-dashboard-three-page-e2e`  
**workflow_id:** `wf_analytics_dashboard_three_page_e2e`

Subagents MUST write into `analytics-app/` (not `public/` directly). Run `npm run build:analytics` before deploy.

## Target tree (canonical)

```
analytics-app/
  src/
    pages/           OverviewPage.tsx | FinancePage.tsx | HealthPage.tsx
    components/      portable UI (kpi, charts, tables, shell)
    api/client.ts    fetch /api/analytics/*
    types/           analytics-api.ts
  PORTING.md         copy map → inneranimalmedia dashboard
public/analytics/    Vite build output (generated — do not hand-edit)
```

## Node → agent deliverables

| Node | Agent output |
|------|----------------|
| wnode_ad3_extract_design | Design tokens doc → match `src/styles/tokens.css` |
| wnode_ad3_generate_worker_api | Already in `src/api/*.ts` (Worker) — extend, don't duplicate |
| wnode_ad3_generate_react_pages | Edit `src/pages/*.tsx` only; use `components/*` |
| wnode_ad3_write_files | Write under `analytics-app/src/` |
| wnode_ad3_build | `npm run build:analytics` |
| wnode_ad3_smoke | `npm run smoke:api` + Playwright on `/dashboard/overview` |
| wnode_ad3_deploy_approval | STOP — Sam approves |
| wnode_ad3_deploy | `npm run deploy` |

## Subagent spawn (Tier 2) parallel tasks

When `wf_gpt5_4_mini_subagent_spawn_v1` runs, assign subagents by file area:

| Subagent | Owns |
|----------|------|
| subagent_1 plan | `docs/WORKFLOW_ANALYTICS_REACT_BUILDOUT.md`, rubric |
| subagent_2 code | `src/components/kpi/`, `src/components/charts/` |
| subagent_3 code | `src/pages/OverviewPage.tsx`, `FinancePage.tsx` |
| subagent_4 code_patch | `src/api/client.ts`, `src/types/analytics-api.ts` |
| subagent_5 tool_use | `npm run build:analytics`, smoke scripts |

## Reuse contract

Components exported from `analytics-app/src/portable/index.ts` are the **only** surfaces promoted to `inneranimalmedia/dashboard/components/analytics/portable/`.

## Validation

1. `npm run build:analytics` — zero TS errors  
2. `/dashboard/overview` loads React (not legacy `dashboard.js`)  
3. Network tab shows `GET /api/analytics/overview` 200  
4. No mock data objects in `src/pages/*`

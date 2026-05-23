# Porting analytics-ui to inneranimalmedia

This Vite app is the **sandbox build target** for `wf_analytics_dashboard_three_page_e2e`.
Components under `src/components/` are **portable** — no cms-editor-specific imports.

## Copy map

| Sandbox (agentsam-cms-editor) | Production (inneranimalmedia) |
|-------------------------------|-------------------------------|
| `analytics-app/src/components/kpi/*` | `dashboard/components/analytics/portable/kpi/` |
| `analytics-app/src/components/charts/*` | `dashboard/components/analytics/portable/charts/` |
| `analytics-app/src/components/tables/*` | `dashboard/components/analytics/portable/tables/` |
| `analytics-app/src/styles/tokens.css` | `dashboard/styles/analytics-tokens.css` (import once in layout) |
| `analytics-app/src/types/analytics-api.ts` | Extend `dashboard/components/analytics/types.ts` |
| `analytics-app/src/lib/format.ts` | `dashboard/lib/formatAnalytics.ts` or reuse `@/lib/formatCost` |

## API adapter

| Sandbox endpoint | Production endpoint |
|------------------|---------------------|
| `GET /api/analytics/overview` | `GET /api/analytics/overview?range=7d` (richer `PulseResponse`) |
| `GET /api/analytics/health` | Combine `source-health` + deploy panels |
| `GET /api/analytics/finance` | `GET /api/analytics/costs` tab data |

Wrap production fetch in `analytics-app/src/api/client.ts` shape so pages stay unchanged.

## Host integration

```tsx
// dashboard/App.tsx — lazy route
const AnalyticsOverview = lazy(() => import('./components/analytics/tabs/OverviewTab'));
// Or embed sandbox pages after port:
import { OverviewPage } from './components/analytics/portable/pages/OverviewPage';
```

Use existing `AnalyticsShell` + `AnalyticsHeader` from `dashboard/components/analytics/` for chrome; swap tab bodies with portable KPI/chart components.

## Rules for workflow-generated code

1. Only use CSS variables from `tokens.css`
2. No hardcoded `tenant_id` / `workspace_id`
3. Data via `analyticsApi` or injected `loader` prop
4. One component per file under `components/<area>/`
5. Export from `src/portable/index.ts` when stable

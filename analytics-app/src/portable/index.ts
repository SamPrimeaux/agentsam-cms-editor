/**
 * Portable exports — copy this barrel + components into inneranimalmedia:
 *   dashboard/components/analytics/portable/
 *
 * Dependencies in host app: react, react-router-dom, recharts
 * Styles: import tokens.css in host global or analytics layout
 */

export { KpiCard } from "@/components/kpi/KpiCard";
export { KpiGrid } from "@/components/kpi/KpiGrid";
export { ActivityLineChart } from "@/components/charts/ActivityLineChart";
export { SimpleTable } from "@/components/tables/SimpleTable";
export { DashboardShell } from "@/components/shell/DashboardShell";
export type {
  OverviewResponse,
  HealthResponse,
  FinanceResponse,
} from "@/types/analytics-api";
export { fmtNumber, fmtUsd, fmtPct } from "@/lib/format";

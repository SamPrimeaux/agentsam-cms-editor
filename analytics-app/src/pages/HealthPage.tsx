import { analyticsApi } from "@/api/client";
import { KpiCard } from "@/components/kpi/KpiCard";
import { KpiGrid } from "@/components/kpi/KpiGrid";
import { SimpleTable } from "@/components/tables/SimpleTable";
import { PresenceInline } from "@/features/presence";
import { useAnalyticsQuery } from "@/hooks/useAnalyticsQuery";
import { fmtNumber, fmtPct } from "@/lib/format";

function errorPill(pct: number | null | undefined) {
  const v = Number(pct) || 0;
  const cls = v > 10 ? "bad" : v > 2 ? "warn" : "good";
  return <span className={`pill ${cls}`}>{fmtPct(pct, 1)}</span>;
}

export function HealthPage() {
  const { data, error, loading } = useAnalyticsQuery(() => analyticsApi.health(), []);

  if (loading) {
    return <PresenceInline mode="workflow" state="loading" title="Loading health" label="Workflow" />;
  }
  if (error) {
    return (
      <PresenceInline
        mode="workflow"
        state="failed"
        title="Health check failed"
        description={String(error)}
        label="Workflow"
        tone="danger"
      />
    );
  }
  if (!data) return null;

  const c = data.core;
  const dep = data.deployTotal;

  return (
    <>
      <p className="analytics-status">Platform health · {data.generated_at}</p>
      <KpiGrid>
        <KpiCard label="Avg latency (24h)" value={`${fmtNumber(c?.avg_latency_ms, 0)} ms`} />
        <KpiCard label="P99 latency" value={`${fmtNumber(c?.p99_latency_ms, 0)} ms`} />
        <KpiCard label="Error rate" value={fmtPct(c?.error_rate_pct)} />
        <KpiCard label="Deploys (all time)" value={fmtNumber(dep?.total_deploys, 0)} />
      </KpiGrid>
      <div className="analytics-grid-2">
        <div className="analytics-panel">
          <h2>Provider status (24h ETO)</h2>
          <SimpleTable
            rows={data.providers}
            empty="No ETO events in last 24h"
            columns={[
              { key: "p", header: "Provider", render: (r) => r.provider },
              { key: "t", header: "Events", render: (r) => fmtNumber(r.total, 0) },
              { key: "f", header: "Failures", render: (r) => fmtNumber(r.failures, 0) },
              {
                key: "e",
                header: "Error",
                render: (r) => errorPill(r.error_pct as number | null),
              },
              { key: "m", header: "Avg ms", render: (r) => fmtNumber(r.avg_ms, 0) },
            ]}
          />
        </div>
        <div>
          <div className="analytics-panel">
            <h2>Thompson by task type</h2>
            <SimpleTable
              rows={data.thompsonByTask}
              columns={[
                { key: "t", header: "Task", render: (r) => r.task_type },
                { key: "a", header: "Arms", render: (r) => fmtNumber(r.arms, 0) },
                { key: "s", header: "Signal", render: (r) => fmtNumber(r.arms_with_signal, 0) },
                { key: "x", header: "Exec", render: (r) => fmtNumber(r.total_execs, 0) },
              ]}
            />
          </div>
          <div className="analytics-panel">
            <h2>Last deploy</h2>
            <p className="muted">{dep?.last_deploy_at || "—"}</p>
          </div>
        </div>
      </div>
    </>
  );
}

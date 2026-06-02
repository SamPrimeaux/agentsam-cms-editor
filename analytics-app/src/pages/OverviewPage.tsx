import { analyticsApi } from "@/api/client";
import { ActivityLineChart } from "@/components/charts/ActivityLineChart";
import { KpiCard } from "@/components/kpi/KpiCard";
import { KpiGrid } from "@/components/kpi/KpiGrid";
import { SimpleTable } from "@/components/tables/SimpleTable";
import { PresenceInline } from "@/features/presence";
import { useAnalyticsQuery } from "@/hooks/useAnalyticsQuery";
import { fmtNumber, fmtPct, fmtUsd } from "@/lib/format";

export function OverviewPage() {
  const { data, error, loading } = useAnalyticsQuery(() => analyticsApi.overview(), []);

  if (loading) {
    return <PresenceInline mode="workflow" state="loading" title="Loading overview" label="Workflow" />;
  }
  if (error) {
    return (
      <PresenceInline
        mode="workflow"
        state="failed"
        title="Overview failed"
        description={String(error)}
        label="Workflow"
        tone="danger"
      />
    );
  }
  if (!data) return null;

  const p = data.platform;

  return (
    <>
      <p className="analytics-status">Live D1 · {data.generated_at}</p>
      <KpiGrid>
        <KpiCard label="Active users (28d)" value={fmtNumber(p?.active_users_28d, 0)} />
        <KpiCard label="Workflow runs today" value={fmtNumber(p?.runs_today, 0)} />
        <KpiCard label="AI cost (30d)" value={fmtUsd(p?.cost_30d)} />
        <KpiCard label="ETO error rate (24h)" value={fmtPct(p?.error_rate_24h)} />
      </KpiGrid>
      <div className="analytics-grid-2">
        <div className="analytics-panel">
          <h2>Workflow runs (30d)</h2>
          <ActivityLineChart data={data.activity} dataKey="runs" />
        </div>
        <div>
          <div className="analytics-panel">
            <h2>Thompson arms</h2>
            <p className="muted">
              {fmtNumber(data.arms?.active_arms)} active / {fmtNumber(data.arms?.total_arms)}{" "}
              total · {fmtNumber(data.arms?.total_executions)} executions
            </p>
          </div>
          <div className="analytics-panel">
            <h2>Top models (win rate)</h2>
            <SimpleTable
              rows={data.topModels}
              empty="No arms with signal yet"
              columns={[
                { key: "m", header: "Model", render: (r) => r.model_key },
                { key: "p", header: "Provider", render: (r) => r.provider },
                { key: "w", header: "Win", render: (r) => fmtNumber(r.win_rate, 3) },
                { key: "e", header: "Exec", render: (r) => fmtNumber(r.total_executions, 0) },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}

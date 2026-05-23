import { analyticsApi } from "@/api/client";
import { ActivityLineChart } from "@/components/charts/ActivityLineChart";
import { KpiCard } from "@/components/kpi/KpiCard";
import { KpiGrid } from "@/components/kpi/KpiGrid";
import { SimpleTable } from "@/components/tables/SimpleTable";
import { useAnalyticsQuery } from "@/hooks/useAnalyticsQuery";
import { fmtNumber, fmtUsd } from "@/lib/format";

export function FinancePage() {
  const { data, error, loading } = useAnalyticsQuery(() => analyticsApi.finance(), []);

  if (loading) return <p className="analytics-status">Loading cost intelligence…</p>;
  if (error) return <p className="analytics-status err">Failed: {error}</p>;
  if (!data) return null;

  const wai = data.workersAi;

  return (
    <>
      <p className="analytics-status">AI Cost Intelligence · {data.generated_at}</p>
      <KpiGrid>
        <KpiCard label="Total AI spend (30d)" value={fmtUsd(data.summary.total_spend_30d)} />
        <KpiCard label="Projected annual" value={fmtUsd(data.summary.projected_annual, 2)} />
        <KpiCard label="WAI calls (30d)" value={fmtNumber(wai?.wai_calls, 0)} />
        <KpiCard
          label="WAI est. neurons"
          value={`~${fmtUsd(wai?.estimated_neuron_cost_usd)}`}
        />
      </KpiGrid>
      <p className="muted" style={{ fontSize: 12, marginTop: -8, marginBottom: 12 }}>
        Workers AI: neuron cost is approximate ($0.011 / 1k neurons). Token count used as
        conservative proxy.
      </p>
      <div className="analytics-grid-2">
        <div className="analytics-panel">
          <h2>Daily cost trend</h2>
          <ActivityLineChart data={data.dailyTrend} dataKey="daily_cost" />
        </div>
        <div className="analytics-panel">
          <h2>Spend by model</h2>
          <SimpleTable
            rows={data.spendByModel.slice(0, 12)}
            empty="No billed ETO events"
            columns={[
              { key: "pr", header: "Provider", render: (r) => r.provider },
              { key: "mk", header: "Model", render: (r) => r.model_key },
              { key: "c", header: "Cost", render: (r) => fmtUsd(r.total_cost) },
              { key: "n", header: "Calls", render: (r) => fmtNumber(r.calls, 0) },
            ]}
          />
        </div>
      </div>
    </>
  );
}

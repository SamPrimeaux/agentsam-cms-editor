import { all, first } from "../lib/d1";

/** Cost Intelligence — repurposed Finance dashboard API */
export async function getCostIntelligence(db: D1Database) {
  const [spendByModel, costEfficiency, dailyTrend, workersAi] = await Promise.all([
    all(
      db,
      `SELECT provider, model_key,
        COUNT(*) AS calls,
        ROUND(SUM(cost_usd), 4) AS total_cost,
        ROUND(AVG(cost_usd), 6) AS avg_cost_per_call,
        ROUND(AVG(quality_score), 3) AS avg_quality
      FROM agentsam_performance_eto_events
      WHERE created_at > datetime('now', '-30 days')
        AND cost_usd > 0
      GROUP BY provider, model_key
      ORDER BY total_cost DESC`
    ),

    all(
      db,
      `SELECT provider,
        ROUND(SUM(cost_usd), 4) AS total_cost,
        COUNT(CASE WHEN success = 1 THEN 1 END) AS successes,
        ROUND(SUM(cost_usd) /
          NULLIF(COUNT(CASE WHEN success = 1 THEN 1 END), 0), 6
        ) AS cost_per_success
      FROM agentsam_performance_eto_events
      WHERE cost_usd > 0
        AND created_at > datetime('now', '-30 days')
      GROUP BY provider
      ORDER BY total_cost DESC`
    ),

    all(
      db,
      `SELECT DATE(created_at) AS day,
        ROUND(SUM(cost_usd), 4) AS daily_cost,
        COUNT(*) AS events,
        COUNT(CASE WHEN success = 1 THEN 1 END) AS successes
      FROM agentsam_performance_eto_events
      WHERE created_at > datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY day ASC`
    ),

    first(
      db,
      `SELECT
        COUNT(*) AS wai_calls,
        SUM(input_tokens + output_tokens) AS total_tokens,
        ROUND(SUM(input_tokens + output_tokens) / 1000.0 * 0.011, 4
        ) AS estimated_neuron_cost_usd
      FROM agentsam_performance_eto_events
      WHERE provider = 'workers_ai'
        AND created_at > datetime('now', '-30 days')`
    )
  ]);

  const totalSpend30d = spendByModel.reduce(
    (sum, row) => sum + Number(row.total_cost ?? 0),
    0
  );

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    summary: {
      total_spend_30d: Math.round(totalSpend30d * 10000) / 10000,
      projected_annual: Math.round(totalSpend30d * 12 * 100) / 100
    },
    spendByModel,
    costEfficiency,
    dailyTrend,
    workersAi
  };
}

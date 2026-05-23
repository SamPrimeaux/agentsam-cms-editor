from datetime import datetime, timezone

from lib import d1
from lib.d1 import row_val


async def get_cost_intelligence(db):
    spend = await d1.all_rows(
        db,
        """
      SELECT provider, model_key,
        COUNT(*) AS calls,
        ROUND(SUM(cost_usd), 4) AS total_cost,
        ROUND(AVG(cost_usd), 6) AS avg_cost_per_call,
        ROUND(AVG(quality_score), 3) AS avg_quality
      FROM agentsam_performance_eto_events
      WHERE created_at > datetime('now', '-30 days')
        AND cost_usd > 0
      GROUP BY provider, model_key
      ORDER BY total_cost DESC
      """,
    )
    efficiency = await d1.all_rows(
        db,
        """
      SELECT provider,
        ROUND(SUM(cost_usd), 4) AS total_cost,
        COUNT(CASE WHEN success = 1 THEN 1 END) AS successes,
        ROUND(SUM(cost_usd) /
          NULLIF(COUNT(CASE WHEN success = 1 THEN 1 END), 0), 6
        ) AS cost_per_success
      FROM agentsam_performance_eto_events
      WHERE cost_usd > 0
        AND created_at > datetime('now', '-30 days')
      GROUP BY provider
      ORDER BY total_cost DESC
      """,
    )
    daily = await d1.all_rows(
        db,
        """
      SELECT DATE(created_at) AS day,
        ROUND(SUM(cost_usd), 4) AS daily_cost,
        COUNT(*) AS events,
        COUNT(CASE WHEN success = 1 THEN 1 END) AS successes
      FROM agentsam_performance_eto_events
      WHERE created_at > datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY day ASC
      """,
    )
    workers_ai = await d1.first(
        db,
        """
      SELECT
        COUNT(*) AS wai_calls,
        SUM(input_tokens + output_tokens) AS total_tokens,
        ROUND(SUM(input_tokens + output_tokens) / 1000.0 * 0.011, 4
        ) AS estimated_neuron_cost_usd
      FROM agentsam_performance_eto_events
      WHERE provider = 'workers_ai'
        AND created_at > datetime('now', '-30 days')
      """,
    )
    total = sum(float(row_val(r, "total_cost") or 0) for r in spend)
    return {
        "ok": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_spend_30d": round(total, 4),
            "projected_annual": round(total * 12, 2),
        },
        "spendByModel": spend,
        "costEfficiency": efficiency,
        "dailyTrend": daily,
        "workersAi": workers_ai,
    }

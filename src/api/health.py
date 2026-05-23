import asyncio
from datetime import datetime, timezone

from lib import d1


async def get_health(db):
    core, providers, thompson, deploy_history, deploy_total = await asyncio.gather(
        d1.first(
            db,
            """
      SELECT
        ROUND(AVG(latency_ms), 0) AS avg_latency_ms,
        ROUND(MAX(latency_ms), 0) AS p99_latency_ms,
        ROUND(SUM(CASE WHEN failure = 1 THEN 1.0 ELSE 0 END)
          / NULLIF(COUNT(*), 0) * 100, 3) AS error_rate_pct,
        COUNT(*) AS total_events,
        MAX(created_at) AS last_event_at
      FROM agentsam_performance_eto_events
      WHERE created_at > datetime('now', '-24 hours')
      """,
        ),
        d1.all_rows(
            db,
            """
      SELECT provider,
        COUNT(*) AS total,
        COUNT(CASE WHEN failure = 1 THEN 1 END) AS failures,
        ROUND(AVG(latency_ms), 0) AS avg_ms,
        ROUND(COUNT(CASE WHEN failure = 1 THEN 1.0 ELSE 0 END)
          / NULLIF(COUNT(*), 0) * 100, 1) AS error_pct,
        MAX(created_at) AS last_seen
      FROM agentsam_performance_eto_events
      WHERE created_at > datetime('now', '-24 hours')
      GROUP BY provider
      ORDER BY total DESC
      """,
        ),
        d1.all_rows(
            db,
            """
      SELECT task_type,
        COUNT(*) AS arms,
        COUNT(CASE WHEN total_executions > 0 THEN 1 END) AS arms_with_signal,
        ROUND(AVG(success_alpha / (success_alpha + success_beta)), 3) AS avg_win_rate,
        SUM(total_executions) AS total_execs
      FROM agentsam_routing_arms
      WHERE is_active = 1
      GROUP BY task_type
      ORDER BY total_execs DESC
      LIMIT 15
      """,
        ),
        d1.all_rows(
            db,
            """
      SELECT date(created_at, 'unixepoch') AS day,
        COUNT(*) AS cnt,
        status
      FROM deployments
      WHERE created_at > unixepoch('now', '-30 days')
      GROUP BY date(created_at, 'unixepoch'), status
      ORDER BY day DESC
      """,
        ),
        d1.first(
            db,
            """
      SELECT COUNT(*) AS total_deploys,
        MAX(datetime(created_at, 'unixepoch')) AS last_deploy_at
      FROM deployments
      """,
        ),
    )
    return {
        "ok": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "core": core,
        "providers": providers,
        "thompsonByTask": thompson,
        "deployHistory": deploy_history,
        "deployTotal": deploy_total,
    }

from datetime import datetime, timezone

from lib import d1

SQL_PLATFORM = """
SELECT
  (SELECT COUNT(*) FROM auth_users
   WHERE datetime(created_at) > datetime('now','-28 days')) AS active_users_28d,
  (SELECT COUNT(*) FROM agentsam_workflow_runs
   WHERE created_at > datetime('now','-1 day')) AS runs_today,
  (SELECT ROUND(COALESCE(SUM(cost_usd), 0), 4) FROM agentsam_workflow_runs
   WHERE created_at > datetime('now','-30 days')) AS cost_30d,
  (SELECT ROUND(
    COUNT(CASE WHEN failure = 1 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 3)
   FROM agentsam_performance_eto_events
   WHERE created_at > datetime('now','-24 hours')) AS error_rate_24h
"""

SQL_ACTIVITY = """
SELECT DATE(created_at) AS day,
  COUNT(*) AS runs,
  ROUND(COALESCE(SUM(cost_usd), 0), 4) AS cost,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed
FROM agentsam_workflow_runs
WHERE created_at > datetime('now','-30 days')
GROUP BY DATE(created_at)
ORDER BY day ASC
"""

SQL_ARMS = """
SELECT
  COUNT(*) AS total_arms,
  COUNT(CASE WHEN total_executions > 0 THEN 1 END) AS active_arms,
  COUNT(CASE WHEN is_paused = 1 THEN 1 END) AS paused_arms,
  ROUND(AVG(CASE WHEN quality_n > 0 THEN avg_quality_score END), 3) AS avg_quality,
  SUM(total_executions) AS total_executions
FROM agentsam_routing_arms
WHERE is_active = 1
"""

SQL_TOP_MODELS = """
SELECT model_key, provider, task_type,
  total_executions,
  ROUND(success_alpha / (success_alpha + success_beta), 3) AS win_rate,
  avg_quality_score
FROM agentsam_routing_arms
WHERE total_executions > 0 AND is_active = 1
ORDER BY win_rate DESC, total_executions DESC
LIMIT 10
"""


async def get_overview(db):
    platform = await d1.first(db, SQL_PLATFORM)
    activity = await d1.all_rows(db, SQL_ACTIVITY)
    arms = await d1.first(db, SQL_ARMS)
    top_models = await d1.all_rows(db, SQL_TOP_MODELS)
    return {
        "ok": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "platform": platform,
        "activity": activity,
        "arms": arms,
        "topModels": top_models,
    }

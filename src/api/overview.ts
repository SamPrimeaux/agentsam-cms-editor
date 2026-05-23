import { all, first } from "../lib/d1";

export async function getOverview(db: D1Database) {
  const [platform, activity, arms, topModels] = await Promise.all([
    first(
      db,
      `SELECT
        (SELECT COUNT(*) FROM auth_users
         WHERE datetime(created_at) > datetime('now','-28 days')) AS active_users_28d,
        (SELECT COUNT(*) FROM agentsam_workflow_runs
         WHERE created_at > datetime('now','-1 day')) AS runs_today,
        (SELECT ROUND(COALESCE(SUM(cost_usd), 0), 4) FROM agentsam_workflow_runs
         WHERE created_at > datetime('now','-30 days')) AS cost_30d,
        (SELECT ROUND(
          COUNT(CASE WHEN failure = 1 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 3)
         FROM agentsam_performance_eto_events
         WHERE created_at > datetime('now','-24 hours')) AS error_rate_24h`
    ),

    all(
      db,
      `SELECT DATE(created_at) AS day,
        COUNT(*) AS runs,
        ROUND(COALESCE(SUM(cost_usd), 0), 4) AS cost,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed
      FROM agentsam_workflow_runs
      WHERE created_at > datetime('now','-30 days')
      GROUP BY DATE(created_at)
      ORDER BY day ASC`
    ),

    first(
      db,
      `SELECT
        COUNT(*) AS total_arms,
        COUNT(CASE WHEN total_executions > 0 THEN 1 END) AS active_arms,
        COUNT(CASE WHEN is_paused = 1 THEN 1 END) AS paused_arms,
        ROUND(AVG(CASE WHEN quality_n > 0 THEN avg_quality_score END), 3) AS avg_quality,
        SUM(total_executions) AS total_executions
      FROM agentsam_routing_arms
      WHERE is_active = 1`
    ),

    all(
      db,
      `SELECT model_key, provider, task_type,
        total_executions,
        ROUND(success_alpha / (success_alpha + success_beta), 3) AS win_rate,
        avg_quality_score
      FROM agentsam_routing_arms
      WHERE total_executions > 0 AND is_active = 1
      ORDER BY win_rate DESC, total_executions DESC
      LIMIT 10`
    )
  ]);

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    platform,
    activity,
    arms,
    topModels
  };
}

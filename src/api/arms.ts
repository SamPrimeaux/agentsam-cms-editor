import { all, first } from "../lib/d1";

export type ArmsQuery = {
  task_type?: string | null;
  mode?: string | null;
  limit?: number;
};

export async function getArms(db: D1Database, query: ArmsQuery) {
  const taskType = query.task_type?.trim() || null;
  const mode = query.mode?.trim() || null;
  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100);

  const summary = await first(
    db,
    `SELECT
      COUNT(*) AS total_arms,
      COUNT(CASE WHEN total_executions > 0 THEN 1 END) AS active_arms,
      COUNT(CASE WHEN is_paused = 1 THEN 1 END) AS paused_arms
    FROM agentsam_routing_arms
    WHERE is_active = 1
      AND (? IS NULL OR task_type = ?)
      AND (? IS NULL OR mode = ?)`,
    taskType,
    taskType,
    mode,
    mode
  );

  const arms = await all(
    db,
    `SELECT
      id,
      task_type,
      mode,
      model_key,
      provider,
      agent_slug,
      total_executions,
      is_paused,
      is_eligible,
      ROUND(success_alpha / (success_alpha + success_beta), 4) AS win_rate,
      success_alpha,
      success_beta,
      avg_quality_score,
      quality_n,
      decayed_score,
      updated_at
    FROM agentsam_routing_arms
    WHERE is_active = 1
      AND (? IS NULL OR task_type = ?)
      AND (? IS NULL OR mode = ?)
    ORDER BY
      CASE WHEN total_executions > 0 THEN 0 ELSE 1 END,
      (success_alpha / (success_alpha + success_beta)) DESC,
      total_executions DESC
    LIMIT ?`,
    taskType,
    taskType,
    mode,
    mode,
    limit
  );

  const leader =
    arms.find((a) => Number(a.total_executions) > 0) ?? arms[0] ?? null;

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    filters: { task_type: taskType, mode },
    summary,
    leader,
    arms
  };
}

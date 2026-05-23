from datetime import datetime, timezone

from lib import d1
from lib.d1 import row_val


async def get_arms(db, task_type=None, mode=None, limit=25):
    task_type = (task_type or "").strip() or None
    mode = (mode or "").strip() or None
    limit = max(1, min(int(limit or 25), 100))

    where = ["is_active = 1"]
    bindings: list = []
    if task_type:
        where.append("task_type = ?")
        bindings.append(task_type)
    if mode:
        where.append("mode = ?")
        bindings.append(mode)
    clause = " AND ".join(where)

    summary = await d1.first(
        db,
        f"""
    SELECT
      COUNT(*) AS total_arms,
      COUNT(CASE WHEN total_executions > 0 THEN 1 END) AS active_arms,
      COUNT(CASE WHEN is_paused = 1 THEN 1 END) AS paused_arms
    FROM agentsam_routing_arms
    WHERE {clause}
    """,
        *bindings,
    )

    arms = await d1.all_rows(
        db,
        f"""
    SELECT
      id, task_type, mode, model_key, provider, agent_slug,
      total_executions, is_paused, is_eligible,
      ROUND(success_alpha / NULLIF(success_alpha + success_beta, 0), 4) AS win_rate,
      success_alpha, success_beta, avg_quality_score, quality_n,
      decayed_score, updated_at
    FROM agentsam_routing_arms
    WHERE {clause}
    ORDER BY
      CASE WHEN total_executions > 0 THEN 0 ELSE 1 END,
      (success_alpha / NULLIF(success_alpha + success_beta, 0)) DESC,
      total_executions DESC
    LIMIT {limit}
    """,
        *bindings,
    )

    leader = None
    for row in arms:
        if row and int(row_val(row, "total_executions") or 0) > 0:
            leader = row
            break
    if leader is None and arms:
        leader = arms[0]

    return {
        "ok": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "filters": {"task_type": task_type, "mode": mode},
        "summary": summary,
        "leader": leader,
        "arms": arms,
    }

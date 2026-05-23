import { all, first } from "../lib/d1";

/** Eval proof status — artifacts live in evals/results/ (git); runtime reads D1 + manifest hint */
export async function getEvalStatus(db: D1Database) {
  let evalRuns: { tier: string; last_run: string | null; count: number }[] = [];
  let tablePresent = false;

  try {
    const row = await first<{ n: number }>(
      db,
      `SELECT COUNT(*) AS n FROM sqlite_master
       WHERE type = 'table' AND name = 'agentsam_eval_runs'`
    );
    tablePresent = Number(row?.n ?? 0) > 0;
    if (tablePresent) {
      evalRuns = await all(
        db,
        `SELECT
          COALESCE(eval_tier, 'unknown') AS tier,
          MAX(created_at) AS last_run,
          COUNT(*) AS count
        FROM agentsam_eval_runs
        GROUP BY COALESCE(eval_tier, 'unknown')
        ORDER BY last_run DESC`
      );
    }
  } catch {
    tablePresent = false;
  }

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    artifacts_dir: "evals/results/",
    note: "Committed JSON under evals/results/ is the git proof timeline; POST /api/evals/trigger ships in Phase 4.",
    tier1: {
      name: "Intent Classification",
      script: "evals/tier1_intent_classification.py",
      last_run: evalRuns.find((r) => r.tier === "tier1")?.last_run ?? null,
      arms_updated: 0,
      best_model: null
    },
    tier2: {
      name: "Subagent Spawn",
      script: "evals/tier2_subagent_spawn.py",
      last_run: evalRuns.find((r) => r.tier === "tier2")?.last_run ?? null,
      scenarios_completed: 0,
      scenarios_total: 5,
      best_combo: null
    },
    d1_eval_runs: tablePresent ? evalRuns : null
  };
}

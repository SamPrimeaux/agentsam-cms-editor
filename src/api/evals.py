from datetime import datetime, timezone

from lib import d1
from lib.d1 import row_val


async def get_eval_status(db):
    table_present = False
    eval_runs = []
    try:
        row = await d1.first(
            db,
            "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'agentsam_eval_runs'",
        )
        table_present = int(row_val(row, "n") or 0) > 0 if row else False
        if table_present:
            eval_runs = await d1.all_rows(
                db,
                """
        SELECT
          COALESCE(eval_tier, 'unknown') AS tier,
          MAX(created_at) AS last_run,
          COUNT(*) AS count
        FROM agentsam_eval_runs
        GROUP BY COALESCE(eval_tier, 'unknown')
        ORDER BY last_run DESC
        """,
            )
    except Exception:
        table_present = False

    def tier_last(name):
        for r in eval_runs:
            if row_val(r, "tier") == name:
                return row_val(r, "last_run")
        return None

    return {
        "ok": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "artifacts_dir": "evals/results/",
        "note": "POST /api/evals/run executes tier1 stub inside Worker; full suite via CLI.",
        "tier1": {
            "name": "Intent Classification",
            "script": "evals/tier1_intent_classification.py",
            "last_run": tier_last("tier1"),
            "arms_updated": 0,
            "best_model": None,
        },
        "tier2": {
            "name": "Subagent Spawn",
            "script": "evals/tier2_subagent_spawn.py",
            "last_run": tier_last("tier2"),
            "scenarios_completed": 0,
            "scenarios_total": 5,
            "best_combo": None,
        },
        "d1_eval_runs": eval_runs if table_present else None,
    }

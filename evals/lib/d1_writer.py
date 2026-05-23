"""Persist eval artifacts + proposed Thompson deltas (never auto-apply arms)."""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from evals.lib.scoring import alpha_delta, beta_delta, thompson_success

ACCOUNT_ID = "ede6590ac0d2fb7daf155b35653457b2"
D1_DATABASE_ID = "cf87b717-d4e2-4cf8-bab0-a81268e32d49"
API = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{D1_DATABASE_ID}/query"


def _d1_query(sql: str, params: list | None = None) -> dict:
    import urllib.error
    import urllib.request

    token = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    if not token:
        raise RuntimeError("CLOUDFLARE_API_TOKEN required for D1 writes")

    body: dict = {"sql": sql}
    if params:
        body["params"] = params

    req = urllib.request.Request(
        API,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as res:
        payload = json.loads(res.read().decode())
    if not payload.get("success"):
        raise RuntimeError(json.dumps(payload)[:1500])
    return payload


def build_tier1_proposals(rows: list[dict], by_model: dict[str, dict]) -> list[dict]:
    """Proposed alpha/beta deltas per arm_id — review before apply."""
    proposals: list[dict] = []
    arm_stats: dict[str, dict[str, Any]] = {}

    for row in rows:
        arm_id = row["model"].get("arm_id")
        if not arm_id:
            continue
        bucket = arm_stats.setdefault(
            arm_id,
            {"n": 0, "score_sum": 0.0, "model_key": row["model"]["model_key"]},
        )
        bucket["n"] += 1
        bucket["score_sum"] += row["score"]

    for arm_id, st in arm_stats.items():
        avg = st["score_sum"] / max(st["n"], 1)
        a_d = round(alpha_delta(avg) * st["n"], 4) if thompson_success(avg) else 0.0
        b_d = round(beta_delta(avg) * st["n"], 4)
        proposals.append(
            {
                "arm_id": arm_id,
                "model_key": st["model_key"],
                "eval_cases": st["n"],
                "avg_score": round(avg, 4),
                "proposed_alpha_delta": a_d,
                "proposed_beta_delta": b_d,
                "apply_sql_preview": (
                    f"UPDATE agentsam_routing_arms SET "
                    f"success_alpha = success_alpha + {a_d}, "
                    f"success_beta = success_beta + {b_d}, "
                    f"updated_at = unixepoch() WHERE id = '{arm_id}';"
                ),
            }
        )

    # Eval-only winners (no arm_id) — flag for arm creation
    for mk, stats in by_model.items():
        if stats.get("arm_id"):
            continue
        cal = stats.get("calibration_gap")
        if stats.get("accuracy", 0) >= 0.85 and cal is not None and cal > 0.2:
            proposals.append(
                {
                    "arm_id": None,
                    "model_key": mk,
                    "action": "consider_create_arm",
                    "accuracy": stats.get("accuracy"),
                    "calibration_gap": stats.get("calibration_gap"),
                    "note": "Eval-only candidate — create arm if promoted after review.",
                }
            )
    return proposals


def write_artifact(path: Path, payload: dict) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n")
    return path


def write_eval_run_rows(
    suite_id: str,
    rows: list[dict],
    *,
    dry_run: bool = True,
) -> int:
    """Insert summary rows into agentsam_eval_runs (grader_notes = proposed deltas JSON)."""
    if dry_run:
        return 0

    written = 0
    now = datetime.now(timezone.utc).isoformat()
    for row in rows[:200]:
        run_id = f"eval_{uuid.uuid4().hex[:12]}"
        notes = json.dumps(
            {
                "predicted": row.get("predicted"),
                "expected": row.get("expected"),
                "score": row.get("score"),
                "confidence": row.get("confidence"),
                "proposed_alpha_delta": row.get("proposed_alpha_delta"),
                "proposed_beta_delta": row.get("proposed_beta_delta"),
            }
        )[:4000]
        sql = """
          INSERT INTO agentsam_eval_runs (
            id, suite_id, case_id, model_key, provider,
            input_tokens, output_tokens, latency_ms, cost_usd,
            score_overall, passed, output_text, grader_notes, run_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        _d1_query(
            sql,
            [
                run_id,
                suite_id,
                row.get("case_id", "tier1"),
                row["model"]["model_key"],
                row["model"]["provider"],
                int(row.get("input_tokens") or 0),
                int(row.get("output_tokens") or 0),
                int(row.get("latency_ms") or 0),
                float(row.get("cost_usd") or 0),
                float(row.get("score") or 0),
                1 if (row.get("score") or 0) >= 0.5 else 0,
                str(row.get("predicted") or "")[:2000],
                notes,
                now,
            ],
        )
        written += 1
    return written

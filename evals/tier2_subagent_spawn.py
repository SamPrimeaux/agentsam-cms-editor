#!/usr/bin/env python3
"""
Tier 2 — Subagent spawn workflow stress test.

Exercises wf_gpt5_4_mini_subagent_spawn_v1-style multi-node runs across model combos.
Writes evals/results/<stamp>_tier2_subagent_spawn.json with per-node Thompson proposals.

  python3 evals/tier2_subagent_spawn.py --smoke-only
  python3 evals/tier2_subagent_spawn.py --combo all_nano
  python3 evals/tier2_subagent_spawn.py
"""
from __future__ import annotations

import argparse
import hashlib
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from evals.lib.candidates import MODEL_COMBOS, WORKFLOW_TEST_TASKS
from evals.lib.cost import estimate_usd
from evals.lib.d1_writer import write_artifact
from evals.lib.scoring import alpha_delta, beta_delta, score_workflow_run, thompson_success

RESULTS = ROOT / "evals" / "results"

NODE_KEYS = (
    "master_agent",
    "subagent_1",
    "subagent_2",
    "subagent_3",
    "subagent_4",
    "subagent_5",
)

TASK_TYPE_BY_NODE = {
    "master_agent": "multitask",
    "subagent_1": "plan",
    "subagent_2": "code",
    "subagent_3": "code",
    "subagent_4": "code_patch",
    "subagent_5": "tool_use",
}


def _combo_seed(combo_id: str, scenario: str) -> int:
    return int(hashlib.sha256(f"{combo_id}:{scenario}".encode()).hexdigest()[:8], 16)


def simulate_workflow_run(scenario: dict, combo: dict) -> dict:
    """Deterministic stub run — replace with Worker workflow trigger when wired."""
    seed = _combo_seed(combo["combo_id"], scenario["scenario"])
    quality_bias = {
        "all_mini": 0.88,
        "all_nano": 0.72,
        "wai_native": 0.68,
        "mini_master_nano_workers": 0.80,
        "thompson_live": 0.85,
    }.get(combo["combo_id"], 0.7)

    nodes = []
    node_task_types: dict[str, str] = {}
    expected = scenario["expected_node_task_types"]

    for key in NODE_KEYS:
        if key == "master_agent":
            exp_type = "multitask"
        else:
            exp_type = expected.get(key, TASK_TYPE_BY_NODE.get(key, "code"))
        # Routing accuracy: mini combos match expected more often
        match = (seed + len(key)) % 100 < int(quality_bias * 100)
        assigned = exp_type if match else TASK_TYPE_BY_NODE.get(key, "code")
        node_task_types[key] = assigned

        ok = (seed + hash(key)) % 100 < int(quality_bias * 95)
        itok = 400 + (seed % 200)
        otok = 300 + (seed % 150)
        provider = "openai" if "gpt" in str(combo.get("master", "")) else "workers_ai"
        cost, note = estimate_usd(provider, itok, otok, 0.2, 1.0, "neurons_approx" if provider == "workers_ai" else None)
        nodes.append(
            {
                "node_key": key,
                "status": "completed" if ok else "failed",
                "task_type": assigned,
                "cost_usd": cost,
                "input_tokens": itok,
                "output_tokens": otok,
                "cost_note": note,
                "output_text": f"// {scenario['scenario']} — {key} output for {assigned}\nexport default {{}};",
            }
        )

    return {
        "workflow_key": "wf_gpt5_4_mini_subagent_spawn_v1",
        "combo_id": combo["combo_id"],
        "scenario": scenario["scenario"],
        "nodes": nodes,
        "node_task_types": node_task_types,
        "duration_ms": 8000 + (seed % 4000),
    }


def build_tier2_proposals(runs: list[dict]) -> list[dict]:
    proposals: list[dict] = []
    for run in runs:
        wf_scores = run["scores"]
        if not wf_scores.get("thompson_success"):
            continue
        for node in run["run"]["nodes"]:
            if node.get("status") != "completed":
                continue
            proposals.append(
                {
                    "task_type": node.get("task_type"),
                    "node_key": node.get("node_key"),
                    "combo_id": run["combo_id"],
                    "scenario": run["scenario"],
                    "proposed_alpha_delta": alpha_delta(1.0),
                    "proposed_beta_delta": beta_delta(1.0),
                    "note": "Review before apply — ties to multitask/code/plan/tool_use arms",
                }
            )
    return proposals


def main() -> None:
    parser = argparse.ArgumentParser(description="Tier 2 subagent spawn stress test")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--smoke-only", action="store_true", help="Run smoke_baseline only")
    parser.add_argument("--combo", type=str, default=None, help="Single combo_id")
    parser.add_argument("--apply-thompson", action="store_true")
    args = parser.parse_args()

    scenarios = [t for t in WORKFLOW_TEST_TASKS if t["scenario"] == "smoke_baseline"] if args.smoke_only else WORKFLOW_TEST_TASKS
    combos = [c for c in MODEL_COMBOS if c["combo_id"] == args.combo] if args.combo else MODEL_COMBOS

    runs: list[dict] = []
    for combo in combos:
        for scenario in scenarios:
            t0 = time.time()
            run = simulate_workflow_run(scenario, combo)
            scores = score_workflow_run(run, scenario)
            runs.append(
                {
                    "combo_id": combo["combo_id"],
                    "combo_label": combo["label"],
                    "scenario": scenario["scenario"],
                    "run": run,
                    "scores": scores,
                    "elapsed_ms": int((time.time() - t0) * 1000),
                }
            )

    by_combo: dict[str, list] = {}
    for r in runs:
        by_combo.setdefault(r["combo_id"], []).append(r)

    combo_summary = {}
    for cid, items in by_combo.items():
        n = len(items)
        combo_summary[cid] = {
            "runs": n,
            "avg_completion": round(sum(x["scores"]["completion"] for x in items) / n, 3),
            "avg_quality": round(sum(x["scores"]["quality"] for x in items) / n, 3),
            "avg_routing": round(sum(x["scores"]["routing_accuracy"] for x in items) / n, 3),
            "total_cost_usd": round(sum(x["scores"]["total_cost_usd"] for x in items), 4),
            "thompson_success_rate": round(
                sum(1 for x in items if x["scores"]["thompson_success"]) / n, 3
            ),
        }

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H%M%SZ")
    out_path = RESULTS / f"{stamp}_tier2_subagent_spawn.json"
    artifact = {
        "tier": "tier2",
        "name": "subagent_spawn_stress",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "workflow_key": "wf_gpt5_4_mini_subagent_spawn_v1",
        "dry_run_thompson": not args.apply_thompson,
        "smoke_only": args.smoke_only,
        "combo_summary": combo_summary,
        "proposed_thompson_updates": build_tier2_proposals(runs),
        "runs": runs,
    }

    if args.dry_run:
        print(f"DRY RUN — {len(runs)} workflow runs")
        for cid, s in combo_summary.items():
            print(f"  {cid}: quality={s['avg_quality']} routing={s['avg_routing']} cost=${s['total_cost_usd']}")
        return

    write_artifact(out_path, artifact)
    print(f"Wrote {out_path} ({len(runs)} runs)")
    if not args.apply_thompson:
        print("Thompson: review proposed_thompson_updates, then apply_thompson_proposals.py")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Tier 1 — Intent classification eval (30 prompts × 8 models).

Taxonomy matches production routing arms. Partial credit via acceptable alternatives.
Thompson proposals written to artifact only unless --apply-thompson (use apply script).

  python3 evals/tier1_intent_classification.py --dry-run
  python3 evals/tier1_intent_classification.py
  python3 evals/tier1_intent_classification.py --live
  python3 evals/tier1_intent_classification.py --dry-run-thompson   # default
  python3 evals/tier1_intent_classification.py --write-d1             # agentsam_eval_runs rows
"""
from __future__ import annotations

import argparse
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from evals.lib.candidates import EVAL_CANDIDATES
from evals.lib.d1_writer import (
    build_tier1_proposals,
    write_artifact,
    write_eval_run_rows,
)
from evals.lib.providers import classify_intent
from evals.lib.scoring import (
    aggregate_tier1_by_model,
    alpha_delta,
    beta_delta,
    score,
    thompson_success,
)
from evals.lib.taxonomy import PROMPT_CASES, TRAFFIC_WEIGHTS

RESULTS = ROOT / "evals" / "results"


def main() -> None:
    parser = argparse.ArgumentParser(description="Tier 1 intent classification eval")
    parser.add_argument("--dry-run", action="store_true", help="Print summary only")
    parser.add_argument("--live", action="store_true", help="Call provider APIs when keys set")
    parser.add_argument(
        "--apply-thompson",
        action="store_true",
        help="Mark artifact for Thompson apply (run evals/apply_thompson_proposals.py after review)",
    )
    parser.add_argument("--write-d1", action="store_true", help="Insert agentsam_eval_runs rows")
    parser.add_argument("--limit-models", type=int, default=len(EVAL_CANDIDATES))
    args = parser.parse_args()

    dry_run_thompson = not args.apply_thompson

    models = EVAL_CANDIDATES[: args.limit_models]
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H%M%SZ")
    out_path = RESULTS / f"{stamp}_tier1_intent_classification.json"

    rows: list[dict] = []
    for i, case in enumerate(PROMPT_CASES):
        for model in models:
            t0 = time.time()
            out = classify_intent(
                case["prompt"],
                model,
                expected=case["expected"],
                live=args.live,
            )
            s = score(out["predicted"], case["expected"])
            latency = int((time.time() - t0) * 1000)
            rows.append(
                {
                    "case_id": f"t1_{i:02d}",
                    "prompt": case["prompt"],
                    "expected": case["expected"],
                    "acceptable": sorted(case["acceptable"]),
                    "difficulty": case["difficulty"],
                    "category": case["category"],
                    "predicted": out["predicted"],
                    "confidence": out["confidence"],
                    "score": s,
                    "thompson_success": thompson_success(s),
                    "proposed_alpha_delta": alpha_delta(s),
                    "proposed_beta_delta": beta_delta(s),
                    "model": model,
                    "latency_ms": latency,
                    "input_tokens": out.get("input_tokens", 0),
                    "output_tokens": out.get("output_tokens", 0),
                    "cost_usd": out.get("cost_usd", 0),
                    "cost_note": out.get("cost_note"),
                    "raw": (out.get("raw") or "")[:500],
                    "error": out.get("error"),
                }
            )

    by_model = aggregate_tier1_by_model(rows)
    proposals = build_tier1_proposals(rows, by_model)

    artifact = {
        "tier": "tier1",
        "name": "intent_classification",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dry_run": args.dry_run,
        "live_providers": args.live,
        "dry_run_thompson": dry_run_thompson,
        "traffic_weights": TRAFFIC_WEIGHTS,
        "prompts_count": len(PROMPT_CASES),
        "models_count": len(models),
        "primary_metric": "cost_per_correct_classification_at_10k_day",
        "by_model": by_model,
        "proposed_thompson_updates": proposals,
        "results": rows,
        "summary": {
            "total_rows": len(rows),
            "avg_score": round(sum(r["score"] for r in rows) / max(len(rows), 1), 4),
            "models_tested": list(by_model.keys()),
        },
    }

    if args.dry_run:
        print(f"DRY RUN — would write {out_path}")
        print(f"Models: {len(models)}  Prompts: {len(PROMPT_CASES)}  Rows: {len(rows)}")
        for mk, stats in sorted(by_model.items(), key=lambda x: -x[1]["accuracy"]):
            gap = stats.get("calibration_gap")
            print(
                f"  {mk}: acc={stats['accuracy']:.3f} cal_gap={gap} "
                f"$/correct@10k={stats.get('cost_per_correct_at_10k_day')}"
            )
        return

    write_artifact(out_path, artifact)
    print(f"Wrote {out_path}")

    if args.write_d1:
        n = write_eval_run_rows(
            "tier1_intent_classification",
            rows,
            dry_run=dry_run_thompson,
        )
        print(f"D1 agentsam_eval_runs rows written: {n}")

    if dry_run_thompson:
        print("Thompson: proposed deltas in artifact only. Review then:")
        print("  python3 evals/apply_thompson_proposals.py --artifact", out_path)


if __name__ == "__main__":
    main()

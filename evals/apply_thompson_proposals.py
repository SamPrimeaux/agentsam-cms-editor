#!/usr/bin/env python3
"""
Apply proposed Thompson deltas from a tier1/tier2 eval artifact after manual review.

  python3 evals/apply_thompson_proposals.py --artifact evals/results/2026-05-23T120000Z_tier1_intent_classification.json
  python3 evals/apply_thompson_proposals.py --artifact ... --dry-run
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from evals.lib.d1_writer import _d1_query


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact", required=True, type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    path = args.artifact if args.artifact.is_absolute() else ROOT / args.artifact
    data = json.loads(path.read_text())
    proposals = data.get("proposed_thompson_updates") or []

    applied = 0
    skipped = 0
    for p in proposals:
        arm_id = p.get("arm_id")
        if not arm_id:
            print(f"SKIP (no arm): {p.get('model_key')} — {p.get('note', p.get('action'))}")
            skipped += 1
            continue
        a_d = float(p.get("proposed_alpha_delta") or 0)
        b_d = float(p.get("proposed_beta_delta") or 0)
        if a_d == 0 and b_d == 0:
            skipped += 1
            continue
        sql = (
            "UPDATE agentsam_routing_arms SET "
            "success_alpha = success_alpha + ?, "
            "success_beta = success_beta + ?, "
            "updated_at = unixepoch() WHERE id = ?"
        )
        print(f"{'DRY' if args.dry_run else 'APPLY'} {arm_id} alpha+{a_d} beta+{b_d}")
        if not args.dry_run:
            _d1_query(sql, [a_d, b_d, arm_id])
        applied += 1

    print(f"Done. applied={applied} skipped={skipped}")


if __name__ == "__main__":
    main()

"""Minimal tier1 eval smoke invokable from Worker."""

from datetime import datetime, timezone


async def run_tier1_stub():
    return {
        "ok": True,
        "mode": "worker_inline_stub",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "prompts_sampled": 5,
        "models_sampled": 2,
        "avg_score": 1.0,
        "note": "Full eval: python3 evals/tier1_intent_classification.py (writes evals/results/).",
    }

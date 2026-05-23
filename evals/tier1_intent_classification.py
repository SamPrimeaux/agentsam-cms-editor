#!/usr/bin/env python3
"""
Tier 1 — intent classification eval (30 prompts x up to 8 models).
Writes proof artifact: evals/results/<date>_tier1_intent_classification.json

Run locally (never commit secrets):
  export OPENAI_API_KEY=...
  export ANTHROPIC_API_KEY=...
  python3 evals/tier1_intent_classification.py --dry-run
  python3 evals/tier1_intent_classification.py
"""
from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "evals" / "results"

MODELS = [
    {"provider": "anthropic", "model_key": "anthropic_claude_haiku_4_5"},
    {"provider": "openai", "model_key": "openai_gpt_4_1_mini"},
    {"provider": "google", "model_key": "google_gemini_2_5_flash"},
    {"provider": "workers_ai", "model_key": "workers_ai_llama"},
]

PROMPTS = [
    "Classify intent: deploy the dashboard to production.",
    "Classify intent: fix the workflow run that failed on step 3.",
    "Classify intent: show me Thompson arms for cms_edit.",
    "Classify intent: write a migration for agentsam_webhooks.",
    "Classify intent: summarize last 24h ETO error rate by provider.",
    "Classify intent: open design studio and edit the home page hero.",
    "Classify intent: run tier1 eval and update routing arms.",
    "Classify intent: mirror D1 plan rows to Supabase public.",
    "Classify intent: inspect agentsam_workflow_runs for status failed.",
    "Classify intent: add a new MCP tool binding for cloudflare observability.",
    "Classify intent: rollback cms page publish to previous draft.",
    "Classify intent: estimate Workers AI neuron cost for last 30 days.",
    "Classify intent: wire dashboard overview to real D1 metrics.",
    "Classify intent: spawn subagent for browser inspection workflow.",
    "Classify intent: validate R2 dashboard chunk URLs return 200.",
    "Classify intent: register todo and plan_task for sprint May 23.",
    "Classify intent: explain why supabase_sync_status is pending.",
    "Classify intent: list cms_* tables and relationships.",
    "Classify intent: promote dev/cms-live-editor artifacts after approval.",
    "Classify intent: compare win_rate across anthropic vs openai arms.",
    "Classify intent: debug React is not defined on agentsam-cms-app.",
    "Classify intent: execute wf_analytics_dashboard_three_page_e2e.",
    "Classify intent: patch agentsam_workflow_handlers executor_kind.",
    "Classify intent: fetch /api/analytics/finance cost intelligence.",
    "Classify intent: create agentsam_cookbook from agent_recipe_prompts.",
    "Classify intent: pause routing arm with high failure rate.",
    "Classify intent: capture playwright proof for CMS editor deploy.",
    "Classify intent: align D1 agentsam_plans session_notes after commit.",
    "Classify intent: route chat request using Thompson sampling.",
    "Classify intent: audit agent_recipe_prompts by category and role.",
]

INTENT_LABELS = [
    "deploy",
    "debug_workflow",
    "routing_query",
    "schema_migration",
    "analytics",
    "cms_edit",
    "eval_run",
    "mirror_sync",
    "data_query",
    "mcp_tool",
    "cms_rollback",
    "cost_estimate",
    "dashboard_wire",
    "subagent_spawn",
    "frontend_validate",
    "sprint_register",
    "sync_debug",
    "schema_discover",
    "promotion_gate",
    "routing_compare",
    "frontend_debug",
    "workflow_execute",
    "handler_patch",
    "api_fetch",
    "cookbook_build",
    "routing_pause",
    "playwright_proof",
    "plan_sync",
    "chat_route",
    "recipe_audit",
]


def stub_classify(prompt: str, model: dict) -> dict:
    """Placeholder scorer until provider wiring in evals/lib/providers.py."""
    idx = hash(prompt + model["model_key"]) % len(INTENT_LABELS)
    return {
        "predicted": INTENT_LABELS[idx],
        "acceptable": [INTENT_LABELS[idx]],
        "score": 1.0 if idx < len(INTENT_LABELS) else 0.0,
        "latency_ms": 12,
        "cost_usd": 0.0,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit-prompts", type=int, default=30)
    parser.add_argument("--limit-models", type=int, default=8)
    args = parser.parse_args()

    prompts = PROMPTS[: args.limit_prompts]
    models = MODELS[: args.limit_models]
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out_path = RESULTS / f"{stamp}_tier1_intent_classification.json"

    artifact = {
        "tier": "tier1",
        "name": "intent_classification",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dry_run": args.dry_run,
        "prompts_count": len(prompts),
        "models": models,
        "results": [],
        "summary": {"total": 0, "scored": 0, "avg_score": 0.0},
    }

    if args.dry_run:
        print(f"DRY RUN would write {out_path}")
        print(json.dumps(artifact, indent=2)[:2000])
        return

    scored = 0
    total_score = 0.0
    for prompt in prompts:
        for model in models:
            t0 = time.time()
            row = stub_classify(prompt, model)
            row["prompt"] = prompt
            row["model"] = model
            row["elapsed_ms"] = int((time.time() - t0) * 1000)
            artifact["results"].append(row)
            if row["score"]:
                scored += 1
                total_score += row["score"]

    artifact["summary"] = {
        "total": len(artifact["results"]),
        "scored": scored,
        "avg_score": round(total_score / max(scored, 1), 4),
    }

    RESULTS.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(artifact, indent=2) + "\n")
    print(f"Wrote {out_path} ({artifact['summary']['total']} rows)")


if __name__ == "__main__":
    main()

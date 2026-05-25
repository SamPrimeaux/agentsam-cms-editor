#!/usr/bin/env python3
"""Seed Gemini catalog rows, CMS workspace routing arms, and eval matrix plan (D1 REST)."""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import date

TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN")
if not TOKEN:
    sys.exit("ERROR: CLOUDFLARE_API_TOKEN not set")

ACCOUNT_ID = "ede6590ac0d2fb7daf155b35653457b2"
DB_ID = "cf87b717-d4e2-4cf8-bab0-a81268e32d49"
BASE = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database"
TENANT = "tenant_sam_primeaux"
WORKSPACE = "ws_agentsam_cms"
TODAY = date.today().isoformat()
NOW = int(time.time())


def d1(sql: str, params: list | None = None) -> list:
    body: dict = {"sql": sql}
    if params:
        body["params"] = params
    req = urllib.request.Request(
        f"{BASE}/{DB_ID}/query",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            resp = json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(e.read().decode()[:2500]) from e
    if not resp.get("success"):
        raise RuntimeError(resp.get("errors", resp))
    return resp["result"][0].get("results", [])


def exists(table: str, col: str, val: str) -> bool:
    return bool(d1(f"SELECT 1 FROM {table} WHERE {col}=? LIMIT 1", [val]))


def insert_catalog(m: dict) -> None:
    if exists("agentsam_model_catalog", "id", m["id"]):
        print(f"  SKIP  {m['model_key']}")
        return
    d1(
        """
        INSERT INTO agentsam_model_catalog (
            id, model_key, display_name, provider, tier,
            google_model_id, api_platform,
            context_window, max_output_tokens,
            cost_per_1k_in, cost_per_1k_out,
            cost_per_tool_call, cost_per_1k_cached_in,
            cost_notes,
            supports_tools, supports_vision, supports_streaming,
            supports_json_mode, supports_reasoning,
            supports_code_execution, supports_compaction,
            supports_effort_scaling, supports_containers,
            routing_lane, thinking_policy, web_tool_mode,
            is_active, is_degraded, budget_exhausted,
            total_calls, total_failures,
            created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,0,0,0,?,?)
        """,
        [
            m["id"],
            m["model_key"],
            m["display_name"],
            m["provider"],
            m["tier"],
            m.get("google_model_id"),
            m.get("api_platform", "gemini_api"),
            m["context_window"],
            m["max_output_tokens"],
            m["cost_per_1k_in"],
            m["cost_per_1k_out"],
            m.get("cost_per_tool_call", 0),
            0,
            m["cost_notes"],
            m["supports_tools"],
            m["supports_vision"],
            1,
            m["supports_json_mode"],
            m["supports_reasoning"],
            0,
            0,
            0,
            0,
            m["routing_lane"],
            m.get("thinking_policy", "omitted"),
            "none",
            NOW,
            NOW,
        ],
    )
    print(f"  ADD   {m['model_key']}")
    time.sleep(0.04)


NEW_CATALOG = [
    {
        "id": "mdl_gemini20_flash",
        "model_key": "gemini-2.0-flash",
        "display_name": "Gemini 2.0 Flash",
        "provider": "google",
        "tier": "flash",
        "google_model_id": "models/gemini-2.0-flash",
        "api_platform": "gemini_api",
        "context_window": 1048576,
        "max_output_tokens": 8192,
        "cost_per_1k_in": 0.0001,
        "cost_per_1k_out": 0.0004,
        "cost_per_tool_call": 0.0001,
        "cost_notes": "$0.10/$0.40 per 1M. NOT free on paid API key.",
        "supports_tools": 1,
        "supports_vision": 1,
        "supports_json_mode": 1,
        "supports_reasoning": 0,
        "routing_lane": "fast",
        "thinking_policy": "omitted",
    },
    {
        "id": "mdl_gemini20_flash_001",
        "model_key": "gemini-2.0-flash-001",
        "display_name": "Gemini 2.0 Flash 001",
        "provider": "google",
        "tier": "flash",
        "google_model_id": "models/gemini-2.0-flash-001",
        "api_platform": "gemini_api",
        "context_window": 1048576,
        "max_output_tokens": 8192,
        "cost_per_1k_in": 0.0001,
        "cost_per_1k_out": 0.0004,
        "cost_per_tool_call": 0.0001,
        "cost_notes": "Pinned stable 2.0 Flash. $0.10/$0.40 per 1M.",
        "supports_tools": 1,
        "supports_vision": 1,
        "supports_json_mode": 1,
        "supports_reasoning": 0,
        "routing_lane": "fast",
        "thinking_policy": "omitted",
    },
    {
        "id": "mdl_gemini20_flash_lite",
        "model_key": "gemini-2.0-flash-lite",
        "display_name": "Gemini 2.0 Flash Lite",
        "provider": "google",
        "tier": "micro",
        "google_model_id": "models/gemini-2.0-flash-lite",
        "api_platform": "gemini_api",
        "context_window": 1048576,
        "max_output_tokens": 8192,
        "cost_per_1k_in": 0.000075,
        "cost_per_1k_out": 0.0003,
        "cost_per_tool_call": 0.000075,
        "cost_notes": "$0.075/$0.30 per 1M. Cheapest Google text model. NOT free.",
        "supports_tools": 1,
        "supports_vision": 1,
        "supports_json_mode": 1,
        "supports_reasoning": 0,
        "routing_lane": "fast",
        "thinking_policy": "omitted",
    },
    {
        "id": "mdl_gemini20_flash_lite_001",
        "model_key": "gemini-2.0-flash-lite-001",
        "display_name": "Gemini 2.0 Flash Lite 001",
        "provider": "google",
        "tier": "micro",
        "google_model_id": "models/gemini-2.0-flash-lite-001",
        "api_platform": "gemini_api",
        "context_window": 1048576,
        "max_output_tokens": 8192,
        "cost_per_1k_in": 0.000075,
        "cost_per_1k_out": 0.0003,
        "cost_per_tool_call": 0.000075,
        "cost_notes": "Pinned stable 2.0 Flash Lite. Same pricing.",
        "supports_tools": 1,
        "supports_vision": 1,
        "supports_json_mode": 1,
        "supports_reasoning": 0,
        "routing_lane": "fast",
        "thinking_policy": "omitted",
    },
    {
        "id": "mdl_gemini_flash_latest",
        "model_key": "gemini-flash-latest",
        "display_name": "Gemini Flash Latest (Alias)",
        "provider": "google",
        "tier": "flash",
        "google_model_id": "models/gemini-flash-latest",
        "api_platform": "gemini_api",
        "context_window": 1048576,
        "max_output_tokens": 65536,
        "cost_per_1k_in": 0.0015,
        "cost_per_1k_out": 0.009,
        "cost_per_tool_call": 0.0,
        "cost_notes": "Rolling alias — pin for prod.",
        "supports_tools": 1,
        "supports_vision": 1,
        "supports_json_mode": 0,
        "supports_reasoning": 1,
        "routing_lane": "standard",
        "thinking_policy": "omitted",
    },
    {
        "id": "mdl_gemini_flash_lite_latest",
        "model_key": "gemini-flash-lite-latest",
        "display_name": "Gemini Flash Lite Latest (Alias)",
        "provider": "google",
        "tier": "micro",
        "google_model_id": "models/gemini-flash-lite-latest",
        "api_platform": "gemini_api",
        "context_window": 1048576,
        "max_output_tokens": 65536,
        "cost_per_1k_in": 0.00025,
        "cost_per_1k_out": 0.0015,
        "cost_per_tool_call": 0.0,
        "cost_notes": "Rolling alias — latest flash-lite.",
        "supports_tools": 1,
        "supports_vision": 1,
        "supports_json_mode": 1,
        "supports_reasoning": 0,
        "routing_lane": "fast",
        "thinking_policy": "omitted",
    },
    {
        "id": "mdl_gemini_pro_latest",
        "model_key": "gemini-pro-latest",
        "display_name": "Gemini Pro Latest (Alias)",
        "provider": "google",
        "tier": "power",
        "google_model_id": "models/gemini-pro-latest",
        "api_platform": "gemini_api",
        "context_window": 1048576,
        "max_output_tokens": 65536,
        "cost_per_1k_in": 0.002,
        "cost_per_1k_out": 0.012,
        "cost_per_tool_call": 0.0,
        "cost_notes": "Rolling alias — do NOT use in cost-sensitive lanes.",
        "supports_tools": 1,
        "supports_vision": 1,
        "supports_json_mode": 0,
        "supports_reasoning": 1,
        "routing_lane": "reasoning",
        "thinking_policy": "omitted",
    },
    {
        "id": "mdl_gemini_robotics_15",
        "model_key": "gemini-robotics-er-1.5-preview",
        "display_name": "Gemini Robotics-ER 1.5 Preview",
        "provider": "google",
        "tier": "standard",
        "google_model_id": "models/gemini-robotics-er-1.5-preview",
        "api_platform": "gemini_api",
        "context_window": 1048576,
        "max_output_tokens": 65536,
        "cost_per_1k_in": 0.00125,
        "cost_per_1k_out": 0.005,
        "cost_per_tool_call": 0.0,
        "cost_notes": "Vision + reasoning specialist. Eval wildcard.",
        "supports_tools": 1,
        "supports_vision": 1,
        "supports_json_mode": 0,
        "supports_reasoning": 1,
        "routing_lane": "standard",
        "thinking_policy": "omitted",
    },
    {
        "id": "mdl_gemini_robotics_16",
        "model_key": "gemini-robotics-er-1.6-preview",
        "display_name": "Gemini Robotics-ER 1.6 Preview",
        "provider": "google",
        "tier": "standard",
        "google_model_id": "models/gemini-robotics-er-1.6-preview",
        "api_platform": "gemini_api",
        "context_window": 131072,
        "max_output_tokens": 65536,
        "cost_per_1k_in": 0.00125,
        "cost_per_1k_out": 0.005,
        "cost_per_tool_call": 0.0,
        "cost_notes": "131k ctx, supports caching.",
        "supports_tools": 1,
        "supports_vision": 1,
        "supports_json_mode": 0,
        "supports_reasoning": 1,
        "routing_lane": "standard",
        "thinking_policy": "omitted",
    },
    {
        "id": "mdl_gemini_embed_001",
        "model_key": "gemini-embedding-001",
        "display_name": "Gemini Embedding 001",
        "provider": "google",
        "tier": "micro",
        "google_model_id": "models/gemini-embedding-001",
        "api_platform": "gemini_api",
        "context_window": 2048,
        "max_output_tokens": 1,
        "cost_per_1k_in": 0.0001,
        "cost_per_1k_out": 0.0,
        "cost_per_tool_call": 0.0,
        "cost_notes": "$0.10 per 1M tokens. 768-dim.",
        "supports_tools": 0,
        "supports_vision": 0,
        "supports_json_mode": 0,
        "supports_reasoning": 0,
        "routing_lane": "embedding",
        "thinking_policy": "omitted",
    },
    {
        "id": "mdl_gemini_embed_2_preview",
        "model_key": "gemini-embedding-2-preview",
        "display_name": "Gemini Embedding 2 Preview",
        "provider": "google",
        "tier": "micro",
        "google_model_id": "models/gemini-embedding-2-preview",
        "api_platform": "gemini_api",
        "context_window": 8192,
        "max_output_tokens": 1,
        "cost_per_1k_in": 0.0,
        "cost_per_1k_out": 0.0,
        "cost_per_tool_call": 0.0,
        "cost_notes": "Multimodal embedding preview. Pricing TBD.",
        "supports_tools": 0,
        "supports_vision": 1,
        "supports_json_mode": 0,
        "supports_reasoning": 0,
        "routing_lane": "embedding",
        "thinking_policy": "omitted",
    },
]

# arm_id, model_key, provider, catalog_id, intent_slug, priority, effort, cost_out
EXTRA_ARMS = [
    ("arm_codex_code", "gpt-5.3-codex", "openai", "mdl_1a7078a8045c", "code_gen", 90, "medium", 0.014),
    ("arm_codex_sql", "gpt-5.3-codex", "openai", "mdl_1a7078a8045c", "sql", 80, "medium", 0.014),
    ("arm_codex_worker", "gpt-5.3-codex", "openai", "mdl_1a7078a8045c", "subagent_worker", 75, "medium", 0.014),
    ("arm_g20f_code", "gemini-2.0-flash", "google", "mdl_gemini20_flash", "code_gen", 65, "medium", 0.0004),
    ("arm_g20f_tool", "gemini-2.0-flash", "google", "mdl_gemini20_flash", "tool_use", 65, "medium", 0.0004),
    ("arm_g20f_sql", "gemini-2.0-flash", "google", "mdl_gemini20_flash", "sql", 60, "medium", 0.0004),
    ("arm_g20f_worker", "gemini-2.0-flash", "google", "mdl_gemini20_flash", "subagent_worker", 60, "low", 0.0004),
    ("arm_g20f_micro", "gemini-2.0-flash", "google", "mdl_gemini20_flash", "router_micro", 60, "low", 0.0004),
    ("arm_g20fl_micro", "gemini-2.0-flash-lite", "google", "mdl_gemini20_flash_lite", "router_micro", 70, "low", 0.0003),
    ("arm_g20fl_worker", "gemini-2.0-flash-lite", "google", "mdl_gemini20_flash_lite", "subagent_worker", 65, "low", 0.0003),
    ("arm_g20fl_sql", "gemini-2.0-flash-lite", "google", "mdl_gemini20_flash_lite", "sql", 60, "low", 0.0003),
    ("arm_g20fl_code", "gemini-2.0-flash-lite", "google", "mdl_gemini20_flash_lite", "code_gen", 58, "low", 0.0003),
    ("arm_gfl_code", "gemini-flash-latest", "google", "mdl_gemini_flash_latest", "code_gen", 62, "medium", 0.009),
    ("arm_gfl_tool", "gemini-flash-latest", "google", "mdl_gemini_flash_latest", "tool_use", 62, "medium", 0.009),
    ("arm_grobo16_code", "gemini-robotics-er-1.6-preview", "google", "mdl_gemini_robotics_16", "code_gen", 55, "high", 0.005),
    ("arm_grobo16_reason", "gemini-robotics-er-1.6-preview", "google", "mdl_gemini_robotics_16", "reasoning", 55, "high", 0.005),
    ("arm_gpl_reason", "gemini-pro-latest", "google", "mdl_gemini_pro_latest", "reasoning", 60, "high", 0.012),
    ("arm_gpl_code", "gemini-pro-latest", "google", "mdl_gemini_pro_latest", "code_gen", 60, "high", 0.012),
]

TASKS = [
    (
        f"task_eval_p0_{NOW}",
        0,
        "P0",
        "infra",
        0,
        "[P0] Phase 0 — Ollama Local Only ($0.00)",
        "Truly zero cost. ollama/qwen2.5-coder:7b, code_gen only, 20 prompts.",
        ["ollama/qwen2.5-coder:7b"],
        0.00,
        0.00,
        15,
        0,
        {"cost_cap_usd": 0.00, "promotion_threshold": 0.50, "stop_if_over_budget": True},
    ),
    (
        f"task_eval_p1_{NOW + 1}",
        1,
        "P0",
        "infra",
        0,
        "[P0] Phase 1 — WAI Cheapest (<$0.0005/call) | Cap $1.00",
        "granite-4.0-h-micro, qwen3-30b-a3b-fp8, glm-4.7-flash, gpt-oss-20b.",
        ["granite-4.0-h-micro", "glm-4.7-flash"],
        0.10,
        1.00,
        25,
        0,
        {"cost_cap_usd": 1.00, "promotion_threshold": 0.55, "stop_if_over_budget": True},
    ),
    (
        f"task_eval_p2_{NOW + 2}",
        2,
        "P0",
        "infra",
        0,
        "[P0] Phase 2 — Google Micro + WAI Standard | Cap $3.00",
        "gemini-2.0-flash-lite, gemini-2.5-flash-lite, qwen2.5-coder-32b.",
        ["gemini-2.0-flash-lite", "qwen2.5-coder-32b"],
        0.77,
        3.00,
        45,
        0,
        {"cost_cap_usd": 3.00, "promotion_threshold": 0.60, "stop_if_over_budget": True},
    ),
    (
        f"task_eval_p3_{NOW + 3}",
        3,
        "P1",
        "infra",
        0,
        "[P1] Phase 3 — Google Flash + OpenAI Nano/Mini | Cap $5.00",
        "gemini-2.0-flash, gpt-5.4-nano, gpt-5.3-codex (code+sql only).",
        ["gemini-2.0-flash", "gpt-5.4-nano"],
        1.50,
        5.00,
        60,
        0,
        {"cost_cap_usd": 5.00, "promotion_threshold": 0.62, "stop_if_over_budget": True},
    ),
    (
        f"task_eval_p4_{NOW + 4}",
        4,
        "P1",
        "infra",
        0,
        "[P1] Phase 4 — Haiku + Gemini Standard | Cap $8.00",
        "claude-haiku-4-5, gemini-3.5-flash, gemini-robotics-er-1.6.",
        ["claude-haiku-4-5", "gemini-robotics-er-1.6"],
        2.10,
        8.00,
        50,
        0,
        {"cost_cap_usd": 8.00, "promotion_threshold": 0.63, "requires_approval_for_next_phase": True},
    ),
    (
        f"task_eval_p5_{NOW + 5}",
        5,
        "P1",
        "infra",
        1,
        "[P1] Phase 5 — Reasoning + Pro Tier | APPROVAL REQUIRED | Cap $15.00",
        "o4-mini, gemini-2.5-pro, gpt-5.4, claude-sonnet-4-6.",
        ["o4-mini", "gemini-2.5-pro"],
        3.84,
        15.00,
        70,
        1,
        {"cost_cap_usd": 15.00, "promotion_threshold": 0.65, "requires_approval_for_next_phase": True},
    ),
    (
        f"task_eval_p6_{NOW + 6}",
        6,
        "P2",
        "infra",
        1,
        "[P2] Phase 6 — Opus + GPT-5 | APPROVAL | Cap $20.00",
        "claude-opus-4-6, claude-opus-4-7, gpt-5.",
        ["claude-opus-4-6", "gpt-5"],
        5.40,
        20.00,
        60,
        1,
        {"cost_cap_usd": 20.00, "promotion_threshold": 0.70, "requires_approval_for_next_phase": True},
    ),
    (
        f"task_eval_p7_{NOW + 7}",
        7,
        "P2",
        "infra",
        1,
        "[P2] Phase 7 — o3 Surgical (5 prompts only) | Cap $10.00",
        "o3 — code_gen + reasoning only, 5 prompts per intent.",
        ["o3"],
        1.00,
        10.00,
        20,
        1,
        {"cost_cap_usd": 10.00, "promotion_threshold": 0.80, "n_prompts": 5},
    ),
    (
        f"task_eval_p8_{NOW + 8}",
        8,
        "P0",
        "db",
        0,
        "[P0] Phase 8 — Score Review + Arm Promotion",
        "Review eval results and promote eligible arms in ws_agentsam_cms.",
        [],
        0.00,
        0.00,
        15,
        0,
        {"cost_cap_usd": 0.00, "write_summary_to": "agentsam_eval_runs"},
    ),
]


def insert_arm(arm_id: str, mk: str, provider: str, cat_id: str, intent: str, priority: int, effort: str, cost_out: float) -> None:
    if exists("agentsam_routing_arms", "id", arm_id):
        print(f"  SKIP  {arm_id}")
        return
    task_type = intent
    composite = d1(
        """SELECT id FROM agentsam_routing_arms
           WHERE workspace_id=? AND task_type=? AND mode='agent' AND model_key=? AND COALESCE(agent_slug,'')=''""",
        [WORKSPACE, task_type, mk],
    )
    if composite:
        print(f"  SKIP  composite {intent} → {mk}")
        return
    d1(
        """
        INSERT INTO agentsam_routing_arms (
            id, task_type, mode, model_key, provider,
            success_alpha, success_beta,
            cost_n, cost_mean, cost_m2,
            latency_n, latency_mean, latency_m2,
            decayed_score, last_decay_at,
            is_eligible, is_paused, is_active,
            avg_quality_score, quality_n, total_executions,
            intent_slug, workspace_id, agent_slug,
            priority, reasoning_effort,
            fallback_model_key, supports_tools,
            max_cost_per_call_usd,
            model_catalog_id, tools_json, updated_at
        ) VALUES (
            ?,?,?,?,?,1.0,1.0,0,0.0,0.0,0,0.0,0.0,
            0.0,?,0,0,1,0.0,0,0,
            ?,?,?,?,?,?,?,?,?,'[]',?
        )
        """,
        [
            arm_id,
            task_type,
            "agent",
            mk,
            provider,
            NOW,
            intent,
            WORKSPACE,
            "",
            priority,
            effort,
            "gpt-5.4-nano",
            1,
            round(cost_out * 0.3, 6),
            cat_id,
            NOW,
        ],
    )
    print(f"  ARM   [{intent:18s}] → {mk}")
    time.sleep(0.04)


def main() -> None:
    print("\n── Part 1: Missing catalog entries ───────────────────────────────────")
    for m in NEW_CATALOG:
        insert_catalog(m)

    print("\n── Part 2: Routing arms ──────────────────────────────────────────────")
    for row in EXTRA_ARMS:
        insert_arm(*row)

    print("\n── Part 3: Eval matrix plan + tasks ──────────────────────────────────")
    plan_id = f"plan_cms_eval_matrix_{TODAY.replace('-', '')}"
    if exists("agentsam_plans", "id", plan_id):
        print(f"  SKIP  plan → {plan_id}")
    else:
        d1(
            """
            INSERT INTO agentsam_plans (
                id, tenant_id, workspace_id, plan_date, plan_type,
                title, status, morning_brief, tasks_total,
                risk_level, requires_approval, created_at, updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,unixepoch(),unixepoch())
            """,
            [
                plan_id,
                TENANT,
                WORKSPACE,
                TODAY,
                "sprint",
                f"Thompson Eval Matrix — Full Model Test Suite — {TODAY}",
                "active",
                (
                    "8-phase eval of queued model arms across intent lanes. "
                    "Ordered cheapest first. Hard cost cap per phase. Total budget ~$18."
                ),
                len(TASKS),
                "medium",
                0,
            ],
        )
        print(f"  CREATE plan → {plan_id}")

    tasks_written = 0
    for tid, idx, pri, cat, appr, title, desc, models, est_cost, cap, mins, approval, gate in TASKS:
        if exists("agentsam_plan_tasks", "id", tid):
            print(f"  SKIP  task P{idx}")
            continue
        d1(
            """
            INSERT INTO agentsam_plan_tasks (
                id, tenant_id, workspace_id, plan_id,
                order_index, title, description,
                priority, category, status,
                tables_involved, files_involved,
                estimated_minutes, risk_level, requires_approval,
                quality_gate_json, notes, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,unixepoch())
            """,
            [
                tid,
                TENANT,
                WORKSPACE,
                plan_id,
                idx,
                title,
                desc,
                pri,
                cat,
                "todo",
                json.dumps(
                    ["agentsam_routing_arms", "agentsam_eval_runs", "spend_ledger", "agentsam_model_catalog"]
                ),
                json.dumps(["evals/tier1_intent_classification.py", "evals/lib/scoring.py"]),
                mins,
                "high" if approval else "medium",
                approval,
                json.dumps(gate),
                f"Models: {', '.join(models[:3])}{'...' if len(models) > 3 else ''} | Est ${est_cost:.2f} | Cap ${cap:.2f}",
            ],
        )
        print(f"  TASK  [P{idx}] {title[:58]}")
        tasks_written += 1
        time.sleep(0.04)

    d1("UPDATE agentsam_plans SET tasks_total=? WHERE id=?", [len(TASKS), plan_id])

    total = sum(t[8] for t in TASKS)
    print("\n══════════════════════════════════════════════════════════════════")
    print(f"  Plan: {plan_id} | tasks written this run: {tasks_written}")
    print(f"  Total est if all phases: ~${total:.2f}")
    print("DONE")


if __name__ == "__main__":
    main()

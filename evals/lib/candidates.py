"""Eval model candidates (tier1) and workflow combos (tier2)."""

from __future__ import annotations

EVAL_CANDIDATES: list[dict] = [
    {
        "model_key": "claude-haiku-4-5-20251001",
        "provider": "anthropic",
        "cost_in": 1.0,
        "cost_out": 5.0,
        "arm_id": "ra_ws_scout_intent_class",
    },
    {
        "model_key": "@cf/ibm-granite/granite-4.0-h-micro",
        "provider": "workers_ai",
        "cost_in": 0.017,
        "cost_out": 0.112,
        "arm_id": "ra_wai_granite_intent",
        "cost_basis": "neurons_approx",
    },
    {
        "model_key": "gemini-3.1-flash-lite",
        "provider": "google",
        "cost_in": 0.25,
        "cost_out": 1.5,
        "arm_id": "ra_ba1d748a979b3358",
    },
    {
        "model_key": "gpt-5.4-nano",
        "provider": "openai",
        "cost_in": 0.20,
        "cost_out": 1.25,
        "arm_id": "arm_nano_intent_auto",
    },
    {
        "model_key": "gemini-2.5-flash-lite",
        "provider": "google",
        "cost_in": 0.10,
        "cost_out": 0.40,
        "arm_id": "ra_3b4dd67033e01357",
    },
    {
        "model_key": "gpt-4.1-nano",
        "provider": "openai",
        "cost_in": 0.10,
        "cost_out": 0.40,
        "arm_id": None,
    },
    {
        "model_key": "@cf/zai-org/glm-4.7-flash",
        "provider": "workers_ai",
        "cost_in": 0.06,
        "cost_out": 0.40,
        "arm_id": None,
        "cost_basis": "neurons_approx",
    },
    {
        "model_key": "gpt-5.4-mini",
        "provider": "openai",
        "cost_in": 0.75,
        "cost_out": 4.50,
        "arm_id": None,
    },
]

WORKFLOW_TEST_TASKS: list[dict] = [
    {
        "scenario": "code_sprint",
        "task_description": (
            "Implement a Thompson sampling beta draw function in JavaScript. "
            "Split into: (1) research existing beta samplers, (2) write betaSample(alpha,beta), "
            "(3) write unit tests, (4) write JSDoc, (5) write a usage example."
        ),
        "expected_node_task_types": {
            "subagent_1": "plan",
            "subagent_2": "code",
            "subagent_3": "code",
            "subagent_4": "code",
            "subagent_5": "code",
        },
        "quality_rubric": [
            "returns valid JS",
            "tests cover edge cases",
            "docstring complete",
            "example runs",
        ],
    },
    {
        "scenario": "d1_audit_sprint",
        "task_description": (
            "Audit the agentsam_routing_arms table. "
            "Split into: (1) schema inspection, (2) count cold arms by task_type, "
            "(3) identify duplicate priorities, (4) draft fix SQL, (5) write validation queries."
        ),
        "expected_node_task_types": {
            "subagent_1": "wrangler_d1",
            "subagent_2": "wrangler_d1",
            "subagent_3": "code",
            "subagent_4": "code_patch",
            "subagent_5": "wrangler_d1",
        },
        "quality_rubric": [
            "PRAGMA used",
            "COUNT queries valid",
            "SQL is SQLite-safe",
            "validation queries included",
        ],
    },
    {
        "scenario": "tool_code_mix",
        "task_description": (
            "Deploy a new route handler for /api/agent/spawn. "
            "Split into: (1) check existing routes for conflicts, (2) write the handler, "
            "(3) write D1 insert for new route, (4) write test curl commands, "
            "(5) write the wrangler deploy command."
        ),
        "expected_node_task_types": {
            "subagent_1": "tool_use",
            "subagent_2": "code",
            "subagent_3": "wrangler_d1",
            "subagent_4": "tool_use",
            "subagent_5": "terminal_execution",
        },
        "quality_rubric": [
            "handler shape valid",
            "D1 SQL is correct",
            "curl commands executable",
            "wrangler command correct",
        ],
    },
    {
        "scenario": "plan_decompose",
        "task_description": (
            "Create a sprint plan for implementing agent-scoped Thompson routing. "
            "Split into: (1) audit current state, (2) list blockers, (3) define migrations needed, "
            "(4) write test criteria, (5) write rollout sequence."
        ),
        "expected_node_task_types": {
            "subagent_1": "plan",
            "subagent_2": "plan",
            "subagent_3": "plan",
            "subagent_4": "plan",
            "subagent_5": "plan",
        },
        "quality_rubric": [
            "outputs are actionable",
            "no circular dependencies",
            "migrations mentioned",
            "rollout is sequenced",
        ],
    },
    {
        "scenario": "smoke_baseline",
        "task_description": (
            "Write hello world in 5 different programming languages. "
            "Each subagent handles one language: Python, JavaScript, Go, Rust, SQL."
        ),
        "expected_node_task_types": {
            "subagent_1": "code",
            "subagent_2": "code",
            "subagent_3": "code",
            "subagent_4": "code",
            "subagent_5": "code",
        },
        "quality_rubric": [
            "5 outputs returned",
            "each is syntactically valid",
            "no model refused",
        ],
    },
]

MODEL_COMBOS: list[dict] = [
    {
        "combo_id": "all_mini",
        "label": "All gpt-5.4-mini",
        "master": "gpt-5.4-mini",
        "subagents": "gpt-5.4-mini",
        "expected_cost_per_run": "$0.15-0.40",
    },
    {
        "combo_id": "all_nano",
        "label": "All gpt-5.4-nano",
        "master": "gpt-5.4-nano",
        "subagents": "gpt-5.4-nano",
        "expected_cost_per_run": "$0.03-0.08",
    },
    {
        "combo_id": "wai_native",
        "label": "WAI: kimi-k2.6 master / glm-4.7-flash workers",
        "master": "@cf/moonshotai/kimi-k2.6",
        "subagents": "@cf/zai-org/glm-4.7-flash",
        "expected_cost_per_run": "~$0.05 (neuron estimate)",
        "cost_basis": "neurons",
    },
    {
        "combo_id": "mini_master_nano_workers",
        "label": "gpt-5.4-mini master / gpt-5.4-nano workers",
        "master": "gpt-5.4-mini",
        "subagents": "gpt-5.4-nano",
        "expected_cost_per_run": "$0.05-0.15",
    },
    {
        "combo_id": "thompson_live",
        "label": "Thompson-selected per node",
        "master": "THOMPSON",
        "subagents": "THOMPSON",
        "expected_cost_per_run": "varies",
        "note": "Production configuration — baselines compare against this.",
    },
]

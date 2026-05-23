"""Acceptable-alternatives scoring, calibration, workflow composite scores."""

from __future__ import annotations

from typing import Any

ACCEPTABLE: dict[str, set[str]] = {
    "code": {"code", "code_patch"},
    "code_patch": {"code_patch", "code"},
    "debug": {"debug", "code_review", "code"},
    "tool_use": {"tool_use", "tool_calling_single"},
    "chat": {"chat", "explain", "summary"},
    "plan": {"plan", "planning"},
    "wrangler_d1": {"wrangler_d1", "deploy", "terminal_execution"},
    "deploy": {"deploy", "terminal_execution", "wrangler_d1"},
    "terminal_execution": {"terminal_execution", "tool_use", "deploy"},
    "rag": {"rag", "tool_use"},
    "memory": {"memory", "chat"},
}

THOMPSON_SUCCESS_THRESHOLD = 0.5
ALPHA_FULL = 0.95


def score(predicted: str, expected: str) -> float:
    """1.0 exact, 0.5 acceptable alternative, 0.0 wrong."""
    predicted = (predicted or "").strip().lower()
    expected = (expected or "").strip().lower()
    if predicted == expected:
        return 1.0
    alts = ACCEPTABLE.get(expected, set())
    if predicted in alts:
        return 0.5
    return 0.0


def thompson_success(score: float) -> bool:
    return score >= THOMPSON_SUCCESS_THRESHOLD


def alpha_delta(score: float) -> float:
    """Partial credit: score * 0.95 instead of full 0.95."""
    if score >= 1.0:
        return ALPHA_FULL
    if score >= THOMPSON_SUCCESS_THRESHOLD:
        return round(score * ALPHA_FULL, 4)
    return 0.0


def beta_delta(score: float) -> float:
    if score < THOMPSON_SUCCESS_THRESHOLD:
        return 1.0
    return 0.0


def calibration_gap(conf_correct: list[float], conf_wrong: list[float]) -> float | None:
    if not conf_correct or not conf_wrong:
        return None
    avg_c = sum(conf_correct) / len(conf_correct)
    avg_w = sum(conf_wrong) / len(conf_wrong)
    return round(avg_c - avg_w, 4)


def aggregate_tier1_by_model(rows: list[dict]) -> dict[str, dict[str, Any]]:
    by_model: dict[str, dict[str, Any]] = {}
    for row in rows:
        mk = row["model"]["model_key"]
        arm_id = row["model"].get("arm_id")
        bucket = by_model.setdefault(
            mk,
            {
                "model_key": mk,
                "provider": row["model"]["provider"],
                "arm_id": arm_id,
                "n": 0,
                "score_sum": 0.0,
                "exact": 0,
                "partial": 0,
                "wrong": 0,
                "hard_n": 0,
                "hard_score_sum": 0.0,
                "conf_correct": [],
                "conf_wrong": [],
                "cost_usd_sum": 0.0,
                "latency_ms_sum": 0,
            },
        )
        s = row["score"]
        bucket["n"] += 1
        bucket["score_sum"] += s
        if s >= 1.0:
            bucket["exact"] += 1
        elif s >= 0.5:
            bucket["partial"] += 1
        else:
            bucket["wrong"] += 1
        if row.get("difficulty") == "hard":
            bucket["hard_n"] += 1
            bucket["hard_score_sum"] += s
        conf = float(row.get("confidence") or 0)
        if s >= 0.5:
            bucket["conf_correct"].append(conf)
        else:
            bucket["conf_wrong"].append(conf)
        bucket["cost_usd_sum"] += float(row.get("cost_usd") or 0)
        bucket["latency_ms_sum"] += int(row.get("latency_ms") or 0)

    chat_share = 0.74
    daily_requests = 10_000
    for mk, b in by_model.items():
        acc = b["score_sum"] / max(b["n"], 1)
        cost_per_1k = (b["cost_usd_sum"] / max(b["n"], 1)) * 1000
        correct_rate = (b["exact"] + b["partial"] * 0.5) / max(b["n"], 1)
        cost_per_correct = cost_per_1k / max(correct_rate * 1000, 1)
        b["accuracy"] = round(acc, 4)
        b["calibration_gap"] = calibration_gap(b["conf_correct"], b["conf_wrong"])
        b["cost_per_1k_calls_usd"] = round(cost_per_1k, 4)
        b["cost_per_correct_at_10k_day"] = round(
            cost_per_correct * daily_requests * chat_share / 1000, 4
        )
        b["avg_latency_ms"] = round(b["latency_ms_sum"] / max(b["n"], 1), 1)
        if b["hard_n"]:
            b["hard_accuracy"] = round(b["hard_score_sum"] / b["hard_n"], 4)
    return by_model


def criterion_met(run_result: dict, criterion: str) -> bool:
    """Heuristic rubric check on stub/live workflow output."""
    text = " ".join(
        str(n.get("output_text") or "") for n in run_result.get("nodes", [])
    ).lower()
    checks = {
        "returns valid js": "function" in text or "const " in text,
        "tests cover edge cases": "test" in text or "assert" in text,
        "docstring complete": "/**" in text or '"""' in text,
        "example runs": "example" in text,
        "pragma used": "pragma" in text,
        "count queries valid": "count(" in text,
        "sql is sqlite-safe": "sqlite" in text or "d1" in text,
        "validation queries included": "select" in text,
        "handler shape valid": "export" in text or "async fetch" in text,
        "d1 sql is correct": "insert" in text or "update" in text,
        "curl commands executable": "curl" in text,
        "wrangler command correct": "wrangler" in text,
        "outputs are actionable": len(text) > 80,
        "no circular dependencies": "circular" not in text,
        "migrations mentioned": "migration" in text,
        "rollout is sequenced": "rollout" in text or "phase" in text,
        "5 outputs returned": len(run_result.get("nodes", [])) >= 5,
        "each is syntactically valid": "def " in text or "fn " in text or "func " in text,
        "no model refused": "cannot" not in text and "refuse" not in text,
    }
    return checks.get(criterion, bool(text))


def score_workflow_run(run_result: dict, scenario: dict) -> dict[str, Any]:
    nodes = run_result.get("nodes", [])
    completed = len([n for n in nodes if n.get("status") == "completed"])
    scores: dict[str, Any] = {"completion": completed / 6.0}

    rubric = scenario.get("quality_rubric", [])
    hits = sum(1 for c in rubric if criterion_met(run_result, c))
    scores["quality"] = hits / max(len(rubric), 1)

    expected = scenario.get("expected_node_task_types", {})
    node_types = run_result.get("node_task_types", {})
    matches = sum(
        1 for k, exp in expected.items() if node_types.get(k) == exp
    )
    scores["routing_accuracy"] = matches / max(len(expected), 1)

    scores["total_cost_usd"] = round(
        sum(float(n.get("cost_usd") or 0) for n in nodes), 6
    )
    scores["total_ms"] = int(run_result.get("duration_ms") or 0)
    scores["cost_per_quality_point"] = (
        round(scores["total_cost_usd"] / scores["quality"], 6)
        if scores["quality"] > 0
        else 999.0
    )
    scores["thompson_success"] = (
        scores["completion"] >= 0.8 and scores["quality"] >= 0.6
    )
    return scores

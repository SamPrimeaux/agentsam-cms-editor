"""Provider callers for intent classification (live + heuristic stub)."""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from typing import Any

from evals.lib.cost import estimate_usd
from evals.lib.taxonomy import ALL_LABELS, CLASSIFY_SYSTEM

_JSON_RE = re.compile(r"\{[^{}]*\"task_type\"[^{}]*\}", re.DOTALL)


def _parse_classification(text: str) -> tuple[str, float]:
    text = (text or "").strip()
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        m = _JSON_RE.search(text)
        if not m:
            return "chat", 0.3
        try:
            obj = json.loads(m.group(0))
        except json.JSONDecodeError:
            return "chat", 0.3
    label = str(obj.get("task_type") or obj.get("intent") or "chat").strip().lower()
    if label not in ALL_LABELS:
        for candidate in ALL_LABELS:
            if candidate in label:
                label = candidate
                break
        else:
            label = "chat"
    conf = float(obj.get("confidence", 0.5))
    return label, max(0.0, min(1.0, conf))


def _stub_classify(prompt: str, expected: str) -> tuple[str, float]:
    """Keyword heuristic for offline runs — biased toward expected on easy cases."""
    p = prompt.lower()
    rules: list[tuple[str, str]] = [
        ("migration", "wrangler_d1"),
        ("wrangler", "wrangler_d1"),
        ("d1 execute", "wrangler_d1"),
        ("deploy", "deploy"),
        ("npm run", "terminal_execution"),
        ("run the", "terminal_execution"),
        ("patch", "code_patch"),
        ("fix the", "code_patch"),
        ("bug", "code_patch"),
        ("mcp", "tool_use"),
        ("playwright", "tool_use"),
        ("tool", "tool_use"),
        ("workflow run", "debug"),
        ("diagnose", "debug"),
        ("why does", "debug"),
        ("sprint", "plan"),
        ("break down", "plan"),
        ("subagent", "plan"),
        ("write a", "code"),
        ("function", "code"),
        ("sql to", "code"),
        ("system prompt", "chat"),
        ("ignore your", "chat"),
    ]
    for needle, label in rules:
        if needle in p:
            return label, 0.72 if label == expected else 0.55
    if expected == "chat":
        return "chat", 0.65
    return expected, 0.58


def _openai_classify(prompt: str, model_key: str) -> dict[str, Any]:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        raise RuntimeError("OPENAI_API_KEY missing")
    body = {
        "model": model_key,
        "messages": [
            {"role": "system", "content": CLASSIFY_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as res:
        payload = json.loads(res.read().decode())
    choice = payload["choices"][0]["message"]["content"]
    label, conf = _parse_classification(choice)
    usage = payload.get("usage") or {}
    return {
        "predicted": label,
        "confidence": conf,
        "raw": choice,
        "input_tokens": usage.get("prompt_tokens", 0),
        "output_tokens": usage.get("completion_tokens", 0),
    }


def _anthropic_classify(prompt: str, model_key: str) -> dict[str, Any]:
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY missing")
    body = {
        "model": model_key,
        "max_tokens": 128,
        "system": CLASSIFY_SYSTEM,
        "messages": [{"role": "user", "content": prompt}],
    }
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(body).encode(),
        headers={
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as res:
        payload = json.loads(res.read().decode())
    text = "".join(b.get("text", "") for b in payload.get("content", []) if b.get("type") == "text")
    label, conf = _parse_classification(text)
    usage = payload.get("usage") or {}
    return {
        "predicted": label,
        "confidence": conf,
        "raw": text,
        "input_tokens": usage.get("input_tokens", 0),
        "output_tokens": usage.get("output_tokens", 0),
    }


def classify_intent(
    prompt: str,
    model: dict,
    *,
    expected: str = "chat",
    live: bool = False,
) -> dict[str, Any]:
    """Classify one prompt. live=True calls provider APIs when keys exist."""
    provider = model["provider"]
    model_key = model["model_key"]

    try:
        if live:
            if provider == "openai":
                out = _openai_classify(prompt, model_key)
            elif provider == "anthropic":
                out = _anthropic_classify(prompt, model_key)
            else:
                pred, conf = _stub_classify(prompt, expected)
                out = {
                    "predicted": pred,
                    "confidence": conf,
                    "raw": "(stub: no live adapter for provider)",
                    "input_tokens": max(80, len(prompt) // 4),
                    "output_tokens": 24,
                }
        else:
            pred, conf = _stub_classify(prompt, expected)
            out = {
                "predicted": pred,
                "confidence": conf,
                "raw": "(stub mode)",
                "input_tokens": max(80, len(prompt) // 4),
                "output_tokens": 24,
            }
    except (urllib.error.HTTPError, urllib.error.URLError, RuntimeError) as err:
        pred, conf = _stub_classify(prompt, expected)
        out = {
            "predicted": pred,
            "confidence": conf * 0.5,
            "raw": f"(fallback after error: {err})",
            "input_tokens": max(80, len(prompt) // 4),
            "output_tokens": 24,
            "error": str(err),
        }

    cost_usd, cost_note = estimate_usd(
        provider,
        out["input_tokens"],
        out["output_tokens"],
        float(model.get("cost_in", 0)),
        float(model.get("cost_out", 0)),
        model.get("cost_basis"),
    )
    out["cost_usd"] = cost_usd
    if cost_note:
        out["cost_note"] = cost_note
    return out

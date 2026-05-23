#!/usr/bin/env python3
"""Smoke /api/v1/* JSON endpoints (requires live D1 binding)."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "https://agentsam-cms-editor.meauxbility.workers.dev"

PATHS = [
    "/api/analytics/overview",
    "/api/analytics/health",
    "/api/analytics/finance",
    "/api/analytics/arms?task_type=cms_edit&limit=5",
    "/api/v1/worker",
    "/api/v1/overview",
    "/api/v1/evals",
]


def fetch(path: str) -> tuple[int, dict | list | str]:
    req = urllib.request.Request(
        BASE + path,
        headers={"accept": "application/json", "user-agent": "agentsam-cms-smoke/1.0"},
    )
    with urllib.request.urlopen(req, timeout=45) as res:
        body = res.read().decode("utf-8")
        return res.status, json.loads(body)


def main() -> None:
    failures = []
    print(f"API SMOKE {BASE}")
    for path in PATHS:
        try:
            status, data = fetch(path)
            ok = status == 200 and isinstance(data, dict) and data.get("ok") is not False
            keys = list(data.keys())[:6] if isinstance(data, dict) else []
            print(f"{'PASS' if ok else 'FAIL'} {status} {path} keys={keys}")
            if not ok:
                failures.append(path)
        except (urllib.error.HTTPError, urllib.error.URLError, json.JSONDecodeError) as err:
            print(f"FAIL {path} {err}")
            failures.append(path)

    if failures:
        raise SystemExit("failed: " + ", ".join(failures))
    print("PASS: api v1 smoke complete")


if __name__ == "__main__":
    main()

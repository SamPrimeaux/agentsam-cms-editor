from __future__ import annotations

import sys
import urllib.error
import urllib.request


BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "https://agentsam-cms-editor.meauxbility.workers.dev"

PATHS = [
    "/",
    "/design-studio",
    "/analytics",
    "/health",
    "/api/audit",
]

HEADERS = {
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/148.0.0.0 Safari/537.36",
    "accept": "text/html,application/json;q=0.9,*/*;q=0.8",
}


def fetch(path: str) -> tuple[int, str, bytes]:
    url = BASE + path
    req = urllib.request.Request(url, headers=HEADERS)

    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return res.status, res.headers.get("content-type", ""), res.read()
    except urllib.error.HTTPError as err:
        return err.code, err.headers.get("content-type", ""), err.read()


def main() -> None:
    failures = []

    print(f"SMOKE {BASE}")

    for path in PATHS:
        status, content_type, body = fetch(path)
        ok = 200 <= status < 400
        preview = body[:90].decode("utf-8", errors="replace").replace("\n", " ")
        print(f"{'PASS' if ok else 'FAIL'} {status:<3} {path:<18} {content_type:<42} {len(body):>8} bytes  {preview}")

        if not ok:
            failures.append(path)

    if failures:
        raise SystemExit("failed: " + ", ".join(failures))

    print("PASS: smoke complete")


if __name__ == "__main__":
    main()

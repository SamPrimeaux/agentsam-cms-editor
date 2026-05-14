from __future__ import annotations
import sys
import urllib.request
import urllib.error

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "https://agentsam-cms-editor.meauxbility.workers.dev"
PATHS = ["/", "/design-studio", "/analytics", "/health", "/api/audit"]

def fetch(path):
    try:
        with urllib.request.urlopen(BASE + path, timeout=20) as r:
            return r.status, r.headers.get("content-type", ""), len(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("content-type", ""), len(e.read())

fail = []
print("SMOKE", BASE)
for p in PATHS:
    status, ctype, size = fetch(p)
    ok = 200 <= status < 400
    print(("PASS" if ok else "FAIL"), status, p, ctype, size)
    if not ok:
        fail.append(p)

if fail:
    raise SystemExit("failed: " + ", ".join(fail))
print("PASS: smoke complete")

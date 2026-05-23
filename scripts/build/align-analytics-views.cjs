const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = process.cwd();
const analyticsPath = path.join(root, "public", "analytics.html");
// Legacy bundler patch — do NOT run after TypeScript migration (src/index.ts is canonical).
const workerPath = path.join(root, "src", "worker.legacy.js.bak");
const smokePath = path.join(root, "scripts", "smoke", "smoke_endpoints.py");
const dashDir = path.join(root, "public", "dashboard");

if (!fs.existsSync(analyticsPath)) {
  throw new Error("Missing public/analytics.html");
}

fs.mkdirSync(dashDir, { recursive: true });

let html = fs.readFileSync(analyticsPath, "utf8");

const target = "const [view, setView] = useState('overview');";
const replacement = "const [view, setView] = useState((window.__AGENTSAM_ANALYTICS_VIEW__ || new URLSearchParams(window.location.search).get('view') || 'overview'));";

let patched = false;

html = html.replace(/("mime":"application\/javascript","compressed":true,"data":")([^"]+)(")/g, (full, prefix, b64, suffix) => {
  let js;
  try {
    js = zlib.gunzipSync(Buffer.from(b64, "base64")).toString("utf8");
  } catch (_err) {
    return full;
  }

  if (!js.includes(target)) {
    return full;
  }

  js = js.replace(target, replacement);
  const next = zlib.gzipSync(Buffer.from(js, "utf8")).toString("base64");
  patched = true;
  return prefix + next + suffix;
});

if (!patched) {
  throw new Error("Could not find Analytics Main App view state chunk.");
}

function pageFor(view) {
  const title = "Agent Sam Dashboard · " + view.charAt(0).toUpperCase() + view.slice(1);
  const seed = '<script>window.__AGENTSAM_ANALYTICS_VIEW__=' + JSON.stringify(view) + ";</script>";
  let out = html;
  out = out.replace(/<title>.*?<\/title>/i, "<title>" + title + "</title>");
  out = out.replace(/<head>/i, "<head>\n" + seed);
  return out;
}

fs.writeFileSync(path.join(dashDir, "overview.html"), pageFor("overview"));
fs.writeFileSync(path.join(dashDir, "finance.html"), pageFor("finance"));
fs.writeFileSync(path.join(dashDir, "health.html"), pageFor("health"));
fs.writeFileSync(analyticsPath, pageFor("overview"));

const worker = `const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: JSON_HEADERS
  });
}

async function asset(pathname, request, env) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return env.ASSETS.fetch(new Request(url.toString(), request));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "content-type"
        }
      });
    }

    if (pathname === "/api/health") {
      return json({
        ok: true,
        worker: "agentsam-cms-editor",
        mode: "analytics-view-aligned",
        bindings: {
          db: Boolean(env.DB),
          dashboard: Boolean(env.DASHBOARD),
          assets: Boolean(env.ASSETS),
          openai_secret_present: Boolean(env.OPENAI_API_KEY),
          cloudflare_token_present: Boolean(env.CLOUDFLARE_API_TOKEN)
        }
      });
    }

    if (pathname === "/health" || pathname === "/dashboard/health") {
      return asset("/dashboard/health.html", request, env);
    }

    if (pathname === "/dashboard/overview") {
      return asset("/dashboard/overview.html", request, env);
    }

    if (pathname === "/dashboard/finance") {
      return asset("/dashboard/finance.html", request, env);
    }

    if (pathname === "/analytics") {
      return asset("/analytics.html", request, env);
    }

    if (pathname === "/hash-not-important") {
      return json({ ok: true });
    }

    if (pathname === "/api/audit") {
      return json({
        ok: true,
        app: "agentsam-cms-editor",
        mode: "analytics-view-aligned",
        routes: {
          home: "/",
          design_studio: "/design-studio",
          analytics: "/analytics",
          overview: "/dashboard/overview",
          finance: "/dashboard/finance",
          health: "/dashboard/health",
          health_alias: "/health",
          json_health: "/api/health"
        }
      });
    }

    if (pathname === "/api/agent/chat" && request.method === "POST") {
      let body = {};
      try {
        body = await request.json();
      } catch (_err) {
        return json({ ok: false, error: "Invalid JSON." }, 400);
      }

      return json({
        ok: true,
        mode: "stub",
        message: "Agent chat endpoint is scaffolded.",
        received: {
          message: body.message || "",
          pageId: body.pageId || null,
          selectedSectionId: body.selectedSectionId || null,
          selectedComponentId: body.selectedComponentId || null
        }
      });
    }

    if (pathname === "/") {
      return asset("/index.html", request, env);
    }

    if (pathname === "/design-studio") {
      return asset("/design-studio.html", request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
`;

fs.writeFileSync(workerPath, worker);

const smoke = `from __future__ import annotations

import sys
import urllib.error
import urllib.request


BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "https://agentsam-cms-editor.meauxbility.workers.dev"

PATHS = [
    "/",
    "/design-studio",
    "/analytics",
    "/dashboard/overview",
    "/dashboard/finance",
    "/dashboard/health",
    "/health",
    "/api/health",
    "/api/audit",
]

HEADERS = {
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/148.0.0.0 Safari/537.36",
    "accept": "text/html,application/json;q=0.9,*/*;q=0.8",
}


def fetch(path: str) -> tuple[int, str, bytes]:
    req = urllib.request.Request(BASE + path, headers=HEADERS)
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
        preview = body[:100].decode("utf-8", errors="replace").replace("\\n", " ")
        print(f"{'PASS' if ok else 'FAIL'} {status:<3} {path:<24} {content_type:<42} {len(body):>8} bytes  {preview}")
        if not ok:
            failures.append(path)

    if failures:
        raise SystemExit("failed: " + ", ".join(failures))

    print("PASS: smoke complete")


if __name__ == "__main__":
    main()
`;

fs.mkdirSync(path.dirname(smokePath), { recursive: true });
fs.writeFileSync(smokePath, smoke);

console.log("PASS: analytics views aligned");
console.log("WROTE public/dashboard/overview.html");
console.log("WROTE public/dashboard/finance.html");
console.log("WROTE public/dashboard/health.html");
console.log("WROTE src/worker.js");
console.log("WROTE scripts/smoke/smoke_endpoints.py");

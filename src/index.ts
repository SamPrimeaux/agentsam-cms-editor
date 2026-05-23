import { getArms } from "./api/arms";
import { getEvalStatus } from "./api/evals";
import { getCostIntelligence } from "./api/finance";
import { getHealth } from "./api/health";
import { getOverview } from "./api/overview";
import { handleAnalyticsApi } from "./lib/analytics-handlers";
import { cacheKey, cached, DASHBOARD_CACHE_TTL_MS } from "./lib/cache";
import { corsPreflight, json } from "./lib/http";

async function asset(pathname: string, request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  url.pathname = pathname;
  return env.ASSETS.fetch(new Request(url.toString(), request));
}

function workerHealth(env: Env) {
  return json({
    ok: true,
    worker: "agentsam-cms-editor",
    api_version: "v1",
    bindings: {
      db: Boolean(env.DB),
      dashboard: Boolean(env.DASHBOARD),
      assets: Boolean(env.ASSETS),
      openai_secret_present: Boolean(env.OPENAI_API_KEY),
      cloudflare_token_present: Boolean(env.CLOUDFLARE_API_TOKEN)
    }
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return corsPreflight();
    }

    // ── Worker liveness (legacy + v1 alias) ─────────────────────────────
    if (pathname === "/api/health" || pathname === "/api/v1/worker") {
      return workerHealth(env);
    }

    // ── Analytics API (workflow brief routes) ─────────────────────────────
    if (pathname.startsWith("/api/analytics/") && request.method === "GET") {
      const data = await handleAnalyticsApi(pathname, env.DB, url);
      if (data) return json(data);
      return json({ ok: false, error: "Not found" }, 404);
    }

    // ── JSON API v1 (aliases — same handlers) ───────────────────────────
    if (pathname === "/api/v1/overview" && request.method === "GET") {
      const data = await cached(
        cacheKey(["v1", "overview"]),
        DASHBOARD_CACHE_TTL_MS,
        () => getOverview(env.DB)
      );
      return json(data);
    }

    if (pathname === "/api/v1/health" && request.method === "GET") {
      const data = await cached(
        cacheKey(["v1", "health"]),
        DASHBOARD_CACHE_TTL_MS,
        () => getHealth(env.DB)
      );
      return json(data);
    }

    if (pathname === "/api/v1/finance" && request.method === "GET") {
      const data = await cached(
        cacheKey(["v1", "finance"]),
        DASHBOARD_CACHE_TTL_MS,
        () => getCostIntelligence(env.DB)
      );
      return json(data);
    }

    if (pathname === "/api/v1/arms" && request.method === "GET") {
      const taskType = url.searchParams.get("task_type");
      const mode = url.searchParams.get("mode");
      const limit = Number(url.searchParams.get("limit") || "25");
      const key = cacheKey([
        "v1",
        "arms",
        taskType ?? "",
        mode ?? "",
        String(limit)
      ]);
      const data = await cached(key, DASHBOARD_CACHE_TTL_MS, () =>
        getArms(env.DB, { task_type: taskType, mode, limit })
      );
      return json(data);
    }

    if (pathname === "/api/v1/evals" && request.method === "GET") {
      const data = await getEvalStatus(env.DB);
      return json(data);
    }

    if (pathname === "/api/evals/trigger" && request.method === "POST") {
      return json({
        ok: false,
        status: "pending_implementation",
        message:
          "Phase 4: KV pending_evals + cron + PTY runner. Run evals locally: python3 evals/tier1_intent_classification.py",
        queued_at: new Date().toISOString()
      },
        501);
    }

    // ── Static dashboard pages ──────────────────────────────────────────
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
      return Response.redirect(
        new URL("/dashboard/overview", request.url).toString(),
        307
      );
    }

    if (pathname === "/api/audit") {
      return json({
        ok: true,
        app: "agentsam-cms-editor",
        api_version: "v1",
        routes: {
          home: "/",
          design_studio: "/design-studio",
          overview: "/dashboard/overview",
          finance: "/dashboard/finance",
          health: "/dashboard/health",
          json: {
            overview: "/api/analytics/overview",
            health: "/api/analytics/health",
            finance: "/api/analytics/finance",
            arms: "/api/analytics/arms",
            v1_overview: "/api/v1/overview",
            v1_health: "/api/v1/health",
            v1_finance: "/api/v1/finance",
            evals: "/api/v1/evals",
            worker: "/api/v1/worker"
          }
        }
      });
    }

    if (pathname === "/api/agent/chat" && request.method === "POST") {
      let body: Record<string, unknown> = {};
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return json({ ok: false, error: "Invalid JSON." }, 400);
      }

      return json({
        ok: true,
        mode: "stub",
        message: "Agent chat endpoint is scaffolded.",
        received: {
          message: body.message ?? "",
          pageId: body.pageId ?? null,
          selectedSectionId: body.selectedSectionId ?? null,
          selectedComponentId: body.selectedComponentId ?? null
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

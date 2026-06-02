import { getArms } from "./api/arms";
import {
  checkReadiness,
  getPage,
  listPages,
  listTemplates,
  listThemes,
  publishPage,
  reorderSections,
  saveDraft,
  updateSection,
  uploadAsset,
} from "./api/cms";
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
    api_version: "v2",
    surfaces: {
      design_studio: "/design-studio",
      analytics: "/dashboard/overview",
    },
    bindings: {
      db: Boolean(env.DB),
      assets_bucket: Boolean(env.ASSETS_BUCKET),
      assets: Boolean(env.ASSETS),
      session_cache: Boolean(env.SESSION_CACHE),
      openai_secret_present: Boolean(env.OPENAI_API_KEY),
    }
  });
}

// ── Route segment helpers ──────────────────────────────────────────────────
// Matches /api/cms/pages/:id  → returns id
// Matches /api/cms/pages/:id/sections/reorder → returns { id, sub: 'reorder' }
function parseCmsRoute(pathname: string): {
  resource: string;
  id: string | null;
  sub: string | null;
  subId: string | null;
} {
  // /api/cms/{resource}/{id}/{sub}/{subId}
  const parts = pathname.replace(/^\/api\/cms\//, "").split("/");
  return {
    resource: parts[0] ?? "",
    id:       parts[1] ?? null,
    sub:      parts[2] ?? null,
    subId:    parts[3] ?? null,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url      = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    const method   = request.method.toUpperCase();

    if (method === "OPTIONS") return corsPreflight();

    // ── Worker liveness ──────────────────────────────────────────────────
    if (pathname === "/api/health" || pathname === "/api/v1/worker") {
      return workerHealth(env);
    }

    // ── CMS API ──────────────────────────────────────────────────────────
    if (pathname.startsWith("/api/cms/")) {
      const { resource, id, sub, subId } = parseCmsRoute(pathname);

      // Pages
      if (resource === "pages" && !id && method === "GET") {
        return listPages(url, env.DB);
      }

      if (resource === "pages" && id && !sub && method === "GET") {
        return getPage(id, env.DB);
      }

      // Sections reorder
      if (resource === "pages" && id && sub === "sections" && subId === "reorder" && method === "POST") {
        return reorderSections(id, request, env.DB);
      }

      // Draft save
      if (resource === "pages" && id && sub === "draft" && method === "POST") {
        return saveDraft(id, env.DB);
      }

      // Publish readiness check
      if (resource === "pages" && id && sub === "readiness" && method === "GET") {
        return checkReadiness(id, env.DB);
      }

      // Publish
      if (resource === "pages" && id && sub === "publish" && method === "POST") {
        return publishPage(id, env.DB);
      }

      // Section update (PATCH /api/cms/sections/:id)
      if (resource === "sections" && id && method === "PATCH") {
        return updateSection(id, request, env.DB);
      }

      // Themes
      if (resource === "themes" && !id && method === "GET") {
        return listThemes(url, env.DB);
      }

      // Templates
      if (resource === "templates" && !id && method === "GET") {
        return listTemplates(url, env.DB);
      }

      // Asset upload
      if (resource === "assets" && sub === "upload" && method === "POST") {
        return uploadAsset(request, { ASSETS_BUCKET: env.ASSETS_BUCKET });
      }

      return json({ ok: false, error: "CMS route not found", pathname }, 404);
    }

    // ── Analytics API ────────────────────────────────────────────────────
    if (pathname.startsWith("/api/analytics/") && method === "GET") {
      const data = await handleAnalyticsApi(pathname, env.DB, url);
      if (data) return json(data);
      return json({ ok: false, error: "Not found" }, 404);
    }

    // ── JSON API v1 aliases ──────────────────────────────────────────────
    if (pathname === "/api/v1/overview" && method === "GET") {
      const data = await cached(
        cacheKey(["v1", "overview"]), DASHBOARD_CACHE_TTL_MS, () => getOverview(env.DB)
      );
      return json(data);
    }
    if (pathname === "/api/v1/health" && method === "GET") {
      const data = await cached(
        cacheKey(["v1", "health"]), DASHBOARD_CACHE_TTL_MS, () => getHealth(env.DB)
      );
      return json(data);
    }
    if (pathname === "/api/v1/finance" && method === "GET") {
      const data = await cached(
        cacheKey(["v1", "finance"]), DASHBOARD_CACHE_TTL_MS, () => getCostIntelligence(env.DB)
      );
      return json(data);
    }
    if (pathname === "/api/v1/arms" && method === "GET") {
      const taskType = url.searchParams.get("task_type");
      const mode     = url.searchParams.get("mode");
      const limit    = Number(url.searchParams.get("limit") || "25");
      const key      = cacheKey(["v1", "arms", taskType ?? "", mode ?? "", String(limit)]);
      const data     = await cached(key, DASHBOARD_CACHE_TTL_MS, () =>
        getArms(env.DB, { task_type: taskType, mode, limit })
      );
      return json(data);
    }
    if (pathname === "/api/v1/evals" && method === "GET") {
      return json(await getEvalStatus(env.DB));
    }
    if (pathname === "/api/evals/trigger" && method === "POST") {
      return json({ ok: false, status: "pending_implementation", message: "Run evals locally: python3 evals/tier1_intent_classification.py" }, 501);
    }

    // ── Agent Sam chat ───────────────────────────────────────────────────
    if (pathname === "/api/agent/chat" && method === "POST") {
      let body: Record<string, unknown> = {};
      try { body = await request.json() as Record<string, unknown>; }
      catch { return json({ ok: false, error: "Invalid JSON." }, 400); }

      // TODO: wire to actual Agent Sam MCP/LLM call
      return json({
        ok: true,
        reply: `Agent Sam received: "${body.message}". Context: page=${body.pageId ?? "none"}, section=${body.selectedSectionId ?? "none"}.`,
        page_id: body.pageId ?? null,
        section_id: body.selectedSectionId ?? null,
        session_id: body.sessionId ?? null,
      });
    }

    // ── Audit ────────────────────────────────────────────────────────────
    if (pathname === "/api/audit") {
      return json({
        ok: true,
        app: "agentsam-cms-editor",
        api_version: "v2",
        routes: {
          design_studio: "/design-studio",
          analytics_overview: "/dashboard/overview",
          cms: {
            list_pages:       "GET  /api/cms/pages",
            get_page:         "GET  /api/cms/pages/:id",
            reorder_sections: "POST /api/cms/pages/:id/sections/reorder",
            save_draft:       "POST /api/cms/pages/:id/draft",
            readiness:        "GET  /api/cms/pages/:id/readiness",
            publish:          "POST /api/cms/pages/:id/publish",
            update_section:   "PATCH /api/cms/sections/:id",
            list_themes:      "GET  /api/cms/themes",
            list_templates:   "GET  /api/cms/templates",
            upload_asset:     "POST /api/cms/assets/upload",
          },
        }
      });
    }

    // ── SPA routing ──────────────────────────────────────────────────────

    // Design Studio — serve the cms-app Vite build from public/cms/
    // Falls back to design-studio.html if the build hasn't run yet
    if (pathname === "/design-studio" || pathname.startsWith("/design-studio/")) {
      try {
        return await asset("/cms/index.html", request, env);
      } catch {
        // Build not yet present — serve legacy static shell
        return asset("/design-studio.html", request, env);
      }
    }

    // Analytics SPA
    const DASHBOARD_VIEWS = new Set(["overview", "finance", "health"]);
    const dashView = pathname.startsWith("/dashboard/") ? pathname.split("/").pop() : null;
    if (pathname === "/health" || (dashView && DASHBOARD_VIEWS.has(dashView))) {
      return asset("/analytics/index.html", request, env);
    }
    if (pathname === "/analytics") {
      return Response.redirect(new URL("/dashboard/overview", request.url).toString(), 307);
    }

    // Landing
    if (pathname === "/") {
      return asset("/index.html", request, env);
    }

    // Everything else — static assets
    return env.ASSETS.fetch(request);
  }
};

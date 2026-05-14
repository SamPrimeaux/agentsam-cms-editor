const JSON_HEADERS = {
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
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

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

from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs

from workers import Request, Response, WorkerEntrypoint

from api.arms import get_arms
from api.evals import get_eval_status
from api.finance import get_cost_intelligence
from api.health import get_health
from api.overview import get_overview
from evals_runner import run_tier1_stub
from lib.analytics_handlers import handle_analytics_api
from lib.cache import cache_key, cached
from lib.http import cors_preflight, json_response

TTL = 60_000
DASHBOARD_VIEWS = frozenset({"overview", "finance", "health"})


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        url = urlparse(request.url)
        pathname = url.path.rstrip("/") or "/"
        method = request.method

        if method == "OPTIONS":
            return cors_preflight()

        if pathname in ("/api/health", "/api/v1/worker"):
            return json_response(worker_health(self.env))

        if pathname.startswith("/api/analytics/") and method == "GET":
            data = await handle_analytics_api(pathname, self.env.DB, url)
            if data is not None:
                return json_response(data)
            return json_response({"ok": False, "error": "Not found"}, 404)

        if pathname == "/api/v1/overview" and method == "GET":

            async def load_overview():
                return await get_overview(self.env.DB)

            data = await cached(cache_key(["v1", "overview"]), TTL, load_overview)
            return json_response(data)

        if pathname == "/api/v1/health" and method == "GET":

            async def load_health():
                return await get_health(self.env.DB)

            data = await cached(cache_key(["v1", "health"]), TTL, load_health)
            return json_response(data)

        if pathname == "/api/v1/finance" and method == "GET":

            async def load_finance():
                return await get_cost_intelligence(self.env.DB)

            data = await cached(cache_key(["v1", "finance"]), TTL, load_finance)
            return json_response(data)

        if pathname == "/api/v1/arms" and method == "GET":
            qs = parse_qs(url.query)
            task_type = qs.get("task_type", [None])[0]
            mode = qs.get("mode", [None])[0]
            limit = int(qs.get("limit", ["25"])[0])
            key = cache_key(["v1", "arms", task_type or "", mode or "", str(limit)])

            async def load_arms():
                return await get_arms(self.env.DB, task_type, mode, limit)

            data = await cached(key, TTL, load_arms)
            return json_response(data)

        if pathname == "/api/v1/evals" and method == "GET":
            return json_response(await get_eval_status(self.env.DB))

        if pathname == "/api/evals/trigger" and method == "POST":
            return json_response(
                {
                    "ok": False,
                    "status": "pending_implementation",
                    "message": "Use POST /api/evals/run for inline stub; CLI for full suite.",
                    "queued_at": datetime.now(timezone.utc).isoformat(),
                },
                501,
            )

        if pathname == "/api/evals/run" and method == "POST":
            return json_response(await run_tier1_stub())

        dash_view = None
        if pathname.startswith("/dashboard/"):
            dash_view = pathname.split("/")[-1]

        if pathname == "/health" or (dash_view and dash_view in DASHBOARD_VIEWS):
            return await self._asset("/analytics/index.html", request)

        if pathname == "/analytics":
            return Response.redirect(f"{url.scheme}://{url.netloc}/dashboard/overview", 307)

        if pathname == "/api/audit":
            return json_response(audit_routes())

        if pathname == "/api/agent/chat" and method == "POST":
            try:
                body = await request.json()
            except Exception:
                return json_response({"ok": False, "error": "Invalid JSON."}, 400)
            return json_response(
                {
                    "ok": True,
                    "mode": "stub",
                    "message": "Agent chat endpoint is scaffolded.",
                    "received": {
                        "message": body.get("message", ""),
                        "pageId": body.get("pageId"),
                        "selectedSectionId": body.get("selectedSectionId"),
                        "selectedComponentId": body.get("selectedComponentId"),
                    },
                }
            )

        if pathname == "/":
            return await self._asset("/index.html", request)

        if pathname == "/design-studio":
            return await self._asset("/design-studio.html", request)

        return await self.env.ASSETS.fetch(request)

    async def _asset(self, pathname, request):
        base = urlparse(str(request.url))
        asset_url = f"{base.scheme}://{base.netloc}{pathname}"
        return await self.env.ASSETS.fetch(asset_url)


def worker_health(env):
    return {
        "ok": True,
        "worker": "agentsam-cms-editor",
        "runtime": "python",
        "api_version": "v1",
        "bindings": {
            "db": bool(getattr(env, "DB", None)),
            "dashboard": bool(getattr(env, "DASHBOARD", None)),
            "assets": bool(getattr(env, "ASSETS", None)),
            "openai_secret_present": bool(getattr(env, "OPENAI_API_KEY", None)),
            "cloudflare_token_present": bool(getattr(env, "CLOUDFLARE_API_TOKEN", None)),
        },
    }


def audit_routes():
    return {
        "ok": True,
        "app": "agentsam-cms-editor",
        "runtime": "python",
        "api_version": "v1",
        "routes": {
            "home": "/",
            "design_studio": "/design-studio",
            "overview": "/dashboard/overview",
            "finance": "/dashboard/finance",
            "health": "/dashboard/health",
            "json": {
                "overview": "/api/analytics/overview",
                "health": "/api/analytics/health",
                "finance": "/api/analytics/finance",
                "arms": "/api/analytics/arms",
                "evals_run": "/api/evals/run",
            },
        },
    }

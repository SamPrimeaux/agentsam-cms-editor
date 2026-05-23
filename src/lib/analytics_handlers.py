from urllib.parse import parse_qs

from api.arms import get_arms
from api.finance import get_cost_intelligence
from api.health import get_health
from api.overview import get_overview
from lib.cache import cache_key, cached

TTL = 60_000


async def handle_analytics_api(pathname, db, url):
    if pathname == "/api/analytics/overview":

        async def load_overview():
            return await get_overview(db)

        return await cached(cache_key(["analytics", "overview"]), TTL, load_overview)
    if pathname == "/api/analytics/health":

        async def load_health():
            return await get_health(db)

        return await cached(cache_key(["analytics", "health"]), TTL, load_health)
    if pathname == "/api/analytics/finance":

        async def load_finance():
            return await get_cost_intelligence(db)

        return await cached(
            cache_key(["analytics", "finance"]), TTL, load_finance
        )
    if pathname == "/api/analytics/arms":
        qs = parse_qs(url.query)
        task_type = qs.get("task_type", [None])[0]
        mode = qs.get("mode", [None])[0]
        limit = int(qs.get("limit", ["25"])[0])
        key = cache_key(["analytics", "arms", task_type or "", mode or "", str(limit)])

        async def load():
            return await get_arms(db, task_type, mode, limit)

        return await cached(key, TTL, load)
    return None

import { getArms } from "../api/arms";
import { getCostIntelligence } from "../api/finance";
import { getHealth } from "../api/health";
import { getOverview } from "../api/overview";
import { cacheKey, cached, DASHBOARD_CACHE_TTL_MS } from "./cache";

/** Brief routes: GET /api/analytics/overview|finance|health */
export async function handleAnalyticsApi(
  pathname: string,
  db: D1Database,
  url: URL
): Promise<unknown | null> {
  if (pathname === "/api/analytics/overview") {
    return cached(cacheKey(["analytics", "overview"]), DASHBOARD_CACHE_TTL_MS, () =>
      getOverview(db)
    );
  }
  if (pathname === "/api/analytics/health") {
    return cached(cacheKey(["analytics", "health"]), DASHBOARD_CACHE_TTL_MS, () =>
      getHealth(db)
    );
  }
  if (pathname === "/api/analytics/finance") {
    return cached(cacheKey(["analytics", "finance"]), DASHBOARD_CACHE_TTL_MS, () =>
      getCostIntelligence(db)
    );
  }
  if (pathname === "/api/analytics/arms") {
    const taskType = url.searchParams.get("task_type");
    const mode = url.searchParams.get("mode");
    const limit = Number(url.searchParams.get("limit") || "25");
    return cached(
      cacheKey(["analytics", "arms", taskType ?? "", mode ?? "", String(limit)]),
      DASHBOARD_CACHE_TTL_MS,
      () => getArms(db, { task_type: taskType, mode, limit })
    );
  }
  return null;
}

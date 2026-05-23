import type {
  FinanceResponse,
  HealthResponse,
  OverviewResponse,
} from "@/types/analytics-api";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { accept: "application/json" } });
  const data = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) {
    throw new Error(
      (data as { error?: string }).error || res.statusText || "Request failed"
    );
  }
  return data;
}

export const analyticsApi = {
  overview: () => getJson<OverviewResponse>("/api/analytics/overview"),
  health: () => getJson<HealthResponse>("/api/analytics/health"),
  finance: () => getJson<FinanceResponse>("/api/analytics/finance"),
};

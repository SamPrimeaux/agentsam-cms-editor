/** In-isolate TTL cache (60s). Swap to KV binding later for cross-colo consistency. */
const DEFAULT_TTL_MS = 60_000;

type Entry<T> = { expiresAt: number; value: T };

const store = new Map<string, Entry<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }
  const value = await loader();
  store.set(key, { expiresAt: now + ttlMs, value });
  return value;
}

export function cacheKey(parts: string[]): string {
  return parts.join(":");
}

export const DASHBOARD_CACHE_TTL_MS = DEFAULT_TTL_MS;

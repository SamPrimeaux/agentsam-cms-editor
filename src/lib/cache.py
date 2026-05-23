import time

DEFAULT_TTL_MS = 60_000
_store = {}


async def cached(key, ttl_ms, loader):
    now = int(time.time() * 1000)
    hit = _store.get(key)
    if hit and hit["expires_at"] > now:
        return hit["value"]
    value = await loader()
    _store[key] = {"expires_at": now + ttl_ms, "value": value}
    return value


def cache_key(parts):
    return ":".join(parts)

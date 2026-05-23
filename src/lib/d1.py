def row_val(row, key, default=None):
    if row is None:
        return default
    try:
        v = row[key]
        return default if v is None else v
    except (KeyError, TypeError, IndexError):
        getter = getattr(row, "get", None)
        if callable(getter):
            return getter(key, default)
        return default


def to_plain(value):
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    keys_fn = getattr(value, "keys", None)
    if callable(keys_fn):
        return {str(k): to_plain(value[k]) for k in keys_fn()}
    try:
        return [to_plain(item) for item in value]
    except TypeError:
        return str(value)


async def first(db, sql, *bindings):
    stmt = db.prepare(sql)
    if bindings:
        stmt = stmt.bind(*bindings)
    row = await stmt.first()
    return to_plain(row)


async def all_rows(db, sql, *bindings):
    stmt = db.prepare(sql)
    if bindings:
        stmt = stmt.bind(*bindings)
    result = await stmt.all()
    if not result:
        return []
    rows = getattr(result, "results", None) or []
    return [to_plain(row) for row in rows]

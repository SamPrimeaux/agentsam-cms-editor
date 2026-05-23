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


async def first(db, sql, *bindings):
    stmt = db.prepare(sql)
    if bindings:
        stmt = stmt.bind(*bindings)
    return await stmt.first()


async def all_rows(db, sql, *bindings):
    stmt = db.prepare(sql)
    if bindings:
        stmt = stmt.bind(*bindings)
    result = await stmt.all()
    return result.results if result and result.results else []

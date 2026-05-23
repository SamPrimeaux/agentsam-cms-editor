/** Small D1 helpers — all dashboard SQL lives in api/*.ts */
export type D1Row = Record<string, unknown>;

export async function first<T extends D1Row>(
  db: D1Database,
  sql: string,
  ...bindings: unknown[]
): Promise<T | null> {
  const stmt = db.prepare(sql);
  const bound = bindings.length ? stmt.bind(...bindings) : stmt;
  return (await bound.first<T>()) ?? null;
}

export async function all<T extends D1Row>(
  db: D1Database,
  sql: string,
  ...bindings: unknown[]
): Promise<T[]> {
  const stmt = db.prepare(sql);
  const bound = bindings.length ? stmt.bind(...bindings) : stmt;
  const { results } = await bound.all<T>();
  return results ?? [];
}

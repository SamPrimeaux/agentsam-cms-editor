/**
 * CMS API handlers — all read from D1 tables:
 *   cms_pages, cms_page_sections, cms_section_components,
 *   cms_component_templates, cms_themes
 *
 * All mutations are non-fatal (errors return { ok: false, error } not 500s)
 * Tenant scoping: project_id resolved from query param or default 'inneranimalmedia'
 */

import { json } from "../lib/http";

// ── helpers ────────────────────────────────────────────────────────────────

function parseJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function now(): number { return Math.floor(Date.now() / 1000); }

function nanoid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── GET /api/cms/pages ─────────────────────────────────────────────────────
export async function listPages(url: URL, db: D1Database): Promise<Response> {
  const projectId = url.searchParams.get("project_id") ?? "inneranimalmedia";
  const status    = url.searchParams.get("status"); // optional filter

  let q = `SELECT id, title, slug, status, page_type, project_id, tenant_id,
                   meta_description, seo_title, is_homepage, sort_order,
                   created_at, updated_at
            FROM cms_pages
            WHERE project_id = ?`;
  const params: unknown[] = [projectId];

  if (status) { q += " AND status = ?"; params.push(status); }
  q += " ORDER BY sort_order ASC, updated_at DESC LIMIT 100";

  const { results } = await db.prepare(q).bind(...params).all();
  return json({ ok: true, pages: results ?? [] });
}

// ── GET /api/cms/pages/:id ─────────────────────────────────────────────────
export async function getPage(pageId: string, db: D1Database): Promise<Response> {
  const page = await db
    .prepare(`SELECT * FROM cms_pages WHERE id = ? LIMIT 1`)
    .bind(pageId)
    .first();

  if (!page) return json({ ok: false, error: "Page not found" }, 404);

  const { results: sections } = await db
    .prepare(`SELECT id, page_id, section_name, section_type, section_data,
                     sort_order, is_visible, css_classes, custom_css, updated_at
              FROM cms_page_sections
              WHERE page_id = ?
              ORDER BY sort_order ASC`)
    .bind(pageId)
    .all();

  // Parse section_data JSON for each section
  const parsed = (sections ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    section_data: parseJson(s.section_data as string),
  }));

  return json({ ok: true, page, sections: parsed });
}

// ── POST /api/cms/pages/:id/sections/reorder ───────────────────────────────
export async function reorderSections(
  pageId: string,
  request: Request,
  db: D1Database
): Promise<Response> {
  let body: { ordered_ids?: string[] };
  try { body = await request.json() as { ordered_ids?: string[] }; }
  catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

  const { ordered_ids } = body;
  if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
    return json({ ok: false, error: "ordered_ids array required" }, 400);
  }

  // Batch update sort_order — each id gets (index+1)*10
  const ts = now();
  const stmts = ordered_ids.map((id, i) =>
    db.prepare(`UPDATE cms_page_sections
                SET sort_order = ?, updated_at = ?
                WHERE id = ? AND page_id = ?`)
      .bind((i + 1) * 10, ts, id, pageId)
  );

  await db.batch(stmts);
  return json({ ok: true, reordered: ordered_ids.length });
}

// ── PATCH /api/cms/sections/:id ────────────────────────────────────────────
export async function updateSection(
  sectionId: string,
  request: Request,
  db: D1Database
): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

  const ts = now();
  const updates: string[] = [];
  const params: unknown[] = [];

  if ("section_data" in body) {
    updates.push("section_data = ?");
    params.push(typeof body.section_data === "string"
      ? body.section_data
      : JSON.stringify(body.section_data));
  }
  if ("is_visible" in body) {
    updates.push("is_visible = ?");
    params.push(body.is_visible ? 1 : 0);
  }
  if ("section_name" in body) {
    updates.push("section_name = ?");
    params.push(body.section_name);
  }
  if ("css_classes" in body) {
    updates.push("css_classes = ?");
    params.push(body.css_classes);
  }
  if ("custom_css" in body) {
    updates.push("custom_css = ?");
    params.push(body.custom_css);
  }

  if (updates.length === 0) return json({ ok: false, error: "Nothing to update" }, 400);

  updates.push("updated_at = ?");
  params.push(ts);
  params.push(sectionId);

  await db
    .prepare(`UPDATE cms_page_sections SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...params)
    .run();

  return json({ ok: true, section_id: sectionId, updated_at: ts });
}

// ── POST /api/cms/pages/:id/draft ──────────────────────────────────────────
// Saves a lightweight draft record to cms_page_drafts (if exists) or
// just bumps updated_at on the page row — non-destructive.
export async function saveDraft(
  pageId: string,
  db: D1Database
): Promise<Response> {
  const ts = now();
  const savedAt = new Date(ts * 1000).toISOString();

  // Bump page updated_at — draft state is implicit
  await db
    .prepare(`UPDATE cms_pages SET updated_at = ?, status = CASE WHEN status = 'published' THEN 'draft' ELSE status END WHERE id = ?`)
    .bind(ts, pageId)
    .run();

  // Write to cms_page_drafts if the table exists (non-fatal if not)
  try {
    const draftId = `draft_${pageId}_${ts}`;
    await db
      .prepare(`INSERT OR REPLACE INTO cms_page_drafts (id, page_id, saved_at, created_at)
                VALUES (?, ?, ?, ?)`)
      .bind(draftId, pageId, savedAt, savedAt)
      .run();
  } catch {
    // table may not have this schema yet — non-fatal
  }

  return json({ ok: true, page_id: pageId, saved_at: savedAt });
}

// ── GET /api/cms/pages/:id/readiness ──────────────────────────────────────
export async function checkReadiness(
  pageId: string,
  db: D1Database
): Promise<Response> {
  // 1. Orphan components — section_components whose section_id has no matching page_section
  const orphanRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM cms_section_components sc
              WHERE sc.project_id = (SELECT project_id FROM cms_pages WHERE id = ?)
              AND NOT EXISTS (
                SELECT 1 FROM cms_page_sections ps WHERE ps.id = sc.section_id AND ps.page_id = ?
              )`)
    .bind(pageId, pageId)
    .first<{ n: number }>();

  const orphanCount = orphanRow?.n ?? 0;

  // 2. Null / missing sort_orders on sections
  const nullSortRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM cms_page_sections WHERE page_id = ? AND sort_order IS NULL`)
    .bind(pageId)
    .first<{ n: number }>();

  const missingSortOrders = nullSortRow?.n ?? 0;

  // 3. Total sections
  const totalRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM cms_page_sections WHERE page_id = ?`)
    .bind(pageId)
    .first<{ n: number }>();

  const totalSections = totalRow?.n ?? 0;

  const ok = orphanCount === 0 && missingSortOrders === 0;

  return json({
    ok,
    page_id: pageId,
    orphan_components: orphanCount,
    sort_orders_valid: missingSortOrders === 0,
    missing_sort_orders: missingSortOrders,
    schema_clean: orphanCount === 0,
    total_sections: totalSections,
  });
}

// ── POST /api/cms/pages/:id/publish ───────────────────────────────────────
export async function publishPage(
  pageId: string,
  db: D1Database
): Promise<Response> {
  // Run readiness check first — refuse to publish if not clean
  const readinessResp = await checkReadiness(pageId, db);
  const readiness = await readinessResp.clone().json() as { ok: boolean };

  if (!readiness.ok) {
    return json({
      ok: false,
      error: "Publish readiness check failed",
      readiness,
    }, 422);
  }

  const ts = now();
  const publishedAt = new Date(ts * 1000).toISOString();

  await db
    .prepare(`UPDATE cms_pages
              SET status = 'published', updated_at = ?, published_at = ?
              WHERE id = ?`)
    .bind(ts, ts, pageId)
    .run();

  return json({ ok: true, page_id: pageId, published_at: publishedAt });
}

// ── GET /api/cms/themes ────────────────────────────────────────────────────
export async function listThemes(url: URL, db: D1Database): Promise<Response> {
  const workspaceId = url.searchParams.get("workspace_id");

  let q = `SELECT id, name, slug, css_vars_json, tokens_json, typography_json,
                  components_json, status, sort_order, preview_image_url
           FROM cms_themes
           WHERE status = 'active'`;
  const params: unknown[] = [];

  if (workspaceId) {
    q += " AND (workspace_id = ? OR workspace_id IS NULL OR visibility = 'public')";
    params.push(workspaceId);
  }

  q += " ORDER BY sort_order ASC, name ASC LIMIT 50";

  const { results } = await db.prepare(q).bind(...params).all();

  // Parse JSON columns
  const themes = (results ?? []).map((t: Record<string, unknown>) => ({
    ...t,
    css_vars_json:    parseJson(t.css_vars_json as string),
    tokens_json:      parseJson(t.tokens_json as string),
    typography_json:  parseJson(t.typography_json as string),
    components_json:  parseJson(t.components_json as string),
  }));

  return json({ ok: true, themes });
}

// ── GET /api/cms/templates ─────────────────────────────────────────────────
export async function listTemplates(url: URL, db: D1Database): Promise<Response> {
  const category = url.searchParams.get("category");

  let q = `SELECT id, template_name, template_type, category,
                  preview_image_url, is_system
           FROM cms_component_templates`;
  const params: unknown[] = [];

  if (category) {
    q += " WHERE category = ?";
    params.push(category);
  }

  q += " ORDER BY category ASC, template_name ASC LIMIT 200";

  const { results } = await db.prepare(q).bind(...params).all();
  return json({ ok: true, templates: results ?? [] });
}

// ── POST /api/cms/assets/upload ────────────────────────────────────────────
export async function uploadAsset(
  request: Request,
  env: { ASSETS_BUCKET: R2Bucket }
): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return json({ ok: false, error: "No file provided" }, 400);

  const ext  = file.name.split(".").pop() ?? "bin";
  const key  = `uploads/${nanoid()}.${ext}`;
  const body = await file.arrayBuffer();

  await env.ASSETS_BUCKET.put(key, body, {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  return json({
    ok: true,
    key,
    url: `/api/cms/assets/${key}`,
    filename: file.name,
    size: file.size,
    type: file.type,
  });
}

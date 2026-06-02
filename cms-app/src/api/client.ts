// Worker API client — all calls proxy to /api/cms/* on the Cloudflare Worker
// In dev: Vite proxies to https://agentsam-cms-editor.meauxbility.workers.dev
// In prod: same origin

import type { CmsPage, CmsSection, CmsTheme, PublishReadiness } from '../types/cms'

const BASE = '/api/cms'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API ${path} → ${res.status}: ${err}`)
  }
  return res.json() as Promise<T>
}

// ── Pages ──────────────────────────────────────────────────────────────────
export async function listPages(projectId: string): Promise<CmsPage[]> {
  return req<CmsPage[]>(`/pages?project_id=${projectId}`)
}

export async function getPage(pageId: string): Promise<{ page: CmsPage; sections: CmsSection[] }> {
  return req(`/pages/${pageId}`)
}

// ── Sections ───────────────────────────────────────────────────────────────
export async function reorderSections(
  pageId: string,
  orderedIds: string[]
): Promise<{ ok: boolean }> {
  return req(`/pages/${pageId}/sections/reorder`, {
    method: 'POST',
    body: JSON.stringify({ ordered_ids: orderedIds }),
  })
}

export async function updateSectionData(
  sectionId: string,
  data: Record<string, unknown>
): Promise<{ ok: boolean }> {
  return req(`/sections/${sectionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ section_data: data }),
  })
}

export async function toggleSectionVisibility(
  sectionId: string,
  visible: boolean
): Promise<{ ok: boolean }> {
  return req(`/sections/${sectionId}/visibility`, {
    method: 'PATCH',
    body: JSON.stringify({ is_visible: visible ? 1 : 0 }),
  })
}

// ── Draft / Publish ────────────────────────────────────────────────────────
export async function saveDraft(pageId: string): Promise<{ ok: boolean; saved_at: string }> {
  return req(`/pages/${pageId}/draft`, { method: 'POST' })
}

export async function checkPublishReadiness(pageId: string): Promise<PublishReadiness> {
  return req(`/pages/${pageId}/readiness`)
}

export async function publishPage(pageId: string): Promise<{ ok: boolean; published_at: string }> {
  return req(`/pages/${pageId}/publish`, { method: 'POST' })
}

// ── Themes ─────────────────────────────────────────────────────────────────
export async function listThemes(): Promise<CmsTheme[]> {
  return req<CmsTheme[]>('/themes')
}

export async function getTheme(themeId: string): Promise<CmsTheme> {
  return req<CmsTheme>(`/themes/${themeId}`)
}

// ── Assets ─────────────────────────────────────────────────────────────────
export async function uploadAsset(file: File): Promise<{ ok: boolean; url: string; key: string }> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${BASE}/assets/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  return res.json()
}

// ── Agent Sam chat ─────────────────────────────────────────────────────────
export async function agentChat(payload: {
  message: string
  pageId?: string
  selectedSectionId?: string
  selectedComponentId?: string
  sessionId?: string
}): Promise<{ ok: boolean; reply: string; actions?: unknown[] }> {
  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
}

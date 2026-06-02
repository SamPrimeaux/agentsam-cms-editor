import { create } from 'zustand'
import type { CmsPage, CmsSection, CmsTheme, Device, EditTarget, PublishReadiness } from '../types/cms'
import * as api from '../api/client'

interface EditorState {
  // ── Session ──────────────────────────────────────────────────
  sessionId: string
  projectId: string

  // ── Pages ────────────────────────────────────────────────────
  pages: CmsPage[]
  activePage: CmsPage | null
  sections: CmsSection[]
  loadingPage: boolean

  // ── Selection ────────────────────────────────────────────────
  selectedSectionId: string | null
  editTarget: EditTarget | null

  // ── Themes ───────────────────────────────────────────────────
  themes: CmsTheme[]
  activeTheme: CmsTheme | null

  // ── Canvas ───────────────────────────────────────────────────
  device: Device
  canvasZoom: number

  // ── Dirty / save state ───────────────────────────────────────
  isDirty: boolean
  isSaving: boolean
  lastSaved: string | null

  // ── Publish ──────────────────────────────────────────────────
  readiness: PublishReadiness | null
  isPublishing: boolean

  // ── Agent Sam ────────────────────────────────────────────────
  agentOpen: boolean
  agentMessages: { role: 'user' | 'assistant'; text: string; ts: number }[]
  agentLoading: boolean

  // ── Actions ──────────────────────────────────────────────────
  init: (projectId: string) => Promise<void>
  loadPage: (pageId: string) => Promise<void>
  selectSection: (sectionId: string | null) => void
  setDevice: (device: Device) => void
  setZoom: (zoom: number) => void

  // Section data editing
  updateSectionField: (sectionId: string, key: string, value: unknown) => void
  commitSectionData: (sectionId: string) => Promise<void>
  toggleSectionVisibility: (sectionId: string) => Promise<void>

  // Drag-and-drop reorder — called by dnd-kit on dragEnd
  reorderSections: (orderedIds: string[]) => Promise<void>

  // Theme
  loadThemes: () => Promise<void>
  setTheme: (themeId: string) => void

  // Draft / publish
  saveDraft: () => Promise<void>
  checkReadiness: () => Promise<void>
  publish: () => Promise<void>

  // Agent Sam
  toggleAgent: () => void
  sendAgentMessage: (text: string) => Promise<void>
}

export const useEditorStore = create<EditorState>((set, get) => ({
  sessionId: `edit_${Math.random().toString(36).slice(2, 10)}`,
  projectId: 'inneranimalmedia',
  pages: [],
  activePage: null,
  sections: [],
  loadingPage: false,
  selectedSectionId: null,
  editTarget: null,
  themes: [],
  activeTheme: null,
  device: 'desktop',
  canvasZoom: 100,
  isDirty: false,
  isSaving: false,
  lastSaved: null,
  readiness: null,
  isPublishing: false,
  agentOpen: false,
  agentMessages: [],
  agentLoading: false,

  // ── Init ──────────────────────────────────────────────────────
  init: async (projectId) => {
    set({ projectId })
    try {
      const [pages, themes] = await Promise.all([
        api.listPages(projectId),
        api.listThemes(),
      ])
      const clayTheme = themes.find(t => t.slug === 'iam-clay') ?? themes[0] ?? null
      set({ pages, themes, activeTheme: clayTheme })
      if (clayTheme) applyThemeToDom(clayTheme)
      // Auto-load first page
      if (pages.length > 0) {
        await get().loadPage(pages[0].id)
      }
    } catch (e) {
      console.error('Editor init failed:', e)
    }
  },

  // ── Load Page ─────────────────────────────────────────────────
  loadPage: async (pageId) => {
    set({ loadingPage: true, selectedSectionId: null })
    try {
      const { page, sections } = await api.getPage(pageId)
      const sorted = [...sections].sort((a, b) => a.sort_order - b.sort_order)
      set({
        activePage: page,
        sections: sorted,
        loadingPage: false,
        isDirty: false,
        editTarget: { type: 'page', id: page.id, label: page.title, pageId: page.id },
      })
    } catch (e) {
      console.error('loadPage failed:', e)
      set({ loadingPage: false })
    }
  },

  // ── Selection ─────────────────────────────────────────────────
  selectSection: (sectionId) => {
    const { sections, activePage } = get()
    if (!sectionId) {
      set({
        selectedSectionId: null,
        editTarget: activePage
          ? { type: 'page', id: activePage.id, label: activePage.title, pageId: activePage.id }
          : null,
      })
      return
    }
    const sec = sections.find(s => s.id === sectionId)
    set({
      selectedSectionId: sectionId,
      editTarget: sec
        ? { type: 'section', id: sec.id, label: sec.section_name, pageId: activePage?.id, sectionId: sec.id }
        : null,
    })
  },

  setDevice: (device) => set({ device }),
  setZoom: (zoom) => set({ canvasZoom: zoom }),

  // ── Section editing ───────────────────────────────────────────
  updateSectionField: (sectionId, key, value) => {
    set(state => ({
      isDirty: true,
      sections: state.sections.map(s =>
        s.id === sectionId
          ? { ...s, section_data: { ...s.section_data, [key]: value } }
          : s
      ),
    }))
  },

  commitSectionData: async (sectionId) => {
    const sec = get().sections.find(s => s.id === sectionId)
    if (!sec) return
    await api.updateSectionData(sectionId, sec.section_data)
  },

  toggleSectionVisibility: async (sectionId) => {
    const sec = get().sections.find(s => s.id === sectionId)
    if (!sec) return
    const next = sec.is_visible === 1 ? 0 : 1
    set(state => ({
      isDirty: true,
      sections: state.sections.map(s => s.id === sectionId ? { ...s, is_visible: next } : s),
    }))
    await api.toggleSectionVisibility(sectionId, next === 1)
  },

  // ── Drag-and-drop reorder ─────────────────────────────────────
  reorderSections: async (orderedIds) => {
    // Optimistic update — assign new sort_order locally immediately
    set(state => {
      const map = new Map(state.sections.map(s => [s.id, s]))
      const reordered = orderedIds
        .map((id, i) => {
          const s = map.get(id)
          return s ? { ...s, sort_order: (i + 1) * 10 } : null
        })
        .filter(Boolean) as CmsSection[]
      return { sections: reordered, isDirty: true }
    })
    const pageId = get().activePage?.id
    if (!pageId) return
    try {
      await api.reorderSections(pageId, orderedIds)
    } catch (e) {
      console.error('reorderSections failed:', e)
    }
  },

  // ── Themes ────────────────────────────────────────────────────
  loadThemes: async () => {
    const themes = await api.listThemes()
    set({ themes })
  },

  setTheme: (themeId) => {
    const theme = get().themes.find(t => t.id === themeId)
    if (theme) {
      set({ activeTheme: theme })
      applyThemeToDom(theme)
    }
  },

  // ── Draft / publish ───────────────────────────────────────────
  saveDraft: async () => {
    const pageId = get().activePage?.id
    if (!pageId) return
    set({ isSaving: true })
    try {
      const res = await api.saveDraft(pageId)
      set({ isSaving: false, isDirty: false, lastSaved: res.saved_at })
    } catch (e) {
      console.error('saveDraft failed:', e)
      set({ isSaving: false })
    }
  },

  checkReadiness: async () => {
    const pageId = get().activePage?.id
    if (!pageId) return
    const readiness = await api.checkPublishReadiness(pageId)
    set({ readiness })
  },

  publish: async () => {
    const pageId = get().activePage?.id
    if (!pageId) return
    set({ isPublishing: true })
    try {
      await get().checkReadiness()
      const { readiness } = get()
      if (!readiness?.ok) {
        set({ isPublishing: false })
        return
      }
      await api.publishPage(pageId)
      set(state => ({
        isPublishing: false,
        isDirty: false,
        activePage: state.activePage ? { ...state.activePage, status: 'published' } : null,
        pages: state.pages.map(p => p.id === pageId ? { ...p, status: 'published' } : p),
      }))
    } catch (e) {
      console.error('publish failed:', e)
      set({ isPublishing: false })
    }
  },

  // ── Agent Sam ─────────────────────────────────────────────────
  toggleAgent: () => set(s => ({ agentOpen: !s.agentOpen })),

  sendAgentMessage: async (text) => {
    const { activePage, selectedSectionId, sessionId } = get()
    set(s => ({
      agentLoading: true,
      agentMessages: [...s.agentMessages, { role: 'user', text, ts: Date.now() }],
    }))
    try {
      const res = await api.agentChat({
        message: text,
        pageId: activePage?.id,
        selectedSectionId: selectedSectionId ?? undefined,
        sessionId,
      })
      set(s => ({
        agentLoading: false,
        agentMessages: [...s.agentMessages, { role: 'assistant', text: res.reply ?? '...', ts: Date.now() }],
      }))
    } catch {
      set(s => ({
        agentLoading: false,
        agentMessages: [...s.agentMessages, { role: 'assistant', text: 'Agent Sam unavailable.', ts: Date.now() }],
      }))
    }
  },
}))

// ── DOM theme injection ────────────────────────────────────────────────────
// Writes CSS variables from the active theme directly onto :root so the
// canvas iframe and all UI panels reflect the correct theme instantly.
function applyThemeToDom(theme: CmsTheme) {
  const root = document.documentElement
  const vars = theme.css_vars_json ?? {}
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
}

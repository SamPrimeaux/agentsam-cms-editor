// Core CMS types derived from D1 schema

export type PageStatus = 'draft' | 'published' | 'archived' | 'scheduled'
export type Device = 'desktop' | 'tablet' | 'phone'
export type EditTargetType = 'page' | 'template' | 'section' | 'global' | 'theme' | 'system'

export interface CmsPage {
  id: string
  title: string
  slug: string
  status: PageStatus
  page_type: string
  project_id: string
  tenant_id: string
  meta_description?: string
  seo_title?: string
  is_homepage: number
  sort_order: number
  updated_at: number
  created_at: number
}

export interface CmsSection {
  id: string
  page_id: string
  section_name: string
  section_type: string
  section_data: Record<string, unknown>
  sort_order: number
  is_visible: number
  css_classes?: string
  custom_css?: string
  updated_at?: string
}

export interface CmsComponent {
  id: string
  section_id: string
  component_type: string
  component_data: Record<string, unknown>
  sort_order: number
  is_visible: number
}

export interface CmsTheme {
  id: string
  name: string
  slug: string
  css_vars_json: Record<string, string>
  tokens_json: Record<string, unknown>
  typography_json: Record<string, unknown>
  status: string
}

export interface EditTarget {
  type: EditTargetType
  id: string
  label: string
  pageId?: string
  sectionId?: string
}

export interface PublishReadiness {
  ok: boolean
  orphan_components: number
  sort_orders_valid: boolean
  missing_sort_orders: number
  schema_clean: boolean
}

export interface AgentContext {
  editTarget: EditTarget | null
  device: Device
  theme: CmsTheme | null
  sessionId: string
}

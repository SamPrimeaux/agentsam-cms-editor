import { useState } from 'react'
import { useEditorStore } from '../../store/editor'
import type { CmsTheme } from '../../types/cms'

export default function FieldsPanel() {
  const { selectedSectionId, sections, activeTheme, editTarget, updateSectionField, commitSectionData, readiness } = useEditorStore()
  const [tab, setTab] = useState<'content' | 'design' | 'theme' | 'seo'>('content')

  const section = sections.find(s => s.id === selectedSectionId)
  const data = (section?.section_data ?? {}) as Record<string, string>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Context label */}
      <div style={{
        padding: '8px 12px 6px',
        borderBottom: '1px solid var(--chrome-border)',
        fontSize: 10, color: 'var(--chrome-text-muted)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          {editTarget?.type ?? 'page'}
        </span>
        <span style={{ opacity: 0.4 }}>—</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
          {editTarget?.label ?? 'Nothing selected'}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--chrome-border)', flexShrink: 0 }}>
        {(['content', 'design', 'theme', 'seo'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '7px 0', fontSize: 10, border: 'none',
              background: 'transparent', cursor: 'pointer',
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--chrome-text)' : 'var(--chrome-text-muted)',
              borderBottom: tab === t ? '2px solid var(--chrome-accent)' : '2px solid transparent',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
        {tab === 'content' && section && (
          <ContentTab
            data={data}
            sectionId={section.id}
            onChange={(k, v) => updateSectionField(section.id, k, v)}
            onBlur={() => commitSectionData(section.id)}
          />
        )}
        {tab === 'content' && !section && (
          <Empty>Select a section to edit its content</Empty>
        )}
        {tab === 'design' && section && (
          <DesignTab
            data={data}
            sectionId={section.id}
            onChange={(k, v) => updateSectionField(section.id, k, v)}
            onBlur={() => commitSectionData(section.id)}
          />
        )}
        {tab === 'theme' && (
          <ThemeTab theme={activeTheme} />
        )}
        {tab === 'seo' && (
          <SeoTab />
        )}
      </div>

      {/* Publish readiness */}
      {readiness && (
        <ReadinessFooter readiness={readiness} />
      )}
    </div>
  )
}

// ── Content Tab ────────────────────────────────────────────────────────────
function ContentTab({ data, sectionId, onChange, onBlur }: {
  data: Record<string, string>
  sectionId: string
  onChange: (k: string, v: string) => void
  onBlur: () => void
}) {
  // Render editable fields for known keys; fall back to generic key/value editor
  const knownTextFields = ['title', 'heading', 'eyebrow', 'subheading', 'body', 'paragraph',
    'primary_cta_label', 'primary_cta_href', 'secondary_cta_label', 'secondary_cta_href']

  const textFields = knownTextFields.filter(k => k in data)
  const otherFields = Object.keys(data).filter(k => !knownTextFields.includes(k) && k !== 'layout' && k !== 'bullets')

  return (
    <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {textFields.map(key => (
        <FieldGroup key={key} label={key}>
          {key === 'body' || key === 'paragraph' ? (
            <textarea
              value={data[key] ?? ''}
              onChange={e => onChange(key, e.target.value)}
              onBlur={onBlur}
              rows={4}
              style={textareaStyle}
            />
          ) : (
            <input
              value={data[key] ?? ''}
              onChange={e => onChange(key, e.target.value)}
              onBlur={onBlur}
              style={inputStyle}
            />
          )}
        </FieldGroup>
      ))}

      {/* Bullets editor */}
      {'bullets' in data && (
        <FieldGroup label="bullets">
          <BulletsEditor
            bullets={Array.isArray(data.bullets) ? data.bullets as unknown as string[] : []}
            onChange={bullets => onChange('bullets', bullets as unknown as string)}
            onBlur={onBlur}
          />
        </FieldGroup>
      )}

      {/* Generic remaining fields */}
      {otherFields.map(key => (
        <FieldGroup key={key} label={key}>
          <input
            value={typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key])}
            onChange={e => onChange(key, e.target.value)}
            onBlur={onBlur}
            style={inputStyle}
          />
        </FieldGroup>
      ))}
    </div>
  )
}

function BulletsEditor({ bullets, onChange, onBlur }: {
  bullets: string[]
  onChange: (b: string[]) => void
  onBlur: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {bullets.map((b, i) => (
        <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--chrome-text-muted)', width: 16, textAlign: 'right' }}>{i + 1}</span>
          <input
            value={b}
            onChange={e => {
              const next = [...bullets]; next[i] = e.target.value; onChange(next)
            }}
            onBlur={onBlur}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => { onChange(bullets.filter((_, j) => j !== i)); onBlur() }}
            style={{ background: 'transparent', border: 'none', color: 'var(--chrome-text-muted)', cursor: 'pointer', fontSize: 11 }}
          >✕</button>
        </div>
      ))}
      <button
        onClick={() => { onChange([...bullets, '']); }}
        style={{ fontSize: 11, color: 'var(--chrome-accent)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '2px 0' }}
      >
        + Add bullet
      </button>
    </div>
  )
}

// ── Design Tab ─────────────────────────────────────────────────────────────
function DesignTab({ data, onChange, onBlur }: {
  data: Record<string, string>
  sectionId: string
  onChange: (k: string, v: string) => void
  onBlur: () => void
}) {
  const layouts = ['split-right', 'split-left', 'centered', 'full-bleed']
  const currentLayout = (data.layout as string) ?? 'split-right'

  return (
    <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Layout toggle */}
      <FieldGroup label="layout">
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {layouts.map(l => (
            <button
              key={l}
              onClick={() => { onChange('layout', l); onBlur() }}
              style={{
                fontSize: 10, padding: '4px 8px', cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                background: currentLayout === l ? 'var(--chrome-accent)' : 'var(--chrome-surface)',
                color: currentLayout === l ? '#fff' : 'var(--chrome-text-muted)',
                border: '1px solid var(--chrome-border)',
                fontWeight: currentLayout === l ? 600 : 400,
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* Background color override */}
      <FieldGroup label="background color">
        <ColorPicker
          value={(data.bg_color as string) ?? ''}
          onChange={v => { onChange('bg_color', v); onBlur() }}
        />
      </FieldGroup>

      {/* Text color override */}
      <FieldGroup label="text color">
        <ColorPicker
          value={(data.text_color as string) ?? ''}
          onChange={v => { onChange('text_color', v); onBlur() }}
        />
      </FieldGroup>
    </div>
  )
}

// ── Theme Tab ──────────────────────────────────────────────────────────────
function ThemeTab({ theme }: { theme: CmsTheme | null }) {
  const { themes, setTheme } = useEditorStore()

  if (!theme) return <Empty>No theme active</Empty>

  const vars = theme.css_vars_json ?? {}
  const typography = (theme.typography_json ?? {}) as Record<string, string>

  // Group vars by category
  const colorVars = Object.entries(vars).filter(([k]) => k.includes('color') || k.includes('bg'))
  const radiusVars = Object.entries(vars).filter(([k]) => k.includes('radius'))
  const fontVars = Object.entries(vars).filter(([k]) => k.includes('font'))

  return (
    <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Theme switcher */}
      <FieldGroup label="active theme">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {themes.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
                background: t.id === theme.id ? 'rgba(217,119,87,0.12)' : 'transparent',
                border: t.id === theme.id ? '1px solid var(--chrome-accent)' : '1px solid var(--chrome-border)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                color: 'var(--chrome-text)', fontSize: 11,
              }}
            >
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: (t.css_vars_json as Record<string, string>)['--color-primary'] ?? '#888',
                flexShrink: 0,
              }} />
              {t.name}
              {t.id === theme.id && <span style={{ marginLeft: 'auto', color: 'var(--chrome-accent)', fontSize: 10 }}>✓</span>}
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* Color tokens */}
      {colorVars.length > 0 && (
        <FieldGroup label="color tokens">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {colorVars.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                  background: v, border: '1px solid var(--chrome-border)',
                }} />
                <span style={{ color: 'var(--chrome-text-muted)', flex: 1, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span>
                <span style={{ color: 'var(--chrome-text)', fontFamily: 'var(--font-mono)' }}>{v}</span>
              </div>
            ))}
          </div>
        </FieldGroup>
      )}

      {/* Typography */}
      {Object.keys(typography).length > 0 && (
        <FieldGroup label="typography">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(typography).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ color: 'var(--chrome-text-muted)', fontFamily: 'var(--font-mono)' }}>{k}</span>
                <span style={{ color: 'var(--chrome-text)', fontFamily: 'var(--font-mono)' }}>{v}</span>
              </div>
            ))}
          </div>
        </FieldGroup>
      )}

      {/* Font picker */}
      <FieldGroup label="font family">
        <FontPicker current={vars['--font-family'] ?? typography['fontFamily'] ?? ''} />
      </FieldGroup>

      {/* Border radius */}
      {radiusVars.length > 0 && (
        <FieldGroup label="border radius">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {radiusVars.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: 20, height: 20, background: 'var(--chrome-border)', borderRadius: v }} />
                <span style={{ fontSize: 9, color: 'var(--chrome-text-muted)', fontFamily: 'var(--font-mono)' }}>{v}</span>
              </div>
            ))}
          </div>
        </FieldGroup>
      )}
    </div>
  )
}

// ── SEO Tab ────────────────────────────────────────────────────────────────
function SeoTab() {
  const { activePage } = useEditorStore()
  if (!activePage) return <Empty>No page selected</Empty>
  return (
    <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <FieldGroup label="SEO title">
        <input defaultValue={activePage.seo_title ?? activePage.title} style={inputStyle} />
      </FieldGroup>
      <FieldGroup label="meta description">
        <textarea defaultValue={activePage.meta_description ?? ''} rows={3} style={textareaStyle} />
      </FieldGroup>
      <FieldGroup label="slug">
        <input defaultValue={activePage.slug} style={inputStyle} />
      </FieldGroup>
      <FieldGroup label="canonical URL">
        <input placeholder="https://…" style={inputStyle} />
      </FieldGroup>
    </div>
  )
}

// ── Color Picker ───────────────────────────────────────────────────────────
function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="color"
        value={value || '#ffffff'}
        onChange={e => onChange(e.target.value)}
        style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}
      />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="var(--color-bg) or #hex"
        style={{ ...inputStyle, flex: 1 }}
      />
    </div>
  )
}

// ── Font Picker ────────────────────────────────────────────────────────────
const FONT_OPTIONS = [
  'Inter, system-ui, sans-serif',
  'DM Sans, system-ui, sans-serif',
  '"Playfair Display", Georgia, serif',
  '"DM Serif Display", Georgia, serif',
  'Lora, Georgia, serif',
  '"Space Grotesk", system-ui, sans-serif',
  '"Syne", system-ui, sans-serif',
  'Montserrat, system-ui, sans-serif',
]

function FontPicker({ current }: { current: string }) {
  const { activeTheme, setTheme, themes } = useEditorStore()
  return (
    <select
      value={current}
      onChange={e => {
        if (activeTheme) {
          // Update the CSS var on :root immediately for preview
          document.documentElement.style.setProperty('--font-family', e.target.value)
        }
      }}
      style={{ ...inputStyle, cursor: 'pointer' }}
    >
      {FONT_OPTIONS.map(f => (
        <option key={f} value={f} style={{ fontFamily: f }}>{f.split(',')[0].replace(/"/g, '')}</option>
      ))}
    </select>
  )
}

// ── Readiness footer ───────────────────────────────────────────────────────
function ReadinessFooter({ readiness }: { readiness: import('../../types/cms').PublishReadiness }) {
  const checks = [
    { label: 'No orphan components', ok: readiness.orphan_components === 0 },
    { label: 'Sort orders valid', ok: readiness.sort_orders_valid },
    { label: 'Schema clean', ok: readiness.schema_clean },
  ]
  return (
    <div style={{
      borderTop: '1px solid var(--chrome-border)',
      padding: '8px 12px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--chrome-text-muted)', fontWeight: 600, marginBottom: 2 }}>
        Publish Readiness
      </div>
      {checks.map(c => (
        <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
          <span style={{ color: c.ok ? '#4ADE80' : '#D97757' }}>{c.ok ? '✓' : '✕'}</span>
          <span style={{ color: c.ok ? 'var(--chrome-text)' : 'var(--chrome-text-muted)' }}>{c.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Shared primitives ──────────────────────────────────────────────────────
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--chrome-text-muted)', fontWeight: 600 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '24px 12px', fontSize: 11, color: 'var(--chrome-text-muted)', textAlign: 'center' }}>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--chrome-surface)',
  border: '1px solid var(--chrome-border)', borderRadius: 'var(--radius-sm)',
  color: 'var(--chrome-text)', padding: '5px 8px', fontSize: 12, outline: 'none',
}
const textareaStyle: React.CSSProperties = {
  ...inputStyle, resize: 'vertical', lineHeight: 1.5,
}

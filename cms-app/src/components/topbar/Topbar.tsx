import { useState } from 'react'
import { useEditorStore } from '../../store/editor'

const DEVICES = [
  { key: 'desktop', label: 'Desktop', icon: '⬜' },
  { key: 'tablet',  label: 'Tablet',  icon: '▭' },
  { key: 'phone',   label: 'Phone',   icon: '▯' },
] as const

export default function Topbar() {
  const {
    activePage, pages, themes, activeTheme,
    device, isDirty, isSaving, isPublishing,
    setDevice, setTheme, saveDraft, publish, loadPage,
  } = useEditorStore()

  const [pagePickerOpen, setPagePickerOpen] = useState(false)
  const [themePickerOpen, setThemePickerOpen] = useState(false)

  return (
    <header style={{
      height: 'var(--topbar-h)',
      background: 'var(--chrome-bg)',
      borderBottom: '1px solid var(--chrome-border)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 12px',
      position: 'relative',
      zIndex: 100,
    }}>
      {/* Brand */}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--chrome-accent)', letterSpacing: '0.08em', marginRight: 4 }}>
        AGENT SAM
      </span>

      <div style={{ width: 1, height: 20, background: 'var(--chrome-border)' }} />

      {/* Page selector */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { setPagePickerOpen(o => !o); setThemePickerOpen(false) }}
          style={btnStyle}
        >
          <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activePage?.title ?? 'Select page'}
          </span>
          {activePage && (
            <StatusBadge status={activePage.status} />
          )}
          <span style={{ marginLeft: 4, opacity: 0.5, fontSize: 10 }}>▾</span>
        </button>

        {pagePickerOpen && (
          <PagePicker
            pages={pages}
            activeId={activePage?.id}
            onSelect={(id) => { loadPage(id); setPagePickerOpen(false) }}
            onClose={() => setPagePickerOpen(false)}
          />
        )}
      </div>

      {/* Theme picker */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { setThemePickerOpen(o => !o); setPagePickerOpen(false) }}
          style={btnStyle}
        >
          <span style={{ fontSize: 10, opacity: 0.6, marginRight: 4 }}>Theme</span>
          {activeTheme?.name ?? 'Default'}
          <span style={{ marginLeft: 4, opacity: 0.5, fontSize: 10 }}>▾</span>
        </button>
        {themePickerOpen && (
          <ThemePicker
            themes={themes}
            activeId={activeTheme?.id}
            onSelect={(id) => { setTheme(id); setThemePickerOpen(false) }}
            onClose={() => setThemePickerOpen(false)}
          />
        )}
      </div>

      {/* Device toggle */}
      <div style={{ display: 'flex', gap: 2, marginLeft: 4, background: 'var(--chrome-surface)', borderRadius: 'var(--radius-md)', padding: 2 }}>
        {DEVICES.map(d => (
          <button
            key={d.key}
            onClick={() => setDevice(d.key)}
            title={d.label}
            style={{
              ...iconBtnStyle,
              background: device === d.key ? 'var(--chrome-border)' : 'transparent',
              color: device === d.key ? 'var(--chrome-text)' : 'var(--chrome-text-muted)',
            }}
          >
            {d.icon}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Save draft */}
      <button
        onClick={saveDraft}
        disabled={!isDirty || isSaving}
        style={{
          ...actionBtnStyle,
          opacity: isDirty ? 1 : 0.4,
          background: 'var(--chrome-surface)',
          border: '1px solid var(--chrome-border)',
          color: 'var(--chrome-text)',
        }}
      >
        {isSaving ? 'Saving…' : isDirty ? 'Save draft' : 'Saved'}
      </button>

      {/* Publish */}
      <button
        onClick={publish}
        disabled={isPublishing}
        style={{
          ...actionBtnStyle,
          background: 'var(--chrome-accent)',
          color: '#fff',
          border: 'none',
        }}
      >
        {isPublishing ? 'Publishing…' : 'Publish'}
      </button>
    </header>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge-${status}`} style={{
      fontSize: 9, fontWeight: 600, padding: '2px 6px',
      borderRadius: 'var(--radius-sm)', marginLeft: 6,
      textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
      {status}
    </span>
  )
}

function PagePicker({ pages, activeId, onSelect, onClose }: {
  pages: import('../../types/cms').CmsPage[]
  activeId?: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const filtered = pages.filter(p =>
    p.title.toLowerCase().includes(q.toLowerCase()) ||
    p.slug.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div style={dropdownStyle} onMouseLeave={onClose}>
      <input
        autoFocus
        placeholder="Search pages…"
        value={q}
        onChange={e => setQ(e.target.value)}
        style={searchStyle}
      />
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {filtered.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              ...dropdownItemStyle,
              background: p.id === activeId ? 'var(--chrome-border)' : 'transparent',
            }}
          >
            <span style={{ flex: 1, textAlign: 'left' }}>{p.title}</span>
            <StatusBadge status={p.status} />
          </button>
        ))}
      </div>
    </div>
  )
}

function ThemePicker({ themes, activeId, onSelect, onClose }: {
  themes: import('../../types/cms').CmsTheme[]
  activeId?: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  return (
    <div style={{ ...dropdownStyle, minWidth: 180 }} onMouseLeave={onClose}>
      {themes.map(t => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          style={{
            ...dropdownItemStyle,
            background: t.id === activeId ? 'var(--chrome-border)' : 'transparent',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {/* Color swatch from theme primary */}
          <span style={{
            width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
            background: (t.css_vars_json as Record<string, string>)['--color-primary'] ?? '#888',
          }} />
          {t.name}
          {t.id === activeId && <span style={{ marginLeft: 'auto', color: 'var(--chrome-accent)', fontSize: 10 }}>✓</span>}
        </button>
      ))}
    </div>
  )
}

// ── Shared styles ──────────────────────────────────────────────────────────
const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4,
  background: 'var(--chrome-surface)',
  border: '1px solid var(--chrome-border)',
  color: 'var(--chrome-text)',
  borderRadius: 'var(--radius-md)',
  padding: '4px 10px',
  fontSize: 12,
  height: 28,
  cursor: 'pointer',
}
const iconBtnStyle: React.CSSProperties = {
  width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 'var(--radius-sm)', border: 'none', fontSize: 13, cursor: 'pointer',
}
const actionBtnStyle: React.CSSProperties = {
  padding: '4px 14px', height: 28, fontSize: 12,
  borderRadius: 'var(--radius-md)', fontWeight: 500, cursor: 'pointer',
}
const dropdownStyle: React.CSSProperties = {
  position: 'absolute', top: 'calc(100% + 4px)', left: 0,
  background: 'var(--chrome-surface)',
  border: '1px solid var(--chrome-border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-lg)',
  zIndex: 200, minWidth: 260, overflow: 'hidden',
}
const searchStyle: React.CSSProperties = {
  width: '100%', background: 'transparent', border: 'none',
  borderBottom: '1px solid var(--chrome-border)',
  color: 'var(--chrome-text)', padding: '8px 12px', fontSize: 12,
  outline: 'none',
}
const dropdownItemStyle: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center',
  padding: '7px 12px', fontSize: 12, border: 'none',
  color: 'var(--chrome-text)', cursor: 'pointer',
  gap: 8,
}

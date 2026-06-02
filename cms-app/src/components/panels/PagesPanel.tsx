import { useEditorStore } from '../../store/editor'

export default function PagesPanel() {
  const { pages, activePage, loadPage } = useEditorStore()

  return (
    <div style={{
      borderBottom: '1px solid var(--chrome-border)',
      flexShrink: 0,
    }}>
      <div style={sectionHeader}>
        <span>Pages</span>
        <span style={{ fontSize: 10, color: 'var(--chrome-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {pages.length}
        </span>
      </div>
      <div style={{ maxHeight: 220, overflowY: 'auto', padding: '2px 0' }}>
        {pages.map(page => (
          <button
            key={page.id}
            onClick={() => loadPage(page.id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              padding: '6px 12px', border: 'none', cursor: 'pointer',
              background: activePage?.id === page.id ? 'var(--chrome-border)' : 'transparent',
              color: 'var(--chrome-text)', fontSize: 12, gap: 8,
              borderLeft: activePage?.id === page.id ? '2px solid var(--chrome-accent)' : '2px solid transparent',
            }}
          >
            <PageIcon type={page.page_type} />
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {page.title}
            </span>
            <StatusDot status={page.status} />
          </button>
        ))}
      </div>
    </div>
  )
}

function PageIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    home: '⌂', about: '◉', services: '◈', work: '◆',
    contact: '◎', blog: '◈', post: '◇', landing: '▲',
    custom: '◻',
  }
  return <span style={{ fontSize: 11, opacity: 0.5, width: 14, textAlign: 'center' }}>{icons[type] ?? '◻'}</span>
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    published: '#4ADE80', draft: '#D97757', archived: '#555', scheduled: '#FACC15',
  }
  return (
    <span style={{
      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
      background: colors[status] ?? '#555',
    }} />
  )
}

const sectionHeader: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '8px 12px 6px',
  fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--chrome-text-muted)',
}

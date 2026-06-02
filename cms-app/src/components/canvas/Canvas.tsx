import { useRef, useEffect, useCallback } from 'react'
import { useEditorStore } from '../../store/editor'

// Device viewport widths
const DEVICE_WIDTHS = { desktop: '100%', tablet: '768px', phone: '390px' }

export default function Canvas() {
  const { activePage, activeTheme, device, canvasZoom, selectedSectionId, selectSection } = useEditorStore()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Inject theme CSS vars into the iframe when theme changes
  const injectTheme = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument || !activeTheme) return
    const vars = activeTheme.css_vars_json ?? {}
    const cssText = `:root { ${Object.entries(vars).map(([k, v]) => `${k}: ${v}`).join('; ')} }`
    let styleEl = iframe.contentDocument.getElementById('__ds-theme') as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = iframe.contentDocument.createElement('style')
      styleEl.id = '__ds-theme'
      iframe.contentDocument.head?.appendChild(styleEl)
    }
    styleEl.textContent = cssText
  }, [activeTheme])

  // Inject click listeners into iframe to bubble section selections up
  const injectClickListeners = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument) return
    const doc = iframe.contentDocument

    doc.querySelectorAll('[data-section-id]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        const id = (el as HTMLElement).dataset.sectionId
        if (id) selectSection(id)
      })
    })

    // Click on canvas background deselects
    doc.body.addEventListener('click', () => selectSection(null))
  }, [selectSection])

  // Highlight selected section inside iframe
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument) return
    const doc = iframe.contentDocument

    // Remove existing highlights
    doc.querySelectorAll('.__ds-selected').forEach(el => {
      el.classList.remove('__ds-selected')
      ;(el as HTMLElement).style.outline = ''
    })

    if (selectedSectionId) {
      const el = doc.querySelector(`[data-section-id="${selectedSectionId}"]`) as HTMLElement | null
      if (el) {
        el.classList.add('__ds-selected')
        el.style.outline = '2px solid #D97757'
        el.style.outlineOffset = '-2px'
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [selectedSectionId])

  useEffect(() => { injectTheme() }, [injectTheme])

  const handleIframeLoad = () => {
    injectTheme()
    injectClickListeners()
  }

  const pageUrl = activePage
    ? `https://agentsam-cms-editor.meauxbility.workers.dev/${activePage.slug === 'home' ? '' : activePage.slug}`
    : null

  const width = DEVICE_WIDTHS[device]
  const isConstrained = device !== 'desktop'

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#111',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Canvas toolbar */}
      <div style={{
        width: '100%', height: 32,
        background: 'var(--chrome-surface)',
        borderBottom: '1px solid var(--chrome-border)',
        display: 'flex', alignItems: 'center',
        padding: '0 12px', gap: 8, flexShrink: 0,
      }}>
        {/* URL bar */}
        <div style={{
          flex: 1, height: 20, background: 'var(--chrome-bg)',
          borderRadius: 'var(--radius-sm)', border: '1px solid var(--chrome-border)',
          display: 'flex', alignItems: 'center', padding: '0 8px',
          fontSize: 11, color: 'var(--chrome-text-muted)', fontFamily: 'var(--font-mono)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {pageUrl ?? 'No page selected'}
        </div>

        {/* Zoom */}
        <ZoomControl />

        {/* Open in new tab */}
        {pageUrl && (
          <a href={pageUrl} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 11, color: 'var(--chrome-text-muted)', textDecoration: 'none',
          }}>
            ↗
          </a>
        )}
      </div>

      {/* Iframe wrapper */}
      <div style={{
        flex: 1, width: '100%', overflow: 'auto',
        display: 'flex', justifyContent: 'center',
        alignItems: isConstrained ? 'flex-start' : 'stretch',
        padding: isConstrained ? '16px' : '0',
      }}>
        {activePage ? (
          <div style={{
            width,
            height: isConstrained ? undefined : '100%',
            minHeight: isConstrained ? '100%' : undefined,
            background: '#fff',
            boxShadow: isConstrained ? '0 8px 32px rgba(0,0,0,0.4)' : 'none',
            borderRadius: isConstrained ? 8 : 0,
            overflow: 'hidden',
            flexShrink: 0,
            transform: `scale(${canvasZoom / 100})`,
            transformOrigin: 'top center',
          }}>
            <iframe
              ref={iframeRef}
              src={pageUrl ?? undefined}
              onLoad={handleIframeLoad}
              title="Live preview"
              style={{
                width: '100%',
                height: isConstrained ? '100vh' : '100%',
                border: 'none',
                display: 'block',
              }}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        ) : (
          <EmptyCanvas />
        )}
      </div>
    </div>
  )
}

function ZoomControl() {
  const { canvasZoom, setZoom } = useEditorStore()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button onClick={() => setZoom(Math.max(25, canvasZoom - 10))} style={zoomBtn}>−</button>
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--chrome-text-muted)', width: 32, textAlign: 'center' }}>
        {canvasZoom}%
      </span>
      <button onClick={() => setZoom(Math.min(150, canvasZoom + 10))} style={zoomBtn}>+</button>
      <button onClick={() => setZoom(100)} style={{ ...zoomBtn, fontSize: 9 }}>⊡</button>
    </div>
  )
}

function EmptyCanvas() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: 'var(--chrome-text-muted)', gap: 8,
    }}>
      <div style={{ fontSize: 32, opacity: 0.2 }}>⬜</div>
      <div style={{ fontSize: 12 }}>Select a page to preview</div>
    </div>
  )
}

const zoomBtn: React.CSSProperties = {
  width: 20, height: 20, background: 'transparent',
  border: '1px solid var(--chrome-border)', borderRadius: 3,
  color: 'var(--chrome-text-muted)', fontSize: 12, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

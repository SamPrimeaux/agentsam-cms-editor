import { useState, useRef, useEffect } from 'react'
import { useEditorStore } from '../../store/editor'

export default function AgentBar() {
  const { editTarget, activeTheme, device, activePage, selectedSectionId, agentOpen, agentMessages, agentLoading, toggleAgent, sendAgentMessage } = useEditorStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (agentOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agentMessages, agentOpen])

  const handleSend = () => {
    const text = input.trim()
    if (!text || agentLoading) return
    setInput('')
    sendAgentMessage(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // Context chips
  const chips = [
    activePage?.title,
    selectedSectionId ? `Section: ${editTarget?.label}` : null,
    device,
    activePage?.status,
    activeTheme?.name,
  ].filter(Boolean) as string[]

  return (
    <div style={{ background: 'var(--chrome-bg)', display: 'flex', flexDirection: 'column', height: agentOpen ? 320 : 48, transition: 'height 0.2s ease' }}>
      {/* Message history */}
      {agentOpen && (
        <div style={{
          flex: 1, overflowY: 'auto', padding: '8px 16px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {agentMessages.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--chrome-text-muted)', textAlign: 'center', marginTop: 16 }}>
              Agent Sam is watching. Ask anything about the current page.
            </div>
          )}
          {agentMessages.map((m, i) => (
            <div key={i} style={{
              maxWidth: '80%',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? 'var(--chrome-accent)' : 'var(--chrome-surface)',
              color: m.role === 'user' ? '#fff' : 'var(--chrome-text)',
              borderRadius: 'var(--radius-md)', padding: '6px 10px',
              fontSize: 12, lineHeight: 1.5,
            }}>
              {m.text}
            </div>
          ))}
          {agentLoading && (
            <div style={{ alignSelf: 'flex-start', fontSize: 11, color: 'var(--chrome-text-muted)', fontStyle: 'italic' }}>
              Agent Sam is thinking…
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input row */}
      <div style={{
        height: 48, display: 'flex', alignItems: 'center',
        padding: '0 12px', gap: 8, flexShrink: 0,
        borderTop: agentOpen ? '1px solid var(--chrome-border)' : 'none',
      }}>
        {/* Toggle */}
        <button
          onClick={toggleAgent}
          title="Toggle Agent Sam"
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: agentOpen ? 'var(--chrome-accent)' : 'var(--chrome-surface)',
            border: '1px solid var(--chrome-border)',
            color: agentOpen ? '#fff' : 'var(--chrome-text-muted)',
            fontSize: 13, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ◉
        </button>

        {/* Context chips */}
        <div style={{ display: 'flex', gap: 4, overflow: 'hidden', flexShrink: 0 }}>
          {chips.map(chip => (
            <span key={chip} style={{
              fontSize: 9, padding: '2px 7px', borderRadius: 'var(--radius-sm)',
              background: 'var(--chrome-surface)', border: '1px solid var(--chrome-border)',
              color: 'var(--chrome-text-muted)', whiteSpace: 'nowrap',
              fontFamily: 'var(--font-mono)',
            }}>
              {chip}
            </span>
          ))}
        </div>

        {/* Input */}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask Agent Sam about ${activePage?.title ?? 'this page'}…`}
          style={{
            flex: 1, background: 'var(--chrome-surface)',
            border: '1px solid var(--chrome-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--chrome-text)', padding: '5px 10px',
            fontSize: 12, outline: 'none', height: 28,
          }}
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!input.trim() || agentLoading}
          style={{
            height: 28, padding: '0 12px', fontSize: 11,
            background: input.trim() ? 'var(--chrome-accent)' : 'var(--chrome-surface)',
            color: input.trim() ? '#fff' : 'var(--chrome-text-muted)',
            border: '1px solid var(--chrome-border)',
            borderRadius: 'var(--radius-md)', cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}

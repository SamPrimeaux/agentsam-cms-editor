import { useEffect } from 'react'
import { useEditorStore } from './store/editor'
import Topbar from './components/topbar/Topbar'
import PagesPanel from './components/panels/PagesPanel'
import SectionTree from './components/panels/SectionTree'
import FieldsPanel from './components/panels/FieldsPanel'
import Canvas from './components/canvas/Canvas'
import AgentBar from './components/agent/AgentBar'

export default function App() {
  const init = useEditorStore(s => s.init)
  const projectId = useEditorStore(s => s.projectId)

  useEffect(() => { init(projectId) }, [init, projectId])

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: 'var(--topbar-h) 1fr var(--agent-h)',
      gridTemplateColumns: 'var(--left-w) 1fr var(--right-w)',
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Topbar — spans full width */}
      <div style={{ gridColumn: '1 / -1', gridRow: '1' }}>
        <Topbar />
      </div>

      {/* Left panel — Pages + Section tree */}
      <div style={{
        gridColumn: '1',
        gridRow: '2',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--chrome-border)',
        overflow: 'hidden',
      }}>
        <PagesPanel />
        <SectionTree />
      </div>

      {/* Center — Canvas */}
      <div style={{ gridColumn: '2', gridRow: '2', overflow: 'hidden', position: 'relative' }}>
        <Canvas />
      </div>

      {/* Right — Fields panel */}
      <div style={{
        gridColumn: '3',
        gridRow: '2',
        borderLeft: '1px solid var(--chrome-border)',
        overflow: 'hidden',
      }}>
        <FieldsPanel />
      </div>

      {/* Agent Sam bar — spans full width */}
      <div style={{ gridColumn: '1 / -1', gridRow: '3', borderTop: '1px solid var(--chrome-border)' }}>
        <AgentBar />
      </div>
    </div>
  )
}

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEditorStore } from '../../store/editor'
import type { CmsSection } from '../../types/cms'

export default function SectionTree() {
  const { sections, selectedSectionId, loadingPage, activePage, selectSection, reorderSections, toggleSectionVisibility } = useEditorStore()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sections.findIndex(s => s.id === active.id)
    const newIndex = sections.findIndex(s => s.id === over.id)
    const reordered = arrayMove(sections, oldIndex, newIndex)
    reorderSections(reordered.map(s => s.id))
  }

  if (!activePage) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--chrome-text-muted)', fontSize: 12 }}>
      No page selected
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={sectionHeader}>
        <span>Structure</span>
        <span style={{ fontSize: 10, color: 'var(--chrome-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {sections.length} sections
        </span>
      </div>

      {loadingPage ? (
        <div style={{ padding: 12, color: 'var(--chrome-text-muted)', fontSize: 11 }}>Loading…</div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {sections.map(section => (
                <SortableSection
                  key={section.id}
                  section={section}
                  isSelected={section.id === selectedSectionId}
                  onSelect={() => selectSection(section.id === selectedSectionId ? null : section.id)}
                  onToggleVisibility={() => toggleSectionVisibility(section.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  )
}

function SortableSection({
  section, isSelected, onSelect, onToggleVisibility,
}: {
  section: CmsSection
  isSelected: boolean
  onSelect: () => void
  onToggleVisibility: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 8px 5px 12px',
    borderLeft: isSelected ? '2px solid var(--chrome-accent)' : '2px solid transparent',
    background: isSelected ? 'rgba(217,119,87,0.08)' : isDragging ? 'var(--chrome-border)' : 'transparent',
    cursor: 'pointer',
  }

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        style={{
          background: 'transparent', border: 'none',
          color: 'var(--chrome-text-muted)', cursor: 'grab',
          padding: '0 2px', fontSize: 10, lineHeight: 1,
          display: 'flex', alignItems: 'center',
        }}
        title="Drag to reorder"
      >
        ⠿
      </button>

      {/* Sort order chip */}
      <span style={{
        fontSize: 9, fontFamily: 'var(--font-mono)',
        color: 'var(--chrome-text-muted)', width: 20, textAlign: 'right', flexShrink: 0,
      }}>
        {section.sort_order}
      </span>

      {/* Section name */}
      <button
        onClick={onSelect}
        style={{
          flex: 1, textAlign: 'left', background: 'transparent', border: 'none',
          color: isSelected ? 'var(--chrome-text)' : 'var(--chrome-text-muted)',
          fontSize: 12, cursor: 'pointer', padding: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {section.section_name}
        <span style={{ fontSize: 9, marginLeft: 6, opacity: 0.5 }}>{section.section_type}</span>
      </button>

      {/* Visibility toggle */}
      <button
        onClick={e => { e.stopPropagation(); onToggleVisibility() }}
        title={section.is_visible ? 'Hide section' : 'Show section'}
        style={{
          background: 'transparent', border: 'none',
          color: section.is_visible ? 'var(--chrome-text-muted)' : '#D97757',
          fontSize: 11, cursor: 'pointer', padding: '0 2px',
          opacity: section.is_visible ? 0.4 : 1,
        }}
      >
        {section.is_visible ? '◉' : '◌'}
      </button>
    </div>
  )
}

const sectionHeader: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '8px 12px 6px',
  fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--chrome-text-muted)',
  borderBottom: '1px solid var(--chrome-border)',
}

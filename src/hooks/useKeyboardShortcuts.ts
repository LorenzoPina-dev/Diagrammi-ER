import { useEffect } from 'react'
import { useReactFlow } from 'reactflow'
import shallow from 'zustand/shallow'
import { useDiagramStore } from '../store/diagramStore'

const EDITABLE_TAGS = new Set(['input', 'textarea', 'select'])

export function useKeyboardShortcuts() {
  const { deleteElements } = useReactFlow()
  const { undo, selectedNodeId } = useDiagramStore(
    (state) => ({
      undo: state.undo,
      selectedNodeId: state.selectedNodeId,
    }),
    shallow,
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName.toLowerCase()
      if (tagName && EDITABLE_TAGS.has(tagName)) return

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeId) {
        deleteElements({ nodes: [{ id: selectedNodeId }] })
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteElements, selectedNodeId, undo])
}

// ============================================================
// HOOK — Scorciatoie da tastiera globali
// ============================================================
import { useEffect } from 'react'
import { useReactFlow } from 'reactflow'
import { useDiagramStore } from '../store/diagramStore'

export function useKeyboardShortcuts() {
  const { deleteElements } = useReactFlow()
  const { undo, selectedNodeId } = useDiagramStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase()
      // Non attivare shortcut se si sta digitando in un campo
      if (['input', 'textarea', 'select'].includes(tag)) return

      // Canc / Backspace — elimina nodo selezionato
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          deleteElements({ nodes: [{ id: selectedNodeId }] })
        }
      }

      // Ctrl+Z — undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [deleteElements, undo, selectedNodeId])
}
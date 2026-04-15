import { useEffect, useRef } from 'react'
import { Boxes, Diamond } from 'lucide-react'
import shallow from 'zustand/shallow'
import { useDiagramStore } from '../../store/diagramStore'

interface Props {
  x: number
  y: number
  flowPos: { x: number; y: number }
  onClose: () => void
}

export default function CanvasContextMenu({ x, y, flowPos, onClose }: Props) {
  const { addEntity, addRelation, selectNode } = useDiagramStore(
    (state) => ({
      addEntity: state.addEntity,
      addRelation: state.addRelation,
      selectNode: state.selectNode,
    }),
    shallow,
  )
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [onClose])

  const createEntity = () => {
    const id = addEntity(flowPos)
    selectNode(id)
    onClose()
  }

  const createRelation = () => {
    const id = addRelation(flowPos)
    selectNode(id)
    onClose()
  }

  return (
    <div
      ref={menuRef}
      style={{ top: y, left: x }}
      className="absolute z-50 min-w-48 rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-2xl"
    >
      <p className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-gray-500">Aggiungi</p>
      <button
        type="button"
        onClick={createEntity}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-200 transition-colors hover:bg-blue-900/40 hover:text-blue-300"
      >
        <Boxes size={14} className="text-blue-400" />
        Nuova Entita
      </button>
      <button
        type="button"
        onClick={createRelation}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-200 transition-colors hover:bg-purple-900/40 hover:text-purple-300"
      >
        <Diamond size={14} className="text-purple-400" />
        Nuova Relazione
      </button>
    </div>
  )
}

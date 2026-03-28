// ============================================================
// MENU CONTESTUALE — Tasto destro sulla canvas
// ============================================================
import { useEffect, useRef } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { Boxes, Diamond } from 'lucide-react'

interface Props {
  x: number
  y: number
  flowPos: { x: number; y: number }
  onClose: () => void
}

export default function CanvasContextMenu({ x, y, flowPos, onClose }: Props) {
  const { addEntity, addRelation, selectNode } = useDiagramStore()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleAddEntity = () => {
    const id = addEntity(flowPos)
    selectNode(id)
    onClose()
  }

  const handleAddRelation = () => {
    const id = addRelation(flowPos)
    selectNode(id)
    onClose()
  }

  return (
    <div
      ref={ref}
      style={{ top: y, left: x }}
      className="absolute z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-1 min-w-48"
    >
      <p className="px-3 py-1 text-xs text-gray-500 font-medium uppercase tracking-wider">Aggiungi</p>
      <button
        onClick={handleAddEntity}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-900/40 hover:text-blue-300 transition-colors"
      >
        <Boxes size={14} className="text-blue-400" />
        Nuova Entità
      </button>
      <button
        onClick={handleAddRelation}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-purple-900/40 hover:text-purple-300 transition-colors"
      >
        <Diamond size={14} className="text-purple-400" />
        Nuova Relazione
      </button>
    </div>
  )
}
import { Boxes, Diamond, MousePointer2 } from 'lucide-react'
import shallow from 'zustand/shallow'
import { ER_NODE_DRAG_MIME, randomNodePosition } from '../../lib/er'
import { useDiagramStore } from '../../store/diagramStore'

type DiagramNodeType = 'entity' | 'relation'

const SHORTCUTS = [
  ['Canc', 'Elimina selezione'],
  ['Ctrl+Z', 'Annulla'],
  ['Ctrl+Shift+E', 'Esporta PNG'],
  ['Tasto destro', 'Menu contestuale'],
] as const

export default function EmptyPanel() {
  const { addEntity, addRelation, selectNode } = useDiagramStore(
    (state) => ({
      addEntity: state.addEntity,
      addRelation: state.addRelation,
      selectNode: state.selectNode,
    }),
    shallow,
  )

  const handleAdd = (type: DiagramNodeType) => {
    const position = randomNodePosition()
    const id = type === 'entity' ? addEntity(position) : addRelation(position)
    selectNode(id)
  }

  const handleDragStart = (event: React.DragEvent, type: DiagramNodeType) => {
    event.dataTransfer.setData(ER_NODE_DRAG_MIME, type)
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="py-8 text-center">
        <MousePointer2 className="mx-auto mb-3 text-gray-600" size={32} />
        <p className="text-sm text-gray-400">
          Seleziona un elemento
          <br />
          o aggiungi qualcosa
        </p>
      </div>

      <div className="space-y-2">
        <p className="px-1 text-xs font-medium uppercase tracking-wider text-gray-500">Aggiungi elemento</p>
        <button
          type="button"
          onClick={() => handleAdd('entity')}
          draggable
          onDragStart={(event) => handleDragStart(event, 'entity')}
          className="flex w-full items-center gap-3 rounded-lg border border-blue-900/50 bg-blue-950/30 p-3 text-sm font-medium text-blue-300 transition-colors hover:bg-blue-900/40"
        >
          <Boxes size={16} />
          Entita
          <span className="ml-auto text-xs text-gray-500">trascina</span>
        </button>
        <button
          type="button"
          onClick={() => handleAdd('relation')}
          draggable
          onDragStart={(event) => handleDragStart(event, 'relation')}
          className="flex w-full items-center gap-3 rounded-lg border border-purple-900/50 bg-purple-950/30 p-3 text-sm font-medium text-purple-300 transition-colors hover:bg-purple-900/40"
        >
          <Diamond size={16} />
          Relazione
          <span className="ml-auto text-xs text-gray-500">trascina</span>
        </button>
      </div>

      <div className="mt-auto">
        <p className="mb-2 px-1 text-xs uppercase tracking-wider text-gray-600">Scorciatoie</p>
        <div className="space-y-1 text-xs text-gray-500">
          {SHORTCUTS.map(([shortcut, description]) => (
            <div key={shortcut} className="flex justify-between rounded bg-gray-900 px-2 py-1">
              <kbd className="font-mono text-gray-400">{shortcut}</kbd>
              <span>{description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

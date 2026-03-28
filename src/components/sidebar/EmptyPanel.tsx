import { Boxes, Diamond, MousePointer2 } from 'lucide-react'
import { useDiagramStore } from '../../store/diagramStore'

export default function EmptyPanel() {
  const { addEntity, addRelation, selectNode } = useDiagramStore()

  const handleAdd = (type: 'entity' | 'relation') => {
    const pos = { x: 200 + Math.random() * 200, y: 150 + Math.random() * 200 }
    const id = type === 'entity' ? addEntity(pos) : addRelation(pos)
    selectNode(id)
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="text-center py-8">
        <MousePointer2 className="mx-auto mb-3 text-gray-600" size={32} />
        <p className="text-gray-400 text-sm">Seleziona un elemento<br />o aggiungi qualcosa</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium px-1">Aggiungi elemento</p>
        <button
          onClick={() => handleAdd('entity')}
          draggable
          onDragStart={(e) => e.dataTransfer.setData('application/er-node-type', 'entity')}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-blue-900/50 bg-blue-950/30 text-blue-300 hover:bg-blue-900/40 transition-colors text-sm font-medium"
        >
          <Boxes size={16} />
          Entità
          <span className="ml-auto text-xs text-gray-500">trascina</span>
        </button>
        <button
          onClick={() => handleAdd('relation')}
          draggable
          onDragStart={(e) => e.dataTransfer.setData('application/er-node-type', 'relation')}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-purple-900/50 bg-purple-950/30 text-purple-300 hover:bg-purple-900/40 transition-colors text-sm font-medium"
        >
          <Diamond size={16} />
          Relazione
          <span className="ml-auto text-xs text-gray-500">trascina</span>
        </button>
      </div>

      <div className="mt-auto">
        <p className="text-xs text-gray-600 uppercase tracking-wider mb-2 px-1">Scorciatoie</p>
        <div className="space-y-1 text-xs text-gray-500">
          {[
            ['Canc', 'Elimina selezione'],
            ['Ctrl+Z', 'Annulla'],
            ['Ctrl+Shift+E', 'Esporta PNG'],
            ['Tasto destro', 'Menu contestuale'],
          ].map(([key, desc]) => (
            <div key={key} className="flex justify-between px-2 py-1 rounded bg-gray-900">
              <kbd className="text-gray-400 font-mono">{key}</kbd>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
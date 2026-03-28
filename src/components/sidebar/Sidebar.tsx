// ============================================================
// SIDEBAR — Pannello proprietà dinamico
// Mostra il form corretto in base al nodo selezionato
// ============================================================
import { useDiagramStore } from '../../store/diagramStore'
import EntityPanel   from './EntityPanel'
import RelationPanel from './RelationPanel'
import EmptyPanel    from './EmptyPanel'

export default function Sidebar() {
  const { nodes, selectedNodeId } = useDiagramStore()

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null

  return (
    <aside className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto flex flex-col">
      {selectedNode?.type === 'entity'   && <EntityPanel   node={selectedNode} />}
      {selectedNode?.type === 'relation' && <RelationPanel node={selectedNode} />}
      {!selectedNode && <EmptyPanel />}
    </aside>
  )
}
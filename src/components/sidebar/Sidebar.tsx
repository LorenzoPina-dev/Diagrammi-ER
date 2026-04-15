import shallow from 'zustand/shallow'
import { useDiagramStore } from '../../store/diagramStore'
import EmptyPanel from './EmptyPanel'
import EntityPanel from './EntityPanel'
import RelationPanel from './RelationPanel'

export default function Sidebar() {
  const { nodes, selectedNodeId } = useDiagramStore(
    (state) => ({
      nodes: state.nodes,
      selectedNodeId: state.selectedNodeId,
    }),
    shallow,
  )

  const selectedNode = selectedNodeId
    ? nodes.find((node) => node.id === selectedNodeId) ?? null
    : null

  return (
    <aside className="flex w-72 flex-shrink-0 flex-col overflow-y-auto border-l border-gray-800 bg-gray-950">
      {selectedNode?.type === 'entity' && <EntityPanel node={selectedNode} />}
      {selectedNode?.type === 'relation' && <RelationPanel node={selectedNode} />}
      {!selectedNode && <EmptyPanel />}
    </aside>
  )
}

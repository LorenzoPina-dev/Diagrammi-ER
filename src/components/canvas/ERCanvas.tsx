// ============================================================
// CANVAS PRINCIPALE — React Flow con nodi e archi custom ER
// ============================================================
import { useCallback, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type ReactFlowInstance,
  type OnSelectionChangeParams,
  type Connection,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { useDiagramStore } from '../../store/diagramStore'
import { nodeTypes }       from '../../nodes'
import { edgeTypes }       from '../../edges'
import CanvasContextMenu       from './CanvasContextMenu'
import GeneralizationLayer     from './GeneralizationLayer'

export default function ERCanvas() {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    setViewport, addEntity, addRelation, selectNode,
  } = useDiagramStore()

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    flowPos: { x: number; y: number }
  } | null>(null)

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null)

  // ── Pane click ────────────────────────────────────────────
  const handlePaneClick = useCallback(() => {
    setContextMenu(null)
    selectNode(null)
  }, [selectNode])

  // ── Tasto destro sul canvas ───────────────────────────────
  const handlePaneContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (!rfInstanceRef.current) return
      const flowPos = rfInstanceRef.current.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      })
      setContextMenu({ x: e.clientX, y: e.clientY, flowPos })
    },
    [],
  )

  // ── Cambio selezione ──────────────────────────────────────
  const handleSelectionChange = useCallback(
    ({ nodes: sel }: OnSelectionChangeParams) => {
      selectNode(sel.length === 1 ? sel[0].id : null)
    },
    [selectNode],
  )

  // ── Init istanza RF ───────────────────────────────────────
  const handleInit = useCallback((instance: ReactFlowInstance) => {
    rfInstanceRef.current = instance
  }, [])

  // ── Validazione connessione ───────────────────────────────
  const isValidConnection = useCallback(
    (connection: Connection) => {
      const src = nodes.find((n) => n.id === connection.source)
      const tgt = nodes.find((n) => n.id === connection.target)
      if (!src || !tgt) return false

      // Gli attributi non partecipano a connessioni manuali dal canvas
      if (src.type === 'attribute' || tgt.type === 'attribute') return false

      // Blocca entità → entità diretta (deve passare per una relazione)
      if (src.type === 'entity' && tgt.type === 'entity') return false

      // Self-loop puro (relazione → stessa relazione) non ha senso
      if (src.id === tgt.id && src.type === 'relation') return false

      // Tutto il resto è permesso, incluso entità → stessa relazione (self-relation)
      return true
    },
    [nodes],
  )

  // ── Drag & Drop dalla sidebar ─────────────────────────────
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!rfInstanceRef.current) return
      const type = e.dataTransfer.getData('application/er-node-type')
      if (!type) return
      const pos = rfInstanceRef.current.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      })
      if (type === 'entity')   addEntity(pos)
      if (type === 'relation') addRelation(pos)
    },
    [addEntity, addRelation],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  return (
    <div className="flex-1 relative" onDrop={handleDrop} onDragOver={handleDragOver}>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onInit={handleInit}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={handlePaneContextMenu}
        onSelectionChange={handleSelectionChange}
        onMoveEnd={(_, vp) => setViewport(vp)}
        defaultEdgeOptions={{
          type: 'association',
          data: { cardinality: '(1,1)' },
        }}
        nodeOrigin={[0, 0]}
        connectionLineStyle={{ stroke: '#a855f7', strokeWidth: 1.5, strokeDasharray: '5 3' }}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#1e293b"
          gap={20}
          size={1}
        />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) =>
            n.type === 'entity'   ? '#3b82f6' :
            n.type === 'relation' ? '#a855f7' : '#22c55e'
          }
          maskColor="#0f172a99"
          pannable
        />
      </ReactFlow>

      {/* ── Layer generalizzazioni (struttura a T) ── */}
      <GeneralizationLayer />

      {/* ── Menu contestuale ── */}
      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          flowPos={contextMenu.flowPos}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

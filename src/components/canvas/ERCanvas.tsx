import { useCallback, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Connection,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import shallow from 'zustand/shallow'
import { ER_NODE_DRAG_MIME, isValidDiagramConnection, type CreatableDiagramNodeType } from '../../lib/er'
import { edgeTypes } from '../../edges'
import { nodeTypes } from '../../nodes'
import { useDiagramStore } from '../../store/diagramStore'
import CanvasContextMenu from './CanvasContextMenu'
import GeneralizationLayer from './GeneralizationLayer'

interface ContextMenuState {
  x: number
  y: number
  flowPos: { x: number; y: number }
}

const DEFAULT_EDGE_OPTIONS = {
  type: 'association',
  data: { cardinality: '(1,1)' },
} as const

const CONNECTION_LINE_STYLE = {
  stroke: '#a855f7',
  strokeWidth: 1.5,
  strokeDasharray: '5 3',
} as const

const minimapNodeColor = (node: { type?: string }) => {
  switch (node.type) {
    case 'entity':
      return '#3b82f6'
    case 'relation':
      return '#a855f7'
    default:
      return '#22c55e'
  }
}

export default function ERCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setViewport,
    addEntity,
    addRelation,
    selectNode,
  } = useDiagramStore(
    (state) => ({
      nodes: state.nodes,
      edges: state.edges,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
      onConnect: state.onConnect,
      setViewport: state.setViewport,
      addEntity: state.addEntity,
      addRelation: state.addRelation,
      selectNode: state.selectNode,
    }),
    shallow,
  )

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const reactFlowRef = useRef<ReactFlowInstance | null>(null)

  const handlePaneClick = useCallback(() => {
    setContextMenu(null)
    selectNode(null)
  }, [selectNode])

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    if (!reactFlowRef.current) return

    const flowPos = reactFlowRef.current.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    setContextMenu({ x: event.clientX, y: event.clientY, flowPos })
  }, [])

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      selectNode(selectedNodes.length === 1 ? selectedNodes[0].id : null)
    },
    [selectNode],
  )

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowRef.current = instance
  }, [])

  const isValidConnection = useCallback(
    (connection: Connection) => isValidDiagramConnection(connection, nodes),
    [nodes],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      if (!reactFlowRef.current) return

      const nodeType = event.dataTransfer.getData(ER_NODE_DRAG_MIME) as CreatableDiagramNodeType
      if (!nodeType) return

      const position = reactFlowRef.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      if (nodeType === 'entity') addEntity(position)
      if (nodeType === 'relation') addRelation(position)
    },
    [addEntity, addRelation],
  )

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  return (
    <div
      className="relative flex-1 overflow-hidden"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
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
        onMoveEnd={(_, viewport) => setViewport(viewport)}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        nodeOrigin={[0, 0]}
        connectionLineStyle={CONNECTION_LINE_STYLE}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#1e293b" gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap nodeColor={minimapNodeColor} maskColor="#0f172a99" pannable />
      </ReactFlow>

      <GeneralizationLayer />

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

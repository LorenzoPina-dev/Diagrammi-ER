import { useCallback, useRef } from 'react'
import {
  EdgeLabelRenderer,
  useStore,
  type EdgeProps,
  type ReactFlowState,
} from 'reactflow'
import {
  EdgePath,
  buildFullPath,
  pathMidpoint,
  resolveEdgeAnchors,
  useDragDelta,
  type NodeGeometry,
  type PathStyle,
  type Point,
} from '../lib/path'
import { useDiagramStore } from '../store/diagramStore'

export interface FloatingEdgeProps extends EdgeProps {
  strokeColor?: string
  strokeWidth?: number
  strokeDasharray?: string
  markerEnd?: string
  interactive?: boolean
  labelContent?: React.ReactNode
  labelDraggable?: boolean
}

const selectNodeInternals = (state: ReactFlowState) => state.nodeInternals

export function FloatingEdge({
  id,
  source,
  target,
  data,
  strokeColor = '#475569',
  strokeWidth = 1.5,
  strokeDasharray,
  markerEnd,
  selected,
  interactive = true,
  labelContent,
  labelDraggable,
}: FloatingEdgeProps) {
  const nodeInternals = useStore(selectNodeInternals)
  const zoom = useStore((state) => state.transform[2])
  const setEdgeData = useDiagramStore((state) => state.setEdgeData)

  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  const sourceNode = nodeInternals.get(source)
  const targetNode = nodeInternals.get(target)
  if (!sourceNode || !targetNode) return null

  const sourceGeometry: NodeGeometry = {
    type: sourceNode.type,
    position: sourceNode.position,
    width: sourceNode.width,
    height: sourceNode.height,
    attrKind: sourceNode.type === 'attribute' ? (sourceNode.data as { kind?: string }).kind : undefined,
  }

  const targetGeometry: NodeGeometry = {
    type: targetNode.type,
    position: targetNode.position,
    width: targetNode.width,
    height: targetNode.height,
    attrKind: targetNode.type === 'attribute' ? (targetNode.data as { kind?: string }).kind : undefined,
  }

  const waypoints = (data?.waypoints ?? []) as Point[]
  const { srcPt, tgtPt } = resolveEdgeAnchors(sourceGeometry, targetGeometry, waypoints)
  const allPoints = buildFullPath(srcPt, waypoints, tgtPt)
  const midpoint = pathMidpoint(allPoints)

  const handleWaypointsChange = useCallback(
    (nextWaypoints: Point[]) => setEdgeData(id, { waypoints: nextWaypoints }),
    [id, setEdgeData],
  )

  const isDraggable = labelDraggable ?? interactive
  const labelOffset = (data?.labelOffset as Point | undefined) ?? { x: 0, y: 0 }
  const labelOffsetRef = useRef(labelOffset)

  const handleLabelDelta = useCallback(
    (dx: number, dy: number) => {
      setEdgeData(id, {
        labelOffset: {
          x: labelOffsetRef.current.x + dx,
          y: labelOffsetRef.current.y + dy,
        },
      })
    },
    [id, setEdgeData],
  )

  const baseHandleLabelDown = useDragDelta(zoomRef, handleLabelDelta)
  const handleLabelDown = useCallback(
    (event: React.MouseEvent) => {
      labelOffsetRef.current = (data?.labelOffset as Point | undefined) ?? { x: 0, y: 0 }
      baseHandleLabelDown(event)
    },
    [baseHandleLabelDown, data?.labelOffset],
  )

  const labelPosition: Point = isDraggable
    ? { x: midpoint.x + labelOffset.x, y: midpoint.y + labelOffset.y }
    : {
        x: tgtPt.x + (midpoint.x - tgtPt.x) * 0.35,
        y: tgtPt.y + (midpoint.y - tgtPt.y) * 0.35 - 8,
      }

  const pathStyle: PathStyle = {
    stroke: selected ? '#93c5fd' : strokeColor,
    strokeWidth,
    strokeDash: strokeDasharray,
    markerEnd,
  }

  return (
    <>
      <EdgePath
        allPoints={allPoints}
        waypoints={waypoints}
        startPoint={srcPt}
        endPoint={tgtPt}
        style={pathStyle}
        interactive={interactive}
        zoomRef={zoomRef}
        onWaypointsChange={handleWaypointsChange}
      />

      {labelContent && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%,-50%) translate(${labelPosition.x}px,${labelPosition.y}px)`,
              pointerEvents: isDraggable ? 'all' : 'none',
              cursor: isDraggable ? 'move' : 'default',
              userSelect: 'none',
            }}
            className={isDraggable ? 'nodrag nopan' : ''}
            onMouseDown={isDraggable ? handleLabelDown : undefined}
          >
            {labelContent}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

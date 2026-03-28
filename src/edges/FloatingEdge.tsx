// ============================================================
// FLOATING EDGE — Arco ReactFlow con waypoints draggabili
// ============================================================
import { useCallback, useRef } from 'react'
import {
  EdgeLabelRenderer,
  useStore,
  type ReactFlowState,
  type EdgeProps,
} from 'reactflow'
import {
  EdgePath,
  resolveEdgeAnchors,
  buildFullPath,
  pathMidpoint,
  useDragDelta,
  type PathStyle,
  type NodeGeometry,
} from '../lib/path'
import { useDiagramStore } from '../store/diagramStore'
import type { Point } from '../lib/path'

export interface FloatingEdgeProps extends EdgeProps {
  strokeColor?:     string
  strokeWidth?:     number
  strokeDasharray?: string
  markerEnd?:       string
  interactive?:     boolean
  labelContent?:    React.ReactNode
  /**
   * Se true la label è draggabile (associazioni).
   * Se false viene mostrata fissa vicino al terminale target (attribute-link).
   * Default: uguale a `interactive`.
   */
  labelDraggable?:  boolean
}

const nodeSelector = (s: ReactFlowState) => s.nodeInternals

export function FloatingEdge({
  id,
  source,
  target,
  data,
  strokeColor    = '#475569',
  strokeWidth    = 1.5,
  strokeDasharray,
  markerEnd,
  selected,
  interactive    = true,
  labelContent,
  labelDraggable,
}: FloatingEdgeProps) {
  const nodeInternals = useStore(nodeSelector)
  const zoom          = useStore((s) => s.transform[2])
  const setEdgeData   = useDiagramStore((s) => s.setEdgeData)

  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  const srcNode = nodeInternals.get(source)
  const tgtNode = nodeInternals.get(target)
  if (!srcNode || !tgtNode) return null

  // Passa attrKind per il calcolo corretto del bordo su nodi attributo
  const srcGeo: NodeGeometry = {
    type:     srcNode.type,
    position: srcNode.position,
    width:    srcNode.width,
    height:   srcNode.height,
    attrKind: srcNode.type === 'attribute' ? (srcNode.data as { kind?: string }).kind : undefined,
  }
  const tgtGeo: NodeGeometry = {
    type:     tgtNode.type,
    position: tgtNode.position,
    width:    tgtNode.width,
    height:   tgtNode.height,
    attrKind: tgtNode.type === 'attribute' ? (tgtNode.data as { kind?: string }).kind : undefined,
  }

  const waypoints: Point[] = (data?.waypoints ?? []) as Point[]
  const { srcPt, tgtPt }   = resolveEdgeAnchors(srcGeo, tgtGeo, waypoints)
  const allPts              = buildFullPath(srcPt, waypoints, tgtPt)
  const mid                 = pathMidpoint(allPts)

  // ── Waypoints ─────────────────────────────────────────────
  const handleWaypointsChange = useCallback(
    (newWps: Point[]) => setEdgeData(id, { ...data, waypoints: newWps }),
    [id, data, setEdgeData],
  )

  // ── Label drag ────────────────────────────────────────────
  const isDraggable    = labelDraggable ?? interactive
  const labelOffset: Point = (data?.labelOffset as Point | undefined) ?? { x: 0, y: 0 }
  const lblSnapRef   = useRef(labelOffset)

  const onLabelDelta = useCallback(
    (dx: number, dy: number) => {
      setEdgeData(id, {
        ...data,
        labelOffset: { x: lblSnapRef.current.x + dx, y: lblSnapRef.current.y + dy },
      })
    },
    [id, data, setEdgeData],
  )
  const baseLabelDown = useDragDelta(zoomRef, onLabelDelta)
  const onLabelDown   = useCallback(
    (e: React.MouseEvent) => {
      lblSnapRef.current = (data?.labelOffset as Point | undefined) ?? { x: 0, y: 0 }
      baseLabelDown(e)
    },
    [data?.labelOffset, baseLabelDown],
  )

  // Posizione label:
  // - draggabile → midpoint + offset salvato
  // - fissa      → 35% dalla fine del percorso (vicino al terminale attributo)
  const labelPos: Point = isDraggable
    ? { x: mid.x + labelOffset.x, y: mid.y + labelOffset.y }
    : {
        x: tgtPt.x + (mid.x - tgtPt.x) * 0.35,
        y: tgtPt.y + (mid.y - tgtPt.y) * 0.35 - 8,
      }

  const edgeStyle: PathStyle = {
    stroke:     selected ? '#93c5fd' : strokeColor,
    strokeWidth,
    strokeDash: strokeDasharray,
    markerEnd,
  }

  return (
    <>
      <EdgePath
        allPoints={allPts}
        waypoints={waypoints}
        startPoint={srcPt}
        endPoint={tgtPt}
        style={edgeStyle}
        interactive={interactive}
        zoomRef={zoomRef}
        onWaypointsChange={handleWaypointsChange}
      />

      {labelContent && (
        <EdgeLabelRenderer>
          <div
            style={{
              position:      'absolute',
              transform:     `translate(-50%,-50%) translate(${labelPos.x}px,${labelPos.y}px)`,
              pointerEvents: isDraggable ? 'all' : 'none',
              cursor:        isDraggable ? 'move' : 'default',
              userSelect:    'none',
            }}
            className={isDraggable ? 'nodrag nopan' : ''}
            onMouseDown={isDraggable ? onLabelDown : undefined}
          >
            {labelContent}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

// ============================================================
// EDGE — Generalizzazione stile UML
//
// - Freccia a triangolo cavo verso il padre
// - coverage: 'complete' (linea doppia) | 'partial' (singola)
// - disjoint: 'exclusive' {d} | 'overlapping' {o}
// - Label {d}/{o} draggabile
// - Waypoints always-visible + punto di uscita smart
// ============================================================
import { memo, useCallback, useRef } from 'react'
import { EdgeLabelRenderer, useStore, type EdgeProps, type ReactFlowState } from 'reactflow'
import {
  intersectLineRect,
  intersectLineCircle,
  intersectLineDiamond,
  type Point,
} from './geometry'
import type { GeneralizationEdgeData } from '../types/er.types'
import { useDiagramStore } from '../store/diagramStore'
import { pathMidpoint } from './FloatingEdge'

const nodeSelector = (state: ReactFlowState) => state.nodeInternals

const ENTITY_W = 140, ENTITY_H = 38
const ATTR_R   = 20
const WP_HIT_RADIUS = 10
const WP_VIS_RADIUS = 5

function getBorderPt(
  type: string | undefined,
  pos: { x: number; y: number },
  w: number,
  h: number,
  from: Point,
): Point {
  const rect = { x: pos.x, y: pos.y, width: w, height: h }
  if (type === 'attribute') return intersectLineCircle(from, { x: pos.x + ATTR_R, y: pos.y + ATTR_R }, ATTR_R)
  if (type === 'relation')  return intersectLineDiamond(from, rect)
  return intersectLineRect(from, rect)
}

function buildPath(pts: Point[]): string {
  if (pts.length < 2) return ''
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

const GeneralizationEdge = memo((props: EdgeProps<GeneralizationEdgeData>) => {
  const { id, source, target, data, selected } = props

  const nodeInternals = useStore(nodeSelector)
  const setEdgeData   = useDiagramStore((s) => s.setEdgeData)
  const zoom          = useStore((s) => s.transform[2])

  const coverage = data?.coverage ?? 'partial'
  const disjoint = data?.disjoint ?? 'exclusive'

  const srcNode = nodeInternals.get(source)
  const tgtNode = nodeInternals.get(target)
  if (!srcNode || !tgtNode) return null

  const sw = srcNode.width  ?? ENTITY_W
  const sh = srcNode.height ?? ENTITY_H
  const tw = tgtNode.width  ?? ENTITY_W
  const th = tgtNode.height ?? ENTITY_H

  const srcCenter = { x: srcNode.position.x + sw / 2, y: srcNode.position.y + sh / 2 }
  const tgtCenter = { x: tgtNode.position.x + tw / 2, y: tgtNode.position.y + th / 2 }

  const waypoints: Point[] = (data?.waypoints ?? []) as Point[]

  // Punto di uscita smart: verso il primo/ultimo waypoint se presenti
  const srcAim = waypoints.length > 0 ? waypoints[0]                    : tgtCenter
  const tgtAim = waypoints.length > 0 ? waypoints[waypoints.length - 1] : srcCenter

  const srcPt = getBorderPt(srcNode.type, srcNode.position, sw, sh, srcAim)
  const tgtPt = getBorderPt(tgtNode.type, tgtNode.position, tw, th, tgtAim)

  const allPts: Point[] = [srcPt, ...waypoints, tgtPt]
  const pathD = buildPath(allPts)
  const mid   = pathMidpoint(allPts)

  const strokeColor = selected ? '#93c5fd' : '#d97706'
  const strokeWidth = coverage === 'complete' ? 2.5 : 1.5

  // ── Snapshot refs per drag ────────────────────────────
  const wpSnapRef  = useRef<Point[] | null>(null)
  const lblSnapRef = useRef<Point | null>(null)

  // ── Drag waypoint ─────────────────────────────────────
  const makeWpMouseDown = useCallback((idx: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    wpSnapRef.current = waypoints.map((w) => ({ ...w }))

    const onMove = (me: MouseEvent) => {
      if (!wpSnapRef.current) return
      const dx = (me.clientX - e.clientX) / zoom
      const dy = (me.clientY - e.clientY) / zoom
      const newWps = wpSnapRef.current.map((w, i) =>
        i === idx ? { x: w.x + dx, y: w.y + dy } : { ...w },
      )
      setEdgeData(id, { ...data, waypoints: newWps })
    }
    const onUp = () => {
      wpSnapRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [id, waypoints, data, setEdgeData, zoom])

  // ── Doppio click sul path → aggiunge waypoint ─────────
  const onPathDblClick = useCallback((e: React.MouseEvent<SVGPathElement>) => {
    e.stopPropagation()
    const svg = (e.target as SVGPathElement).ownerSVGElement
    if (!svg) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const local = pt.matrixTransform(svg.getScreenCTM()!.inverse())

    let bestIdx = waypoints.length, bestDist = Infinity
    const pts = [srcPt, ...waypoints, tgtPt]
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i].x, ay = pts[i].y, bx = pts[i+1].x, by = pts[i+1].y
      const abx = bx-ax, aby = by-ay, len2 = abx*abx+aby*aby
      let t = len2 > 0 ? ((local.x-ax)*abx+(local.y-ay)*aby)/len2 : 0
      t = Math.max(0, Math.min(1, t))
      const d = Math.hypot(local.x-(ax+t*abx), local.y-(ay+t*aby))
      if (d < bestDist) { bestDist = d; bestIdx = i }
    }
    const newWps = [...waypoints]
    newWps.splice(bestIdx, 0, { x: local.x, y: local.y })
    setEdgeData(id, { ...data, waypoints: newWps })
  }, [id, srcPt, tgtPt, waypoints, data, setEdgeData])

  // ── Drag label ────────────────────────────────────────
  const labelOffset: Point = (data?.labelOffset as Point | undefined) ?? { x: 0, y: 0 }
  const labelX = mid.x + labelOffset.x
  const labelY = mid.y + labelOffset.y

  const onLabelMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const snap = { ...(data?.labelOffset as Point | undefined ?? { x: 0, y: 0 }) }
    lblSnapRef.current = snap

    const onMove = (me: MouseEvent) => {
      if (!lblSnapRef.current) return
      const dx = (me.clientX - e.clientX) / zoom
      const dy = (me.clientY - e.clientY) / zoom
      setEdgeData(id, { ...data, labelOffset: { x: snap.x + dx, y: snap.y + dy } })
    }
    const onUp = () => {
      lblSnapRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [id, data, setEdgeData, zoom])

  const disjointLabel = `{${disjoint === 'exclusive' ? 'd' : 'o'}}`

  return (
    <>
      <defs>
        <marker
          id={`gen-arrow-${id}`}
          markerWidth="14"
          markerHeight="14"
          refX="12"
          refY="7"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <polygon
            points="1,1 13,7 1,13"
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
          />
        </marker>
      </defs>

      <g>
        {/* Linea principale */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          markerEnd={`url(#gen-arrow-${id})`}
          style={{ transition: 'stroke 0.2s' }}
        />

        {/* Linea parallela per "completa" */}
        {coverage === 'complete' && (
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth={1}
            transform="translate(3,3)"
            markerEnd={`url(#gen-arrow-${id})`}
            style={{ opacity: 0.6, pointerEvents: 'none' }}
          />
        )}

        {/* Area hit per doppio click → aggiungi waypoint */}
        <path
          d={pathD}
          fill="none"
          stroke="transparent"
          strokeWidth={16}
          style={{ cursor: 'cell' }}
          onDoubleClick={onPathDblClick}
        />

        {/* Waypoints — sempre visibili */}
        {waypoints.map((wp, i) => (
          <g key={i}>
            <circle
              cx={wp.x} cy={wp.y} r={WP_HIT_RADIUS}
              fill="transparent" stroke="transparent"
              style={{ cursor: 'grab' }}
              className="nodrag"
              onMouseDown={makeWpMouseDown(i)}
              onDoubleClick={(e) => {
                e.stopPropagation()
                setEdgeData(id, { ...data, waypoints: waypoints.filter((_, j) => j !== i) })
              }}
            />
            <circle
              cx={wp.x} cy={wp.y} r={WP_VIS_RADIUS}
              fill={selected ? '#93c5fd' : '#92400e'}
              stroke="#0f172a" strokeWidth={1.5}
              style={{ pointerEvents: 'none' }}
            />
          </g>
        ))}
      </g>

      {/* Label {d}/{o} draggabile */}
      <EdgeLabelRenderer>
        <div
          style={{
            position:   'absolute',
            transform:  `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize:   11,
            fontStyle:  'italic',
            color:      '#fbbf24',
            background: '#0f172a',
            padding:    '1px 5px',
            borderRadius: 4,
            border:     `1px solid ${selected ? '#93c5fd' : '#d97706'}`,
            pointerEvents: 'all',
            cursor:     'move',
            userSelect: 'none',
          }}
          className="nodrag nopan"
          onMouseDown={onLabelMouseDown}
        >
          {disjointLabel}
        </div>
      </EdgeLabelRenderer>
    </>
  )
})

GeneralizationEdge.displayName = 'GeneralizationEdge'
export default GeneralizationEdge

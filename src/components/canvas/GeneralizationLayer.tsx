// ============================================================
// GENERALIZATION LAYER
// ============================================================
import { useCallback, useRef, useMemo } from 'react'
import { useStore, type ReactFlowState } from 'reactflow'
import { useDiagramStore } from '../../store/diagramStore'
import { intersectLineRect } from '../../edges/geometry'
import type { Point } from '../../edges/geometry'
import type { GeneralizationCoverage, GeneralizationDisjoint } from '../../types/er.types'

// ─── Costanti ────────────────────────────────────────────────
const ENTITY_W     = 140
const ENTITY_H     = 38
const ARROW_HALF_W = 10
const ARROW_HEIGHT = 16
const WP_HIT_R     = 10
const WP_VIS_R     = 5
const STROKE       = '#d97706'

// ─── Helpers ─────────────────────────────────────────────────
function nodeCenter(pos: { x: number; y: number }, w: number, h: number): Point {
  return { x: pos.x + w / 2, y: pos.y + h / 2 }
}

function borderPoint(pos: { x: number; y: number }, w: number, h: number, toward: Point): Point {
  return intersectLineRect(toward, { x: pos.x, y: pos.y, width: w, height: h })
}

function buildPathD(pts: Point[]): string {
  if (pts.length < 2) return ''
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

function insertWaypoint(existing: Point[], newPt: Point, fixedA: Point, fixedB: Point): Point[] {
  const pts = [fixedA, ...existing, fixedB]
  let bestIdx = existing.length
  let bestDist = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i].x, ay = pts[i].y
    const bx = pts[i + 1].x, by = pts[i + 1].y
    const abx = bx - ax, aby = by - ay
    const len2 = abx * abx + aby * aby
    let t = len2 > 0 ? ((newPt.x - ax) * abx + (newPt.y - ay) * aby) / len2 : 0
    t = Math.max(0, Math.min(1, t))
    const d = Math.hypot(newPt.x - (ax + t * abx), newPt.y - (ay + t * aby))
    if (d < bestDist) { bestDist = d; bestIdx = i }
  }
  const result = [...existing]
  result.splice(bestIdx, 0, newPt)
  return result
}

// ─── Dati per gruppo ─────────────────────────────────────────
interface GenGroup {
  parentId: string
  childIds: string[]
  coverage: GeneralizationCoverage
  disjoint: GeneralizationDisjoint
  childEdgeIds: Record<string, string>
  childWaypoints: Record<string, Point[]>
}

// ─── Segment interattivo ─────────────────────────────────────
interface SegmentProps {
  pts: Point[]
  edgeId: string
  zoom: number
  /** ref al transform [vx, vy, zoom] — usato in dblclick per convertire coords */
  transformRef: React.MutableRefObject<[number, number, number]>
  coverage?: GeneralizationCoverage
  onWaypointsChange: (edgeId: string, wps: Point[]) => void
  fixedStart: Point
  fixedEnd: Point
  children?: React.ReactNode
}

function InteractiveSegment({
  pts,
  edgeId,
  zoom,
  transformRef,
  coverage,
  onWaypointsChange,
  fixedStart,
  fixedEnd,
  children,
}: SegmentProps) {
  const wpSnapRef = useRef<Point[] | null>(null)
  const waypoints = pts.slice(1, pts.length - 1)
  const pathD = buildPathD(pts)

  // ── Drag waypoint ─────────────────────────────────────────
  const makeWpMouseDown = useCallback(
    (idx: number) => (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      wpSnapRef.current = waypoints.map((w) => ({ ...w }))
      const startX = e.clientX
      const startY = e.clientY

      const onMove = (me: MouseEvent) => {
        if (!wpSnapRef.current) return
        const z = transformRef.current[2]
        const dx = (me.clientX - startX) / z
        const dy = (me.clientY - startY) / z
        const newWps = wpSnapRef.current.map((w, i) =>
          i === idx ? { x: w.x + dx, y: w.y + dy } : { ...w },
        )
        onWaypointsChange(edgeId, newWps)
      }
      const onUp = () => {
        wpSnapRef.current = null
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [edgeId, waypoints, transformRef, onWaypointsChange],
  )

  // ── Doppio click → inserisci waypoint ─────────────────────
  // Le coordinate del click sono in spazio schermo (CSS pixel).
  // Il <g> padre ha transform="translate(vx,vy) scale(zoom)", quindi:
  //   flowX = (clientX - svgBoundingLeft - vx) / zoom
  //   flowY = (clientY - svgBoundingTop  - vy) / zoom
  const onPathDblClick = useCallback(
    (e: React.MouseEvent<SVGPathElement>) => {
      e.stopPropagation()
      const svgEl = (e.target as SVGElement).ownerSVGElement
      if (!svgEl) return
      const [vx, vy, z] = transformRef.current
      const rect = svgEl.getBoundingClientRect()
      const flowX = (e.clientX - rect.left - vx) / z
      const flowY = (e.clientY - rect.top  - vy) / z
      const newWps = insertWaypoint(waypoints, { x: flowX, y: flowY }, fixedStart, fixedEnd)
      onWaypointsChange(edgeId, newWps)
    },
    [edgeId, waypoints, fixedStart, fixedEnd, transformRef, onWaypointsChange],
  )

  const color = STROKE

  return (
    <g>
      {/* Linea principale */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} />

      {/* Linea parallela per copertura totale */}
      {coverage === 'total' && (
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={1}
          transform="translate(3,0)"
          style={{ pointerEvents: 'none', opacity: 0.7 }}
        />
      )}

      {/* Area hit invisibile per doppio click */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={14 / zoom}
        style={{ cursor: 'cell' }}
        onDoubleClick={onPathDblClick}
      />

      {/* Waypoints */}
      {waypoints.map((wp, i) => (
        <g key={i}>
          <circle
            cx={wp.x} cy={wp.y} r={WP_VIS_R}
            fill="#92400e" stroke="#0f172a" strokeWidth={1.5}
            style={{ pointerEvents: 'none' }}
          />
          <circle
            cx={wp.x} cy={wp.y} r={WP_HIT_R / zoom}
            fill="transparent" stroke="transparent"
            style={{ cursor: 'grab' }}
            className="nodrag"
            onMouseDown={makeWpMouseDown(i)}
            onDoubleClick={(e) => {
              e.stopPropagation()
              onWaypointsChange(edgeId, waypoints.filter((_, j) => j !== i))
            }}
          />
        </g>
      ))}

      {children}
    </g>
  )
}

// ─── Componente principale ────────────────────────────────────
export default function GeneralizationLayer() {
  const edges       = useDiagramStore((s) => s.edges)
  const nodes       = useDiagramStore((s) => s.nodes)
  const setEdgeData = useDiagramStore((s) => s.setEdgeData)
  const transform   = useStore((s: ReactFlowState) => s.transform) // [vx, vy, zoom]
  const [vx, vy, zoom] = transform

  // Ref aggiornato ad ogni render — usato dentro i callback senza dipendenze stale
  const transformRef = useRef<[number, number, number]>([vx, vy, zoom])
  transformRef.current = [vx, vy, zoom]

  const onWaypointsChange = useCallback(
    (edgeId: string, wps: Point[]) => {
      setEdgeData(edgeId, { waypoints: wps })
    },
    [setEdgeData],
  )

  // Raggruppa edge per padre
  const groups = useMemo((): GenGroup[] => {
    const genEdges = edges.filter((e) => e.type === 'generalization')
    const map = new Map<string, GenGroup>()

    for (const e of genEdges) {
      const parentId = e.target
      const childId  = e.source
      const data = (e.data ?? {}) as {
        coverage?: GeneralizationCoverage
        disjoint?: GeneralizationDisjoint
        waypoints?: Point[]
      }

      if (!map.has(parentId)) {
        map.set(parentId, {
          parentId,
          childIds: [],
          coverage: data.coverage ?? 'partial',
          disjoint: data.disjoint ?? 'exclusive',
          childEdgeIds: {},
          childWaypoints: {},
        })
      }
      const g = map.get(parentId)!
      g.childIds.push(childId)
      g.childEdgeIds[childId] = e.id
      g.childWaypoints[childId] = (data.waypoints ?? []) as Point[]
      g.coverage = data.coverage ?? 'partial'
      g.disjoint = data.disjoint ?? 'exclusive'
    }

    return [...map.values()]
  }, [edges])

  if (groups.length === 0) return null

  const elements: React.ReactNode[] = []

  for (const group of groups) {
    const { parentId, childIds, coverage, disjoint, childEdgeIds, childWaypoints } = group

    const parentNode = nodes.find((n) => n.id === parentId)
    if (!parentNode) continue

    const childNodes = childIds
      .map((id) => nodes.find((n) => n.id === id))
      .filter(Boolean) as typeof nodes
    if (childNodes.length === 0) continue

    const pw = parentNode.width  ?? ENTITY_W
    const ph = parentNode.height ?? ENTITY_H

    const childInfos = childNodes.map((cn) => {
      const cw = cn.width  ?? ENTITY_W
      const ch = cn.height ?? ENTITY_H
      return { node: cn, cw, ch, center: nodeCenter(cn.position, cw, ch), id: cn.id }
    })

    // Junction: X media dei centri figli, Y a metà tra fondo padre e top del figlio più alto
    const avgChildX    = childInfos.reduce((s, c) => s + c.center.x, 0) / childInfos.length
    const minChildTopY = Math.min(...childInfos.map((c) => c.node.position.y))
    const junctionY    = (parentNode.position.y + ph + minChildTopY) / 2
    const junction: Point = { x: avgChildX, y: junctionY }

    // Bordo del padre verso la junction
    const parentBorderPt = borderPoint(parentNode.position, pw, ph, junction)

    // Versore dalla punta freccia verso la junction
    const dx  = junction.x - parentBorderPt.x
    const dy  = junction.y - parentBorderPt.y
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len, uy = dy / len
    const nx = -uy,      ny = ux

    const arrowTip        = parentBorderPt
    const arrowBaseCenter: Point = {
      x: arrowTip.x + ux * ARROW_HEIGHT,
      y: arrowTip.y + uy * ARROW_HEIGHT,
    }
    const arrowL: Point = { x: arrowBaseCenter.x + nx * ARROW_HALF_W, y: arrowBaseCenter.y + ny * ARROW_HALF_W }
    const arrowR: Point = { x: arrowBaseCenter.x - nx * ARROW_HALF_W, y: arrowBaseCenter.y - ny * ARROW_HALF_W }
    const triPts = `${arrowTip.x},${arrowTip.y} ${arrowL.x},${arrowL.y} ${arrowR.x},${arrowR.y}`

    // Trunk waypoints — salvati in tutti gli edge del gruppo come campo 'trunkWaypoints'
    const firstChildId  = childIds[0]
    const firstEdge     = edges.find((e) => e.id === childEdgeIds[firstChildId])
    const firstEdgeData = (firstEdge?.data ?? {}) as Record<string, unknown>
    const trunkWaypoints: Point[] = (firstEdgeData.trunkWaypoints as Point[] | undefined) ?? []

    const trunkStart = arrowBaseCenter
    const trunkEnd   = junction
    const trunkAllPts: Point[] = [trunkStart, ...trunkWaypoints, trunkEnd]

    const onTrunkWaypointsChange = (_eid: string, wps: Point[]) => {
      for (const cid of childIds) {
        const eid = childEdgeIds[cid]
        const ex  = edges.find((e) => e.id === eid)
        setEdgeData(eid, { ...(ex?.data ?? {}), trunkWaypoints: wps } as Record<string, unknown>)
      }
    }

    // Label
    const coverageLabel = coverage === 'total' ? 't' : 'p'
    const disjointLabel = disjoint === 'exclusive' ? 'e' : 'ne'
    const label = `(${coverageLabel}, ${disjointLabel})`
    const labelPt = trunkAllPts[Math.floor(trunkAllPts.length / 2)] ?? junction

    // Segmenti figli
    const childSegments = childInfos.map((ci) => {
      const childBorderPt = borderPoint(ci.node.position, ci.cw, ci.ch, junction)
      const wps = childWaypoints[ci.id] ?? []
      return {
        ci,
        childBorderPt,
        allPts: [childBorderPt, ...wps, junction] as Point[],
        edgeId: childEdgeIds[ci.id],
      }
    })

    elements.push(
      <g key={parentId}>
        {/* Freccia triangolare cava sul bordo del padre */}
        <polygon
          points={triPts}
          fill="white"
          stroke={STROKE}
          strokeWidth={1.5}
          strokeLinejoin="round"
          style={{ pointerEvents: 'none' }}
        />

        {/* Trunk */}
        <InteractiveSegment
          pts={trunkAllPts}
          edgeId={childEdgeIds[firstChildId]}
          zoom={zoom}
          transformRef={transformRef}
          coverage={coverage}
          onWaypointsChange={onTrunkWaypointsChange}
          fixedStart={trunkStart}
          fixedEnd={trunkEnd}
        >
          <text
            x={labelPt.x + 8}
            y={labelPt.y}
            textAnchor="start"
            dominantBaseline="middle"
            fontSize={11}
            fontStyle="italic"
            fill="#fbbf24"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {label}
          </text>
        </InteractiveSegment>

        {/* Rami verso i figli */}
        {childSegments.map(({ ci, childBorderPt, allPts, edgeId }) => (
          <InteractiveSegment
            key={ci.id}
            pts={allPts}
            edgeId={edgeId}
            zoom={zoom}
            transformRef={transformRef}
            onWaypointsChange={(eid, wps) => {
              const ex = edges.find((e) => e.id === eid)
              setEdgeData(eid, { ...(ex?.data ?? {}), waypoints: wps } as Record<string, unknown>)
            }}
            fixedStart={childBorderPt}
            fixedEnd={junction}
          />
        ))}
      </g>,
    )
  }

  return (
    <svg
      style={{
        position:      'absolute',
        top:            0,
        left:           0,
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
        overflow:      'visible',
        zIndex:         5,
      }}
    >
      <g
        transform={`translate(${vx}, ${vy}) scale(${zoom})`}
        style={{ pointerEvents: 'all' }}
      >
        {elements}
      </g>
    </svg>
  )
}

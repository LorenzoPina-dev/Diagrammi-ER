// ============================================================
// GENERALIZATION LAYER
//
// Struttura a T delle generalizzazioni ER.
//
// Funzionalità:
//   • Junction point draggabile (doppio click per resettare al default)
//   • Trunk (freccia → junction) con waypoints draggabili
//   • Freccia "smart aim": punta al primo trunk-waypoint se presente
//   • Rami figlio (junction → bordo figlio) con waypoints draggabili
//   • Label (coverage, disjoint) draggabile sul trunk
//   • Tutto persiste nello store via setEdgeData (condiviso tra gli edge del gruppo)
// ============================================================
import { useCallback, useMemo, useRef } from 'react'
import { useStore, type ReactFlowState } from 'reactflow'
import { useDiagramStore }  from '../../store/diagramStore'
import {
  EdgePath,
  nodeBorderPoint,
  buildFullPath,
  type PathStyle,
  type Point,
  type NodeGeometry,
} from '../../lib/path'
import { useDragPoint } from '../../lib/path'
import type {
  GeneralizationCoverage,
  GeneralizationDisjoint,
} from '../../types/er.types'

// ─── Costanti ────────────────────────────────────────────────
const ENTITY_W      = 140
const ENTITY_H      = 38
const ARROW_HALF_W  = 10
const ARROW_HEIGHT  = 16
const GEN_STROKE        = '#d97706'
const GEN_STROKE_WIDTH  = 1.5
const GEN_WP_FILL       = '#92400e'

// Junction handle: dimensioni visive distinte dai waypoint normali
const JCT_VIS_R = 7    // pallino leggermente più grande
const JCT_HIT_R = 12

// ─── Helpers ─────────────────────────────────────────────────

function makeNodeGeo(
  pos:  { x: number; y: number },
  w:    number,
  h:    number,
  type = 'entity',
): NodeGeometry {
  return { type, position: pos, width: w, height: h }
}

/** Junction default: centrata sui figli X, metà strada Y. */
function defaultJunction(
  parentPos:   { x: number; y: number },
  parentH:     number,
  childTopYs:  number[],
  avgChildX:   number,
): Point {
  return {
    x: avgChildX,
    y: (parentPos.y + parentH + Math.min(...childTopYs)) / 2,
  }
}

/**
 * Freccia triangolare cava.
 * `tip`    = punta (sul bordo del padre)
 * `toward` = direzione (primo trunk-waypoint o junction)
 */
function triangleArrow(tip: Point, toward: Point): { triPts: string; base: Point } {
  const dx = toward.x - tip.x, dy = toward.y - tip.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len, uy = dy / len
  const nx = -uy,      ny = ux
  const base: Point = { x: tip.x + ux * ARROW_HEIGHT, y: tip.y + uy * ARROW_HEIGHT }
  const L: Point    = { x: base.x + nx * ARROW_HALF_W, y: base.y + ny * ARROW_HALF_W }
  const R: Point    = { x: base.x - nx * ARROW_HALF_W, y: base.y - ny * ARROW_HALF_W }
  return {
    triPts: `${tip.x},${tip.y} ${L.x},${L.y} ${R.x},${R.y}`,
    base,
  }
}

// ─── Struttura dati gruppo ────────────────────────────────────

interface GenGroup {
  parentId:         string
  childIds:         string[]
  coverage:         GeneralizationCoverage
  disjoint:         GeneralizationDisjoint
  childEdgeIds:     Record<string, string>
  childWaypoints:   Record<string, Point[]>
  trunkWaypoints:   Point[]
  trunkLabelOffset: Point
  /** Posizione esplicita della junction, se l'utente l'ha spostata. */
  junctionOverride: Point | null
}

// ─── Componente root ──────────────────────────────────────────

export default function GeneralizationLayer() {
  const edges       = useDiagramStore((s) => s.edges)
  const nodes       = useDiagramStore((s) => s.nodes)
  const setEdgeData = useDiagramStore((s) => s.setEdgeData)
  const transform   = useStore((s: ReactFlowState) => s.transform)
  const [vx, vy, zoom] = transform

  const transformRef = useRef<[number, number, number]>([vx, vy, zoom])
  transformRef.current = [vx, vy, zoom]
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  // ── Helper: scrive un campo su tutti gli edge del gruppo ──
  const writeGroup = useCallback(
    (group: GenGroup, patch: Record<string, unknown>) => {
      for (const cid of group.childIds) {
        const eid = group.childEdgeIds[cid]
        const ex  = edges.find((e) => e.id === eid)
        setEdgeData(eid, { ...(ex?.data ?? {}), ...patch } as Record<string, unknown>)
      }
    },
    [edges, setEdgeData],
  )

  const makeTrunkWpsChange    = useCallback(
    (g: GenGroup) => (wps: Point[])   => writeGroup(g, { trunkWaypoints: wps }),
    [writeGroup],
  )
  const makeTrunkLabelChange  = useCallback(
    (g: GenGroup) => (off: Point)     => writeGroup(g, { trunkLabelOffset: off }),
    [writeGroup],
  )
  const makeJunctionChange    = useCallback(
    (g: GenGroup) => (pos: Point)     => writeGroup(g, { junctionOverride: pos }),
    [writeGroup],
  )
  const makeJunctionReset     = useCallback(
    (g: GenGroup) => ()               => writeGroup(g, { junctionOverride: null }),
    [writeGroup],
  )

  const makeChildWpsChange = useCallback(
    (edgeId: string) => (wps: Point[]) => {
      const ex = edges.find((e) => e.id === edgeId)
      setEdgeData(edgeId, { ...(ex?.data ?? {}), waypoints: wps } as Record<string, unknown>)
    },
    [edges, setEdgeData],
  )

  // ── Raggruppamento edge per padre ─────────────────────────
  const groups = useMemo((): GenGroup[] => {
    const map = new Map<string, GenGroup>()

    for (const e of edges.filter((e) => e.type === 'generalization')) {
      const parentId = e.target
      const childId  = e.source
      const d = (e.data ?? {}) as {
        coverage?:         GeneralizationCoverage
        disjoint?:         GeneralizationDisjoint
        waypoints?:        Point[]
        trunkWaypoints?:   Point[]
        trunkLabelOffset?: Point
        junctionOverride?: Point | null
      }

      if (!map.has(parentId)) {
        map.set(parentId, {
          parentId,
          childIds:         [],
          coverage:         d.coverage         ?? 'partial',
          disjoint:         d.disjoint         ?? 'exclusive',
          childEdgeIds:     {},
          childWaypoints:   {},
          trunkWaypoints:   d.trunkWaypoints   ?? [],
          trunkLabelOffset: d.trunkLabelOffset ?? { x: 0, y: 0 },
          junctionOverride: d.junctionOverride ?? null,
        })
      }
      const g = map.get(parentId)!
      g.childIds.push(childId)
      g.childEdgeIds[childId]   = e.id
      g.childWaypoints[childId] = (d.waypoints     ?? []) as Point[]
      g.trunkWaypoints          = (d.trunkWaypoints ?? g.trunkWaypoints) as Point[]
      g.trunkLabelOffset        = (d.trunkLabelOffset ?? g.trunkLabelOffset) as Point
      // junctionOverride: null esplicito ha priorità (reset), undefined usa il precedente
      if ('junctionOverride' in d) g.junctionOverride = d.junctionOverride ?? null
      g.coverage = d.coverage ?? g.coverage
      g.disjoint = d.disjoint ?? g.disjoint
    }

    return [...map.values()]
  }, [edges])

  if (groups.length === 0) return null

  return (
    <svg style={{
      position: 'absolute', top: 0, left: 0,
      width: '100%', height: '100%',
      pointerEvents: 'none', overflow: 'visible', zIndex: 5,
    }}>
      <g
        transform={`translate(${vx}, ${vy}) scale(${zoom})`}
        style={{ pointerEvents: 'all' }}
      >
        {groups.map((group) => (
          <GenGroupRenderer
            key={group.parentId}
            group={group}
            nodes={nodes}
            zoomRef={zoomRef}
            transformRef={transformRef}
            onTrunkWpsChange={makeTrunkWpsChange(group)}
            onTrunkLabelChange={makeTrunkLabelChange(group)}
            onJunctionChange={makeJunctionChange(group)}
            onJunctionReset={makeJunctionReset(group)}
            onChildWpsChange={makeChildWpsChange}
          />
        ))}
      </g>
    </svg>
  )
}

// ─── JunctionHandle — pallino draggabile per la junction ──────

interface JunctionHandleProps {
  pos:      Point
  zoomRef:  React.MutableRefObject<number>
  onChange: (pos: Point) => void
  onReset:  () => void
}

function JunctionHandle({ pos, zoomRef, onChange, onReset }: JunctionHandleProps) {
  const onMouseDown = useDragPoint(zoomRef, pos, onChange)

  return (
    <g>
      {/* Pallino visivo — quadrato ruotato per distinguersi dai waypoint tondi */}
      <rect
        x={pos.x - JCT_VIS_R} y={pos.y - JCT_VIS_R}
        width={JCT_VIS_R * 2} height={JCT_VIS_R * 2}
        transform={`rotate(45 ${pos.x} ${pos.y})`}
        fill={GEN_WP_FILL} stroke="#0f172a" strokeWidth={1.5}
        style={{ pointerEvents: 'none' }}
      />
      {/* Area di hit */}
      <circle
        cx={pos.x} cy={pos.y} r={JCT_HIT_R}
        fill="transparent" stroke="transparent"
        style={{ cursor: 'grab' }}
        className="nodrag"
        onMouseDown={onMouseDown}
        onDoubleClick={(e) => { e.stopPropagation(); onReset() }}
      />
    </g>
  )
}

// ─── Renderer singolo gruppo ──────────────────────────────────

interface RendererProps {
  group:              GenGroup
  nodes:              ReturnType<typeof useDiagramStore.getState>['nodes']
  zoomRef:            React.MutableRefObject<number>
  transformRef:       React.MutableRefObject<[number, number, number]>
  onTrunkWpsChange:   (wps: Point[]) => void
  onTrunkLabelChange: (offset: Point) => void
  onJunctionChange:   (pos: Point) => void
  onJunctionReset:    () => void
  onChildWpsChange:   (edgeId: string) => (wps: Point[]) => void
}

function GenGroupRenderer({
  group, nodes, zoomRef, transformRef,
  onTrunkWpsChange, onTrunkLabelChange,
  onJunctionChange, onJunctionReset,
  onChildWpsChange,
}: RendererProps) {
  const {
    parentId, childIds, coverage, disjoint,
    childEdgeIds, childWaypoints, trunkWaypoints, trunkLabelOffset,
    junctionOverride,
  } = group

  const parentNode = nodes.find((n) => n.id === parentId)
  if (!parentNode) return null

  const childNodes = childIds
    .map((id) => nodes.find((n) => n.id === id))
    .filter((n): n is NonNullable<typeof n> => n != null)
  if (childNodes.length === 0) return null

  const pw = parentNode.width  ?? ENTITY_W
  const ph = parentNode.height ?? ENTITY_H

  const childInfos = childNodes.map((cn) => ({
    id:       cn.id,
    cw:       cn.width  ?? ENTITY_W,
    ch:       cn.height ?? ENTITY_H,
    cx:       cn.position.x + (cn.width  ?? ENTITY_W) / 2,
    topY:     cn.position.y,
    position: cn.position,
  }))

  // ── Junction: override utente o calcolo automatico ────────
  const avgChildX = childInfos.reduce((s, c) => s + c.cx, 0) / childInfos.length
  const junction: Point = junctionOverride ?? defaultJunction(
    parentNode.position,
    ph,
    childInfos.map((c) => c.topY),
    avgChildX,
  )

  // ── Freccia: smart aim verso il primo trunk-waypoint ──────
  // Se il trunk ha waypoints, la freccia punta al primo di essi
  // (non alla junction), esattamente come FloatingEdge fa per le associazioni.
  const arrowToward: Point = trunkWaypoints.length > 0 ? trunkWaypoints[0] : junction

  const parentGeo    = makeNodeGeo(parentNode.position, pw, ph)
  const parentBorder = nodeBorderPoint(parentGeo, arrowToward)
  const { triPts, base: arrowBase } = triangleArrow(parentBorder, arrowToward)

  // ── Trunk ─────────────────────────────────────────────────
  const trunkAllPts  = buildFullPath(arrowBase, trunkWaypoints, junction)
  const coverageChar = coverage === 'total'     ? 't'  : 'p'
  const disjointChar = disjoint  === 'exclusive' ? 'e'  : 'ne'

  const trunkStyle: PathStyle = {
    stroke:         GEN_STROKE,
    strokeWidth:    GEN_STROKE_WIDTH,
    waypointFill:   GEN_WP_FILL,
    parallelOffset: coverage === 'total' ? 3 : undefined,
  }
  const branchStyle: PathStyle = {
    stroke:       GEN_STROKE,
    strokeWidth:  GEN_STROKE_WIDTH,
    waypointFill: GEN_WP_FILL,
  }

  return (
    <g>
      {/* Freccia triangolare cava verso il padre */}
      <polygon
        points={triPts}
        fill="white"
        stroke={GEN_STROKE}
        strokeWidth={GEN_STROKE_WIDTH}
        strokeLinejoin="round"
        style={{ pointerEvents: 'none' }}
      />

      {/* Trunk con label draggabile */}
      <EdgePath
        allPoints={trunkAllPts}
        waypoints={trunkWaypoints}
        startPoint={arrowBase}
        endPoint={junction}
        style={trunkStyle}
        zoomRef={zoomRef}
        transformRef={transformRef}
        onWaypointsChange={onTrunkWpsChange}
        labelText={`(${coverageChar}, ${disjointChar})`}
        labelOffset={trunkLabelOffset}
        onLabelOffsetChange={onTrunkLabelChange}
      />

      {/* Rami verso i figli */}
      {childInfos.map((ci) => {
        // Smart aim sui rami: se ci sono waypoints sul ramo, il bordo
        // del figlio punta al primo waypoint del ramo, non alla junction
        const wps       = childWaypoints[ci.id] ?? []
        const branchAim = wps.length > 0 ? wps[wps.length - 1] : junction
        const childGeo  = makeNodeGeo(ci.position, ci.cw, ci.ch)
        // Il bordo del figlio punta verso la junction (o l'ultimo wp del ramo)
        const childBorder = nodeBorderPoint(childGeo, branchAim)

        return (
          <EdgePath
            key={ci.id}
            allPoints={buildFullPath(childBorder, wps, junction)}
            waypoints={wps}
            startPoint={childBorder}
            endPoint={junction}
            style={branchStyle}
            zoomRef={zoomRef}
            transformRef={transformRef}
            onWaypointsChange={onChildWpsChange(childEdgeIds[ci.id])}
          />
        )
      })}

      {/* Junction handle — sopra tutto, renderizzato per ultimo */}
      <JunctionHandle
        pos={junction}
        zoomRef={zoomRef}
        onChange={onJunctionChange}
        onReset={onJunctionReset}
      />
    </g>
  )
}

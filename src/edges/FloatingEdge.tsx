// ============================================================
// FLOATING EDGE — Arco con waypoints draggabili
//
// Miglioramenti rispetto alla versione precedente:
//
// 1. PUNTO DI USCITA SMART: se esistono waypoints, il bordo
//    di uscita dal nodo è calcolato verso il primo waypoint
//    (lato sorgente) e verso l'ultimo waypoint (lato target),
//    non verso il centro del nodo opposto.
//
// 2. WAYPOINTS SEMPRE VISIBILI: i punti di controllo sono
//    sempre renderizzati (non solo quando selezionato) per
//    essere più facili da afferrare. Area di hit 12px di raggio.
//
// 3. LABEL DRAGGABILE: la label della cardinalità supporta
//    drag libero; l'offset viene salvato in data.labelOffset.
// ============================================================
import { useCallback, useRef } from 'react'
import { EdgeLabelRenderer, useStore, type ReactFlowState, type EdgeProps } from 'reactflow'
import {
  intersectLineRect,
  intersectLineCircle,
  intersectLineDiamond,
  type Point,
  type Rect,
} from './geometry'
import { useDiagramStore } from '../store/diagramStore'

const ENTITY_DEFAULT    = { width: 140, height: 38  }
const RELATION_DEFAULT  = { width: 120, height: 120 }
const ATTRIBUTE_DEFAULT = { width: 44,  height: 44  }
const ATTRIBUTE_RADIUS  = 20

// Raggio dell'area di hit per i waypoints (px, coord flow)
const WP_HIT_RADIUS = 10
// Raggio visivo del pallino waypoint
const WP_VIS_RADIUS = 5

const nodeSelector = (state: ReactFlowState) => state.nodeInternals

// ─────────────────────────────────────────────────────────────
// Calcola il punto sul bordo del nodo puntando verso `from`
// ─────────────────────────────────────────────────────────────
function getBorderPoint(
  nodeType: string | undefined,
  nodePos:  { x: number; y: number },
  nodeW:    number,
  nodeH:    number,
  from:     Point,   // punto verso cui puntare (primo/ultimo waypoint o centro opposto)
): Point {
  const rect: Rect = { x: nodePos.x, y: nodePos.y, width: nodeW, height: nodeH }

  if (nodeType === 'attribute') {
    const center: Point = {
      x: nodePos.x + ATTRIBUTE_RADIUS,
      y: nodePos.y + ATTRIBUTE_RADIUS,
    }
    return intersectLineCircle(from, center, ATTRIBUTE_RADIUS)
  }
  if (nodeType === 'relation') return intersectLineDiamond(from, rect)
  return intersectLineRect(from, rect)
}

function buildPath(pts: Point[]): string {
  if (pts.length < 2) return ''
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

/** Punto medio geometrico di un percorso spezzato */
export function pathMidpoint(pts: Point[]): Point {
  if (pts.length === 0) return { x: 0, y: 0 }
  if (pts.length === 1) return pts[0]

  // Calcola lunghezza totale
  let total = 0
  for (let i = 0; i < pts.length - 1; i++) {
    total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)
  }

  // Cammina fino a metà lunghezza
  let walked = 0
  const half = total / 2
  for (let i = 0; i < pts.length - 1; i++) {
    const segLen = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)
    if (walked + segLen >= half) {
      const t = (half - walked) / segLen
      return {
        x: pts[i].x + t * (pts[i + 1].x - pts[i].x),
        y: pts[i].y + t * (pts[i + 1].y - pts[i].y),
      }
    }
    walked += segLen
  }
  return pts[pts.length - 1]
}

// ─────────────────────────────────────────────────────────────
// Dimensioni default per tipo nodo
// ─────────────────────────────────────────────────────────────
function nodeDefaults(type: string | undefined) {
  if (type === 'relation')  return RELATION_DEFAULT
  if (type === 'attribute') return ATTRIBUTE_DEFAULT
  return ENTITY_DEFAULT
}

// ─────────────────────────────────────────────────────────────
// Interfaccia props estesa
// ─────────────────────────────────────────────────────────────
export interface FloatingEdgeProps extends EdgeProps {
  strokeColor?:     string
  strokeWidth?:     number
  strokeDasharray?: string
  markerEnd?:       string
  /** Se false, nessun waypoint interattivo né label drag (es. attribute-link) */
  interactive?:     boolean
  /** Contenuto label opzionale (es. cardinalità) */
  labelContent?:    React.ReactNode
}

// ─────────────────────────────────────────────────────────────
// Hook per il drag di un punto in coordinate SVG/flow
// ─────────────────────────────────────────────────────────────
function useSvgDrag(
  onDelta: (dx: number, dy: number, mx: number, my: number) => void,
) {
  const startRef = useRef<{ mx: number; my: number } | null>(null)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    startRef.current = { mx: e.clientX, my: e.clientY }

    const onMove = (me: MouseEvent) => {
      if (!startRef.current) return
      onDelta(
        me.clientX - startRef.current.mx,
        me.clientY - startRef.current.my,
        me.clientX,
        me.clientY,
      )
    }
    const onUp = () => {
      startRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onDelta])

  return onMouseDown
}

// ─────────────────────────────────────────────────────────────
// Componente principale
// ─────────────────────────────────────────────────────────────
export function FloatingEdge({
  id,
  source,
  target,
  data,
  strokeColor      = '#475569',
  strokeWidth      = 1.5,
  strokeDasharray,
  markerEnd,
  selected,
  interactive      = true,
  labelContent,
}: FloatingEdgeProps) {
  const nodeInternals = useStore(nodeSelector)
  const setEdgeData   = useDiagramStore((s) => s.setEdgeData)

  // Snapshot iniziali per il drag dei waypoints
  const wpSnapRef    = useRef<Point[] | null>(null)
  // Snapshot iniziale per il drag della label
  const lblSnapRef   = useRef<Point | null>(null)

  const srcNode = nodeInternals.get(source)
  const tgtNode = nodeInternals.get(target)
  if (!srcNode || !tgtNode) return null

  const { width: sw0, height: sh0 } = nodeDefaults(srcNode.type)
  const { width: tw0, height: th0 } = nodeDefaults(tgtNode.type)
  const sw = srcNode.width  ?? sw0
  const sh = srcNode.height ?? sh0
  const tw = tgtNode.width  ?? tw0
  const th = tgtNode.height ?? th0

  const waypoints: Point[] = (data?.waypoints ?? []) as Point[]

  // ── Calcolo punti di uscita SMART ────────────────────────
  // Se ci sono waypoints, il bordo di uscita punta al waypoint
  // più vicino, non al centro del nodo opposto.
  const srcCenter = { x: srcNode.position.x + sw / 2, y: srcNode.position.y + sh / 2 }
  const tgtCenter = { x: tgtNode.position.x + tw / 2, y: tgtNode.position.y + th / 2 }

  const srcAim = waypoints.length > 0 ? waypoints[0]                      : tgtCenter
  const tgtAim = waypoints.length > 0 ? waypoints[waypoints.length - 1]   : srcCenter

  const srcPt = getBorderPoint(srcNode.type, srcNode.position, sw, sh, srcAim)
  const tgtPt = getBorderPoint(tgtNode.type, tgtNode.position, tw, th, tgtAim)

  const allPts: Point[] = [srcPt, ...waypoints, tgtPt]
  const pathD = buildPath(allPts)
  const mid   = pathMidpoint(allPts)

  const strokeFinal = selected ? '#93c5fd' : strokeColor

  // ── Label offset (drag) ───────────────────────────────────
  const labelOffset: Point = (data?.labelOffset as Point | undefined) ?? { x: 0, y: 0 }
  const labelX = mid.x + labelOffset.x
  const labelY = mid.y + labelOffset.y

  // ── Zoom corrente (per convertire delta pixel → coordinate flow) ─
  // Usiamo uno store separato per non re-renderizzare su ogni pan
  const zoom = useStore((s) => s.transform[2])

  // ── Drag label ───────────────────────────────────────────
  const onLabelMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const snap = { ...(data?.labelOffset as Point | undefined ?? { x: 0, y: 0 }) }
    lblSnapRef.current = snap

    const onMove = (me: MouseEvent) => {
      if (!lblSnapRef.current) return
      // Il canvas RF è scalato di `zoom`, quindi dividiamo per zoom
      const dx = (me.clientX - e.clientX) / zoom
      const dy = (me.clientY - e.clientY) / zoom
      setEdgeData(id, {
        ...data,
        labelOffset: { x: snap.x + dx, y: snap.y + dy },
      })
    }
    const onUp = () => {
      lblSnapRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [id, data, setEdgeData, zoom])

  // ── Drag waypoint ────────────────────────────────────────
  const makeWpMouseDown = useCallback((idx: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    console.log("cioa")
    const snap = waypoints.map((w) => ({ ...w }))
    wpSnapRef.current = snap

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

  // ── Doppio click sul path → aggiunge waypoint ──────────
  const onPathDblClick = useCallback((e: React.MouseEvent<SVGPathElement>) => {
    if (!interactive) return
    e.stopPropagation()
    const svg = (e.target as SVGPathElement).ownerSVGElement
    if (!svg) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const local = pt.matrixTransform(svg.getScreenCTM()!.inverse())

    // Inserisce il nuovo waypoint nel segmento più vicino al click
    let bestIdx = waypoints.length
    let bestDist = Infinity
    const pts = [srcPt, ...waypoints, tgtPt]
    for (let i = 0; i < pts.length - 1; i++) {
      // Distanza punto-segmento
      const ax = pts[i].x,     ay = pts[i].y
      const bx = pts[i+1].x,   by = pts[i+1].y
      const px = local.x,      py = local.y
      const abx = bx - ax, aby = by - ay
      const len2 = abx*abx + aby*aby
      let t = len2 > 0 ? ((px-ax)*abx + (py-ay)*aby) / len2 : 0
      t = Math.max(0, Math.min(1, t))
      const nx = ax + t*abx, ny = ay + t*aby
      const d = Math.hypot(px - nx, py - ny)
      if (d < bestDist) { bestDist = d; bestIdx = i }
    }
    const newWps = [...waypoints]
    newWps.splice(bestIdx, 0, { x: local.x, y: local.y })
    setEdgeData(id, { ...data, waypoints: newWps })
  }, [interactive, id, srcPt, tgtPt, waypoints, data, setEdgeData])

  return (
    <>
      <g>
        {/* Linea principale */}
        <path
          id={id}
          d={pathD}
          fill="none"
          stroke={strokeFinal}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          markerEnd={markerEnd}
          style={{ transition: 'stroke 0.2s' }}
        />

        {/* Area di click larga per doppio-click → aggiunta waypoint */}
        {interactive && (
          <path
            d={pathD}
            fill="none"
            stroke="transparent"
            strokeWidth={10}
            style={{ cursor: 'cell', pointerEvents: 'stroke' }}
            onDoubleClick={onPathDblClick}
          />
        )}

        {/* Waypoints draggabili — sempre visibili se interactive */}
        {interactive && waypoints.map((wp, i) => (
          <g key={i} style={{ pointerEvents: 'all' }}>
            {/* Pallino visivo */}
            <circle
              cx={wp.x}
              cy={wp.y}
              r={WP_VIS_RADIUS}
              fill={selected ? '#93c5fd' : '#64748b'}
              stroke="#0f172a"
              strokeWidth={1.5}
              style={{ pointerEvents: 'none' }}
            />
            {/* Area di hit invisibile più grande */}
            <circle
              cx={wp.x}
              cy={wp.y}
              r={WP_HIT_RADIUS}
              fill="transparent"
              stroke="transparent"
              style={{ cursor: 'grab' }}
              className="nodrag"
              onMouseDown={makeWpMouseDown(i)}
              onDoubleClick={(e) => {
                e.stopPropagation()
                const newWps = waypoints.filter((_, j) => j !== i)
                setEdgeData(id, { ...data, waypoints: newWps })
              }}
            />
            
          </g>
        ))}
      </g>

      {/* Label draggabile */}
      {interactive && labelContent && (
        <EdgeLabelRenderer>
          <div
            style={{
              position:   'absolute',
              transform:  `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              cursor:     'move',
              userSelect: 'none',
            }}
            className="nodrag nopan"
            onMouseDown={onLabelMouseDown}
          >
            {labelContent}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

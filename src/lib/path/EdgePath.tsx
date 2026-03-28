// ============================================================
// EdgePath — Componente SVG base per qualsiasi arco del diagramma
//
// È il mattone unico riutilizzato da:
//   • AssociationEdge   (tramite FloatingEdge)
//   • AttributeLinkEdge (tramite FloatingEdge, interactive=false)
//   • GeneralizationLayer (trunk + rami figli)
//   • Attributi composti / multipli (attributo → sotto-attributo)
//
// Responsabilità:
//   ✔ Rendering del <path> principale
//   ✔ Linea parallela opzionale (es. copertura totale gen.)
//   ✔ Area di hit larga per doppio click → aggiunge waypoint
//   ✔ Pallini waypoint draggabili (rimuovibili con doppio click)
//   ✔ Label SVG draggabile con offset persistente
//   ✔ Slot <children> per decoratori SVG (frecce, simboli, testi fissi)
//
// NON conosce ReactFlow, lo store o i tipi di nodo ER:
// riceve solo Point[] già calcolati dal chiamante.
// ============================================================
import React, { useCallback, useMemo } from 'react'
import type { Point } from './geometry'
import { buildPathD, insertWaypoint, moveWaypoint, removeWaypoint, pathMidpoint } from './polyline'
import { useDragPoint } from './drag'

// ─── Costanti visive ──────────────────────────────────────────
const WP_VIS_R = 5
const WP_HIT_R = 10

// ─── Tipi pubblici ────────────────────────────────────────────

/**
 * Stile completo di un arco.
 * Tutti i parametri opzionali hanno default sensati.
 */
export interface PathStyle {
  stroke:           string
  strokeWidth:      number
  /** Dashes SVG, es. "5 3". Ometti per linea continua. */
  strokeDash?:      string
  /** URI del marker SVG di fine freccia, es. "url(#gen-arrow)". */
  markerEnd?:       string
  /**
   * Offset px di una seconda linea parallela (stessa stroke, opacity 0.7).
   * Usato per la copertura totale della generalizzazione.
   */
  parallelOffset?:  number
  /**
   * Fill dei pallini waypoint.
   * Default '#64748b' (grigio neutro).
   * Impostare al colore del segmento per coerenza cromatica.
   */
  waypointFill?:    string
}

/**
 * Coordinate del canvas necessarie per convertire eventi mouse
 * in coordinate flow quando il componente è dentro un
 * <g transform="translate(vx,vy) scale(zoom)">.
 *
 * Se omesso, EdgePath userà getScreenCTM (funziona nel SVG overlay
 * di ReactFlow, non dentro un <g> trasformato manualmente).
 */
export interface CanvasTransformRef {
  transformRef: React.MutableRefObject<[number, number, number]>
}

export interface EdgePathProps {
  // ── Geometria ──────────────────────────────────────────────
  /** Punti completi: [startPoint, ...waypoints, endPoint] */
  allPoints:          Point[]
  /** Solo i waypoints interni (senza start/end fissi). */
  waypoints:          Point[]
  /** Endpoint fisso di partenza (bordo del nodo sorgente). */
  startPoint:         Point
  /** Endpoint fisso di arrivo (bordo del nodo target). */
  endPoint:           Point

  // ── Stile ──────────────────────────────────────────────────
  style:              PathStyle

  // ── Interattività ──────────────────────────────────────────
  /**
   * Abilita waypoints draggabili e doppio click per aggiungerne.
   * Default: true. Impostare false per archi di sola visualizzazione
   * (es. attribute-link).
   */
  interactive?:       boolean

  /** Ref allo zoom corrente — mai stale. Obbligatorio se interactive. */
  zoomRef:            React.MutableRefObject<number>

  /**
   * Ref al transform [vx, vy, zoom] del canvas.
   * Obbligatorio quando il componente è dentro un <g> con transform
   * (es. GeneralizationLayer). Omettere per il SVG overlay di ReactFlow.
   */
  transformRef?:      React.MutableRefObject<[number, number, number]>

  /** Chiamato quando i waypoints cambiano (drag, aggiunta, rimozione). */
  onWaypointsChange:  (newWaypoints: Point[]) => void

  // ── Label draggabile ───────────────────────────────────────
  /** Testo della label SVG. Ometti per nessuna label. */
  labelText?:           string
  /**
   * Offset della label rispetto al midpoint del path.
   * Default: { x: 0, y: 0 }.
   */
  labelOffset?:         Point
  /** Override degli attributi SVG del testo label. */
  labelStyle?:          React.SVGProps<SVGTextElement>
  /**
   * Se fornito, la label diventa draggabile e chiama questa callback
   * con il nuovo offset. Se omesso, la label è statica.
   */
  onLabelOffsetChange?: (offset: Point) => void

  // ── Decoratori SVG ─────────────────────────────────────────
  /**
   * Elementi SVG aggiuntivi renderizzati dentro il <g>.
   * Usato per frecce, simboli, testi posizionati manualmente.
   */
  children?:          React.ReactNode
}

// ─── WaypointHandle ───────────────────────────────────────────

interface WaypointHandleProps {
  point:    Point
  index:    number
  zoomRef:  React.MutableRefObject<number>
  fill:     string
  onDrag:   (idx: number, pos: Point) => void
  onRemove: (idx: number) => void
}

const WaypointHandle = React.memo(function WaypointHandle({
  point, index, zoomRef, fill, onDrag, onRemove,
}: WaypointHandleProps) {
  const handleMove = useCallback((pos: Point) => onDrag(index, pos), [index, onDrag])
  const onMouseDown = useDragPoint(zoomRef, point, handleMove)

  return (
    <g>
      {/* Pallino visivo */}
      <circle cx={point.x} cy={point.y} r={WP_VIS_R}
        fill={fill} stroke="#0f172a" strokeWidth={1.5}
        style={{ pointerEvents: 'none' }}
      />
      {/* Area di hit */}
      <circle cx={point.x} cy={point.y} r={WP_HIT_R}
        fill="transparent" stroke="transparent"
        style={{ cursor: 'grab' }}
        className="nodrag"
        onMouseDown={onMouseDown}
        onDoubleClick={(e) => { e.stopPropagation(); onRemove(index) }}
      />
    </g>
  )
})

// ─── LabelHandle ─────────────────────────────────────────────

interface LabelHandleProps {
  text:       string
  /** Posizione assoluta della label (midpoint + offset). */
  absPos:     Point
  /** Offset corrente — necessario per calcolare il nuovo offset al drag. */
  offset:     Point
  zoomRef:    React.MutableRefObject<number>
  svgStyle?:  React.SVGProps<SVGTextElement>
  onChange:   (newOffset: Point) => void
}

const LabelHandle = React.memo(function LabelHandle({
  text, absPos, offset, zoomRef, svgStyle, onChange,
}: LabelHandleProps) {
  // La "base" del midpoint è: base = absPos - offset
  // Al drag, il nuovo offset è: pos - base = pos - (absPos - offset)
  const onMove = useCallback(
    (pos: Point) => onChange({
      x: pos.x - (absPos.x - offset.x),
      y: pos.y - (absPos.y - offset.y),
    }),
    [absPos, offset, onChange],
  )
  const onMouseDown = useDragPoint(zoomRef, absPos, onMove)

  const defaults: React.SVGProps<SVGTextElement> = {
    fontSize:         11,
    fontStyle:        'italic',
    fill:             '#fbbf24',
    dominantBaseline: 'middle',
    textAnchor:       'start',
  }

  return (
    <text
      x={absPos.x + 8} y={absPos.y}
      {...defaults} {...svgStyle}
      style={{ cursor: 'move', userSelect: 'none', pointerEvents: 'all' }}
      className="nodrag"
      onMouseDown={onMouseDown}
    >
      {text}
    </text>
  )
})

// ─── EdgePath — Componente principale ────────────────────────

export const EdgePath = React.memo(function EdgePath({
  allPoints,
  waypoints,
  startPoint,
  endPoint,
  style,
  interactive = true,
  zoomRef,
  transformRef,
  onWaypointsChange,
  labelText,
  labelOffset,
  labelStyle,
  onLabelOffsetChange,
  children,
}: EdgePathProps) {
  const {
    stroke, strokeWidth, strokeDash, markerEnd,
    parallelOffset, waypointFill = '#64748b',
  } = style

  const pathD    = buildPathD(allPoints)
  const midpoint = useMemo(() => pathMidpoint(allPoints), [allPoints])
  const lx       = midpoint.x + (labelOffset?.x ?? 0)
  const ly       = midpoint.y + (labelOffset?.y ?? 0)

  // ── Doppio click → inserisci waypoint ─────────────────────
  const onDblClick = useCallback(
    (e: React.MouseEvent<SVGPathElement>) => {
      if (!interactive) return
      e.stopPropagation()

      let fx: number, fy: number

      if (transformRef) {
        // Dentro un <g transform="translate(vx,vy) scale(zoom)">
        const [vx, vy, z] = transformRef.current
        const svgEl = (e.target as SVGElement).ownerSVGElement
        if (!svgEl) return
        const r = svgEl.getBoundingClientRect()
        fx = (e.clientX - r.left - vx) / z
        fy = (e.clientY - r.top  - vy) / z
      } else {
        // SVG overlay di ReactFlow — usa getScreenCTM
        const svg = (e.target as SVGPathElement).ownerSVGElement
        if (!svg) return
        const pt = svg.createSVGPoint()
        pt.x = e.clientX; pt.y = e.clientY
        const loc = pt.matrixTransform(svg.getScreenCTM()!.inverse())
        fx = loc.x; fy = loc.y
      }

      onWaypointsChange(insertWaypoint(waypoints, { x: fx, y: fy }, startPoint, endPoint))
    },
    [interactive, waypoints, startPoint, endPoint, onWaypointsChange, transformRef],
  )

  // ── Drag waypoint ─────────────────────────────────────────
  const handleWpDrag = useCallback(
    (idx: number, pos: Point) => onWaypointsChange(moveWaypoint(waypoints, idx, pos)),
    [waypoints, onWaypointsChange],
  )
  const handleWpRemove = useCallback(
    (idx: number) => onWaypointsChange(removeWaypoint(waypoints, idx)),
    [waypoints, onWaypointsChange],
  )

  return (
    <g>
      {/* Tratto principale */}
      <path d={pathD} fill="none"
        stroke={stroke} strokeWidth={strokeWidth}
        strokeDasharray={strokeDash} markerEnd={markerEnd}
        style={{ transition: 'stroke 0.2s', pointerEvents: 'none' }}
      />

      {/* Linea parallela (copertura totale generalizzazione) */}
      {parallelOffset !== undefined && (
        <path d={pathD} fill="none"
          stroke={stroke} strokeWidth={Math.max(1, strokeWidth - 0.5)}
          strokeDasharray={strokeDash}
          transform={`translate(${parallelOffset}, 0)`}
          style={{ pointerEvents: 'none', opacity: 0.7 }}
        />
      )}

      {/* Area di hit larga per doppio click */}
      {interactive && (
        <path d={pathD} fill="none" stroke="transparent"
          strokeWidth={Math.max(10, WP_HIT_R * 2)}
          style={{ cursor: 'cell', pointerEvents: 'stroke' }}
          onDoubleClick={onDblClick}
        />
      )}

      {/* Pallini waypoint draggabili */}
      {interactive && waypoints.map((wp, i) => (
        <WaypointHandle
          key={i} point={wp} index={i}
          zoomRef={zoomRef} fill={waypointFill}
          onDrag={handleWpDrag} onRemove={handleWpRemove}
        />
      ))}

      {/* Label draggabile */}
      {labelText && onLabelOffsetChange && (
        <LabelHandle
          text={labelText}
          absPos={{ x: lx, y: ly }}
          offset={labelOffset ?? { x: 0, y: 0 }}
          zoomRef={zoomRef}
          svgStyle={labelStyle}
          onChange={onLabelOffsetChange}
        />
      )}

      {/* Label statica */}
      {labelText && !onLabelOffsetChange && (
        <text x={lx + 8} y={ly}
          fontSize={11} fontStyle="italic" fill="#fbbf24"
          dominantBaseline="middle" textAnchor="start"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          {...labelStyle}
        >
          {labelText}
        </text>
      )}

      {/* Decoratori SVG (frecce, simboli passati dal chiamante) */}
      {children}
    </g>
  )
})

EdgePath.displayName = 'EdgePath'

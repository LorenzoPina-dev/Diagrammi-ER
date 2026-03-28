// ============================================================
// @lib/path — Barrel export
//
// Tutto ciò che un consumatore può importare dal package.
// Nulla di interno (funzioni private, tipi helper) viene
// re-esportato da qui.
// ============================================================

// ── Tipi geometrici base ─────────────────────────────────────
export type { Point, Rect } from './geometry'
export {
  intersectLineRect,
  intersectLineCircle,
  intersectLineDiamond,
} from './geometry'

// ── Operazioni su polilinee ──────────────────────────────────
export {
  buildPathD,
  buildFullPath,
  pathMidpoint,
  insertWaypoint,
  moveWaypoint,
  removeWaypoint,
} from './polyline'

// ── Ancoraggio sui nodi ER ───────────────────────────────────
export type { NodeGeometry, KnownNodeType } from './nodeAnchor'
export {
  NODE_DEFAULTS,
  ATTRIBUTE_RADIUS,
  resolveNodeSize,
  nodeCenter,
  nodeBorderPoint,
  resolveEdgeAnchors,
} from './nodeAnchor'

// ── Drag hooks ───────────────────────────────────────────────
export type { DeltaCallback, MoveCallback } from './drag'
export { useDragDelta, useDragPoint }       from './drag'

// ── Componente SVG base ──────────────────────────────────────
export type { PathStyle, EdgePathProps } from './EdgePath'
export { EdgePath }                      from './EdgePath'

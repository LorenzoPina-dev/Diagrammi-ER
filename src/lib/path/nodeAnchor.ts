// ============================================================
// NODE ANCHOR — Calcolo del punto di ancoraggio sul bordo nodo
// ============================================================
import {
  intersectLineRect,
  intersectLineCircle,
  intersectLineDiamond,
  type Point,
  type Rect,
} from './geometry'

// ─── Dimensioni default ───────────────────────────────────────

export const NODE_DEFAULTS = {
  entity:    { width: 140, height: 38  },
  relation:  { width: 120, height: 120 },
  // Attributo: bounding box del cerchio piccolo standard
  attribute: { width: 16,  height: 16  },
} as const

export type KnownNodeType = keyof typeof NODE_DEFAULTS

// Raggio del cerchio attributo standard
export const ATTRIBUTE_RADIUS = 8
// Raggio chiave primaria / composite-key
export const ATTRIBUTE_RADIUS_PK = 8
export const ATTRIBUTE_RADIUS_CK = 10
// Semiassi ellisse composita
export const COMPOSITE_RX = 28
export const COMPOSITE_RY = 14

// ─── API ──────────────────────────────────────────────────────

export interface NodeGeometry {
  type:     string | undefined
  position: { x: number; y: number }
  width?:   number | null
  height?:  number | null
  /** Tipo di attributo, per calcolare il bordo corretto */
  attrKind?: string
}

export function resolveNodeSize(node: NodeGeometry): { w: number; h: number } {
  // Se le dimensioni sono già note dal DOM, usiamo quelle
  if (node.width && node.height) return { w: node.width, h: node.height }

  if (node.type === 'attribute') {
    const k = node.attrKind
    if (k === 'composite')    return { w: COMPOSITE_RX*2, h: COMPOSITE_RY*2 }
    if (k === 'composite-key') return { w: ATTRIBUTE_RADIUS_CK*2, h: ATTRIBUTE_RADIUS_CK*2 }
    if (k === 'primary-key')  return { w: ATTRIBUTE_RADIUS_PK*2, h: ATTRIBUTE_RADIUS_PK*2 }
    return { w: ATTRIBUTE_RADIUS*2, h: ATTRIBUTE_RADIUS*2 }
  }

  const def = NODE_DEFAULTS[(node.type as KnownNodeType)] ?? NODE_DEFAULTS.entity
  return { w: def.width, h: def.height }
}

export function nodeCenter(node: NodeGeometry): Point {
  const { w, h } = resolveNodeSize(node)
  return { x: node.position.x + w / 2, y: node.position.y + h / 2 }
}

export function nodeBorderPoint(node: NodeGeometry, toward: Point): Point {
  const { w, h } = resolveNodeSize(node)
  const rect: Rect = { x: node.position.x, y: node.position.y, width: w, height: h }

  if (node.type === 'attribute') {
    const k = node.attrKind
    const r = k === 'composite-key' ? ATTRIBUTE_RADIUS_CK
            : k === 'primary-key'   ? ATTRIBUTE_RADIUS_PK
            : ATTRIBUTE_RADIUS

    if (k === 'composite') {
      // Ellisse: intersezione approssimata via rettangolo
      const center: Point = {
        x: node.position.x + COMPOSITE_RX,
        y: node.position.y + COMPOSITE_RY,
      }
      // Intersezione retta centro→toward con il bordo dell'ellisse
      const dx = toward.x - center.x
      const dy = toward.y - center.y

      const t = 1 / Math.sqrt((dx*dx)/(COMPOSITE_RX*COMPOSITE_RX) + (dy*dy)/(COMPOSITE_RY*COMPOSITE_RY))

      return {
        x: center.x + dx * t,
        y: center.y + dy * t,
      }
    }

    const center: Point = {
      x: node.position.x + r,
      y: node.position.y + r,
    }
    return intersectLineCircle(toward, center, r - 1)
  }

  if (node.type === 'relation') return intersectLineDiamond(toward, rect)
  return intersectLineRect(toward, rect)
}

export function resolveEdgeAnchors(
  src: NodeGeometry,
  tgt: NodeGeometry,
  waypoints: Point[],
): { srcPt: Point; tgtPt: Point } {
  const srcCenter = nodeCenter(src)
  const tgtCenter = nodeCenter(tgt)
  const srcAim = waypoints.length > 0 ? waypoints[0]                    : tgtCenter
  const tgtAim = waypoints.length > 0 ? waypoints[waypoints.length - 1] : srcCenter
  return {
    srcPt: nodeBorderPoint(src, srcAim),
    tgtPt: nodeBorderPoint(tgt, tgtAim),
  }
}

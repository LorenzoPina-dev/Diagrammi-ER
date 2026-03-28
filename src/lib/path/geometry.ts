// ============================================================
// GEOMETRY — Primitive geometriche pure
//
// Nessuna dipendenza da React, ReactFlow o store.
// Tutte le funzioni sono pure e deterministiche.
// ============================================================

// ─── Tipi base ───────────────────────────────────────────────

export interface Point { x: number; y: number }
export interface Rect  { x: number; y: number; width: number; height: number }

// ─── Intersezioni linea / forma ──────────────────────────────

/**
 * Punto sul bordo di un RETTANGOLO che si trova sulla retta
 * che va dal centro del rettangolo verso `from`.
 */
export function intersectLineRect(from: Point, rect: Rect): Point {
  const cx    = rect.x + rect.width  / 2
  const cy    = rect.y + rect.height / 2
  const dx    = from.x - cx
  const dy    = from.y - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }

  const halfW = rect.width  / 2
  const halfH = rect.height / 2
  const candidates: Point[] = []

  if (dx !== 0) {
    const t  = halfW / Math.abs(dx)
    const iy = cy + dy * t
    if (iy >= rect.y && iy <= rect.y + rect.height)
      candidates.push({ x: cx + Math.sign(dx) * halfW, y: iy })
  }
  if (dy !== 0) {
    const t  = halfH / Math.abs(dy)
    const ix = cx + dx * t
    if (ix >= rect.x && ix <= rect.x + rect.width)
      candidates.push({ x: ix, y: cy + Math.sign(dy) * halfH })
  }

  if (candidates.length === 0) return { x: cx, y: cy }
  return candidates.reduce((best, pt) =>
    dist2(pt, from) < dist2(best, from) ? pt : best,
  )
}

/**
 * Punto sul bordo di un CERCHIO che si trova sulla retta
 * che va dal centro del cerchio verso `from`.
 */
export function intersectLineCircle(from: Point, center: Point, radius: number): Point {
  const dx   = from.x - center.x
  const dy   = from.y - center.y
  const d    = Math.sqrt(dx * dx + dy * dy)
  if (d === 0) return center
  return { x: center.x + (dx / d) * radius, y: center.y + (dy / d) * radius }
}

/**
 * Punto sul bordo di un ROMBO (vertici N/E/S/W) che si trova
 * sulla retta che va dal centro del rombo verso `from`.
 * Il rombo è descritto dalla sua bounding box `rect`.
 */
export function intersectLineDiamond(from: Point, rect: Rect): Point {
  const cx = rect.x + rect.width  / 2
  const cy = rect.y + rect.height / 2

  const top:    Point = { x: cx,               y: rect.y               }
  const right:  Point = { x: rect.x + rect.width, y: cy               }
  const bottom: Point = { x: cx,               y: rect.y + rect.height }
  const left:   Point = { x: rect.x,            y: cy               }

  const sides: [Point, Point][] = [
    [top, right], [right, bottom], [bottom, left], [left, top],
  ]

  for (const [a, b] of sides) {
    const pt = _segmentIntersect({ x: cx, y: cy }, from, a, b)
    if (pt) return pt
  }
  return intersectLineRect(from, rect)
}

// ─── Utilità interne ─────────────────────────────────────────

function dist2(a: Point, b: Point): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2
}

function _segmentIntersect(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y
  const denom = d1x * d2y - d1y * d2x
  if (Math.abs(denom) < 1e-10) return null
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1)
    return { x: p1.x + t * d1x, y: p1.y + t * d1y }
  return null
}

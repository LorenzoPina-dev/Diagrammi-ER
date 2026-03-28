// ============================================================
// GEOMETRY UTILS — Calcolo intersezione linea / forma nodo
//
// Dato il centro di un nodo sorgente e il centro di un nodo
// target, calcola il punto esatto in cui la linea retta che
// li congiunge interseca il bordo della forma.
//
// Supporta:
//   - Rettangoli (entità)
//   - Rombi (relazioni) — approssimati come rettangolo ruotato
//   - Cerchi (attributi)
// ============================================================

export interface Point { x: number; y: number }
export interface Rect  { x: number; y: number; width: number; height: number }

// ─────────────────────────────────────────────────────────────
// Intersezione linea retta con rettangolo (AABB)
// Restituisce il punto sul bordo più vicino a `from`
// ─────────────────────────────────────────────────────────────
export function intersectLineRect(
  from: Point, // punto esterno (centro del nodo opposto)
  rect: Rect,  // rettangolo del nodo corrente (coordinate assolute)
): Point {
  const cx = rect.x + rect.width  / 2
  const cy = rect.y + rect.height / 2

  const dx = from.x - cx
  const dy = from.y - cy

  if (dx === 0 && dy === 0) return { x: cx, y: cy }

  // Calcoliamo il parametro t per ciascun bordo e prendiamo il minimo positivo
  const halfW = rect.width  / 2
  const halfH = rect.height / 2

  const candidates: Point[] = []

  // Bordo destro (x = cx + halfW)
  if (dx !== 0) {
    const t = halfW / Math.abs(dx)
    const iy = cy + dy * t
    if (iy >= rect.y && iy <= rect.y + rect.height) {
      candidates.push({ x: cx + Math.sign(dx) * halfW, y: iy })
    }
  }

  // Bordo superiore/inferiore (y = cy ± halfH)
  if (dy !== 0) {
    const t = halfH / Math.abs(dy)
    const ix = cx + dx * t
    if (ix >= rect.x && ix <= rect.x + rect.width) {
      candidates.push({ x: ix, y: cy + Math.sign(dy) * halfH })
    }
  }

  if (candidates.length === 0) return { x: cx, y: cy }

  // Restituiamo il candidato più vicino a `from`
  return candidates.reduce((best, pt) => {
    const db = (best.x - from.x) ** 2 + (best.y - from.y) ** 2
    const dp = (pt.x   - from.x) ** 2 + (pt.y   - from.y) ** 2
    return dp < db ? pt : best
  })
}

// ─────────────────────────────────────────────────────────────
// Intersezione linea retta con cerchio
// ─────────────────────────────────────────────────────────────
export function intersectLineCircle(
  from:   Point,  // centro del nodo opposto
  center: Point,  // centro del cerchio
  radius: number,
): Point {
  const dx = from.x - center.x
  const dy = from.y - center.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) return center

  return {
    x: center.x + (dx / dist) * radius,
    y: center.y + (dy / dist) * radius,
  }
}

// ─────────────────────────────────────────────────────────────
// Intersezione linea retta con rombo (diamond)
// Il rombo ha i quattro vertici a N/E/S/W rispetto al centro
// ─────────────────────────────────────────────────────────────
export function intersectLineDiamond(
  from: Point,
  rect: Rect,  // bounding box del nodo rombo
): Point {
  const cx = rect.x + rect.width  / 2
  const cy = rect.y + rect.height / 2

  const hw = rect.width  / 2  // metà larghezza
  const hh = rect.height / 2  // metà altezza

  // I 4 vertici del rombo
  const top:    Point = { x: cx,      y: rect.y }
  const right:  Point = { x: rect.x + rect.width, y: cy }
  const bottom: Point = { x: cx,      y: rect.y + rect.height }
  const left:   Point = { x: rect.x,  y: cy }

  // I 4 segmenti del bordo del rombo
  const sides = [
    [top, right],
    [right, bottom],
    [bottom, left],
    [left, top],
  ] as const

  const dx = from.x - cx
  const dy = from.y - cy

  for (const [a, b] of sides) {
    const pt = segmentIntersect({ x: cx, y: cy }, from, a, b)
    if (pt) return pt
  }

  // Fallback: proiezione sul rettangolo esterno
  return intersectLineRect(from, rect)
}

// ─────────────────────────────────────────────────────────────
// Intersezione tra due segmenti (algoritmo classico)
// Restituisce null se non si intersecano
// ─────────────────────────────────────────────────────────────
function segmentIntersect(
  p1: Point, p2: Point,
  p3: Point, p4: Point,
): Point | null {
  const d1x = p2.x - p1.x
  const d1y = p2.y - p1.y
  const d2x = p4.x - p3.x
  const d2y = p4.y - p3.y

  const denom = d1x * d2y - d1y * d2x
  if (Math.abs(denom) < 1e-10) return null

  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: p1.x + t * d1x,
      y: p1.y + t * d1y,
    }
  }
  return null
}

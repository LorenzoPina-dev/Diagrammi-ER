// ============================================================
// POLYLINE — Operazioni pure su percorsi spezzati
//
// Nessuna dipendenza da React, ReactFlow o store.
// Input/output: array di Point.
// ============================================================
import type { Point } from './geometry'

// ─── SVG path string ─────────────────────────────────────────

/** Converte un array di punti nella stringa `d` di un <path> SVG. */
export function buildPathD(pts: Point[]): string {
  if (pts.length < 2) return ''
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

// ─── Midpoint ────────────────────────────────────────────────

/**
 * Punto geometrico a metà lunghezza del percorso.
 * Percorre il polilinea finché non raggiunge la metà della lunghezza totale.
 */
export function pathMidpoint(pts: Point[]): Point {
  if (pts.length === 0) return { x: 0, y: 0 }
  if (pts.length === 1) return pts[0]

  let total = 0
  for (let i = 0; i < pts.length - 1; i++)
    total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)

  let walked = 0
  const half = total / 2
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)
    if (walked + seg >= half) {
      const t = (half - walked) / seg
      return {
        x: pts[i].x + t * (pts[i + 1].x - pts[i].x),
        y: pts[i].y + t * (pts[i + 1].y - pts[i].y),
      }
    }
    walked += seg
  }
  return pts[pts.length - 1]
}

// ─── Waypoint management ─────────────────────────────────────

/**
 * Costruisce il path completo: [start, ...waypoints, end].
 * Utility per evitare lo spread inline ripetuto ovunque.
 */
export function buildFullPath(start: Point, waypoints: Point[], end: Point): Point[] {
  return [start, ...waypoints, end]
}

/**
 * Inserisce `newPt` nel segmento del percorso [start, ...waypoints, end]
 * geometricamente più vicino al punto cliccato.
 *
 * Restituisce il nuovo array di soli waypoints (senza gli endpoint fissi).
 */
export function insertWaypoint(
  waypoints:  Point[],
  newPt:      Point,
  start:      Point,
  end:        Point,
): Point[] {
  const pts = [start, ...waypoints, end]
  let bestIdx  = waypoints.length
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

  const result = [...waypoints]
  result.splice(bestIdx, 0, newPt)
  return result
}

/**
 * Aggiorna la posizione del waypoint all'indice `idx`.
 */
export function moveWaypoint(waypoints: Point[], idx: number, pos: Point): Point[] {
  return waypoints.map((w, i) => i === idx ? pos : w)
}

/**
 * Rimuove il waypoint all'indice `idx`.
 */
export function removeWaypoint(waypoints: Point[], idx: number): Point[] {
  return waypoints.filter((_, i) => i !== idx)
}

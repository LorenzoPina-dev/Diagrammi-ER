// ============================================================
// DRAG HOOKS — Drag in coordinate flow (SVG scalato)
//
// Tutti gli hook ricevono un `zoomRef` (MutableRefObject<number>)
// invece del valore numerico, così i callback non diventano mai
// stale quando l'utente fa pan/zoom tra un drag e l'altro.
// ============================================================
import { useRef, useCallback } from 'react'
import type { Point } from './geometry'

// ─── Tipi ────────────────────────────────────────────────────

export type DeltaCallback = (dx: number, dy: number) => void
export type MoveCallback  = (pos: Point) => void

// ─── useDragDelta ─────────────────────────────────────────────

/**
 * Drag generico: chiama `onDelta(dx, dy)` in coordinate flow
 * ad ogni mousemove rispetto al punto di partenza del drag.
 *
 * Utile per spostare oggetti con offset relativo (es. label HTML).
 */
export function useDragDelta(
  zoomRef:  React.MutableRefObject<number>,
  onDelta:  DeltaCallback,
) {
  const startRef = useRef<{ mx: number; my: number } | null>(null)

  return useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      startRef.current = { mx: e.clientX, my: e.clientY }

      const onMove = (me: MouseEvent) => {
        if (!startRef.current) return
        const z  = zoomRef.current
        onDelta(
          (me.clientX - startRef.current.mx) / z,
          (me.clientY - startRef.current.my) / z,
        )
      }
      const onUp = () => {
        startRef.current = null
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [zoomRef, onDelta],
  )
}

// ─── useDragPoint ─────────────────────────────────────────────

/**
 * Drag "snapshot": congela la posizione iniziale al mousedown e
 * chiama `onMove` con la nuova posizione assoluta in coord flow.
 *
 * Usato per draggare waypoints e label SVG.
 *
 * @param zoomRef   Ref allo zoom corrente (mai stale).
 * @param snapshot  Posizione iniziale del punto (aggiornata a ogni render).
 * @param onMove    Riceve la nuova posizione assoluta.
 */
export function useDragPoint(
  zoomRef:  React.MutableRefObject<number>,
  snapshot: Point,
  onMove:   MoveCallback,
) {
  const startRef  = useRef<{ mx: number; my: number } | null>(null)
  const snapRef   = useRef(snapshot)
  snapRef.current = snapshot   // aggiorna senza ricreare il callback

  return useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      startRef.current = { mx: e.clientX, my: e.clientY }
      const snap = { ...snapRef.current }   // freeze al click

      const handler = (me: MouseEvent) => {
        if (!startRef.current) return
        const z = zoomRef.current
        onMove({
          x: snap.x + (me.clientX - startRef.current.mx) / z,
          y: snap.y + (me.clientY - startRef.current.my) / z,
        })
      }
      const onUp = () => {
        startRef.current = null
        window.removeEventListener('mousemove', handler)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', handler)
      window.addEventListener('mouseup', onUp)
    },
    [zoomRef, onMove],
  )
}

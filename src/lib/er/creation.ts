import type { Point } from '../../types/er.types'

export type CreatableDiagramNodeType = 'entity' | 'relation'

export const ER_NODE_DRAG_MIME = 'application/er-node-type'

export function randomNodePosition(): Point {
  return {
    x: 200 + Math.random() * 200,
    y: 150 + Math.random() * 200,
  }
}

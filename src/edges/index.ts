// ============================================================
// EDGES — Registro tipi ReactFlow + re-export del package path
// ============================================================
import AssociationEdge    from './AssociationEdge'
import GeneralizationEdge from './GeneralizationEdge'
import AttributeLinkEdge  from './AttributeLinkEdge'

/** Registro dei tipi di arco per ReactFlow */
export const edgeTypes = {
  association:      AssociationEdge,
  generalization:   GeneralizationEdge,
  'attribute-link': AttributeLinkEdge,
} as const

// Re-export del package condiviso per chi importa da 'edges'
// (compatibilità backward — preferire import diretto da '@lib/path')
export { FloatingEdge }         from './FloatingEdge'
export type { FloatingEdgeProps } from './FloatingEdge'
export * from '../lib/path'

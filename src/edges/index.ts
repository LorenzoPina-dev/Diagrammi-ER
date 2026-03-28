import AssociationEdge    from './AssociationEdge'
import GeneralizationEdge from './GeneralizationEdge'
import AttributeLinkEdge  from './AttributeLinkEdge'

/** Registro dei tipi di arco personalizzati per React Flow */
export const edgeTypes = {
  association:      AssociationEdge,
  generalization:   GeneralizationEdge,
  'attribute-link': AttributeLinkEdge,
} as const

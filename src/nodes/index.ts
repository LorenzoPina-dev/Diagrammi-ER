import EntityNode    from './EntityNode'
import RelationNode  from './RelationNode'
import AttributeNode from './AttributeNode'

/** Registro dei tipi di nodo personalizzati per React Flow */
export const nodeTypes = {
  entity:    EntityNode,
  relation:  RelationNode,
  attribute: AttributeNode,
} as const
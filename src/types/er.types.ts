import type { Edge, Node, Viewport } from 'reactflow'

export type ERNodeType = 'entity' | 'relation' | 'attribute'
export type EREdgeType = 'association' | 'generalization' | 'attribute-link'

export type AttributeKind =
  | 'normal'
  | 'primary-key'
  | 'optional'
  | 'multivalued'
  | 'optional-multi'
  | 'derived'
  | 'composite'
  | 'composite-key'

export type GeneralizationCoverage = 'total' | 'partial'
export type GeneralizationDisjoint = 'exclusive' | 'overlapping'

export interface AttributeData {
  id: string
  name: string
  kind: AttributeKind
  childAttributeIds?: string[]
}

export interface GeneralizationData {
  childIds: string[]
  coverage: GeneralizationCoverage
  disjoint: GeneralizationDisjoint
}

export interface EntityNodeData {
  label: string
  attributes: AttributeData[]
  generalization?: GeneralizationData
}

export interface RelationNodeData {
  label: string
  cardinalities: Record<string, string>
  attributes: AttributeData[]
}

export interface AttributeNodeData {
  label: string
  kind: AttributeKind
  ownerId: string
  childAttributeIds?: string[]
}

export interface AssociationEdgeData {
  cardinality?: string
  waypoints?: Point[]
  labelOffset?: Point
}

export interface AttributeLinkData {
  cardinality?: string
  waypoints?: Point[]
}

export interface GeneralizationEdgeData {
  coverage?: GeneralizationCoverage
  disjoint?: GeneralizationDisjoint
  waypoints?: Point[]
  trunkWaypoints?: Point[]
  trunkLabelOffset?: Point
  junctionOverride?: Point | null
}

export interface Point {
  x: number
  y: number
}

export type ERNodeData = EntityNodeData | RelationNodeData | AttributeNodeData
export type EREdgeData = AssociationEdgeData | AttributeLinkData | GeneralizationEdgeData

export type EntityNode = Node<EntityNodeData> & { type: 'entity' }
export type RelationNode = Node<RelationNodeData> & { type: 'relation' }
export type AttributeNode = Node<AttributeNodeData> & { type: 'attribute' }
export type ERNode = EntityNode | RelationNode | AttributeNode

export type AssociationEdge = Edge<AssociationEdgeData> & { type: 'association' }
export type AttributeLinkEdge = Edge<AttributeLinkData> & { type: 'attribute-link' }
export type GeneralizationEdge = Edge<GeneralizationEdgeData> & { type: 'generalization' }
export type EREdge = AssociationEdge | AttributeLinkEdge | GeneralizationEdge

export interface ERProject {
  version: '1.0'
  name: string
  createdAt: string
  updatedAt: string
  nodes: SerializedNode[]
  edges: SerializedEdge[]
  viewport: Viewport
}

export interface SerializedNode {
  id: string
  type: ERNodeType
  position: Point
  data: ERNodeData
}

export interface SerializedEdge {
  id: string
  type: EREdgeType
  source: string
  target: string
  data?: EREdgeData
}

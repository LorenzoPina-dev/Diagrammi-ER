// ============================================================
// TIPI DI DOMINIO — Notazione ER accademica italiana (Chen)
// ============================================================

/** Tipi di nodo ammessi nel diagramma ER */
export type ERNodeType = 'entity' | 'relation' | 'attribute'

/** Tipi di arco ammessi */
export type EREdgeType = 'association' | 'generalization' | 'attribute-link'

/** Classificazione degli attributi secondo la notazione italiana */
export type AttributeKind =
  | 'normal'      // Pallino vuoto
  | 'primary-key' // Pallino pieno (nero)
  | 'optional'    // Linea tratteggiata verso il pallino

/** Tipo generalizzazione */
export type GeneralizationCoverage = 'total' | 'partial'
export type GeneralizationDisjoint = 'exclusive' | 'overlapping'

// ------------------------------------------------------------
// Strutture dati per i dati embedded nei nodi React Flow
// ------------------------------------------------------------

export interface AttributeData {
  id: string
  name: string
  kind: AttributeKind
}

export interface GeneralizationData {
  childIds: string[]
  coverage: GeneralizationCoverage
  disjoint: GeneralizationDisjoint
}

export interface EntityNodeData {
  label: string
  attributes: AttributeData[]
  /** Generalizzazione in cui questo nodo è PADRE */
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
}

// ------------------------------------------------------------
// Metadati per gli archi
// ------------------------------------------------------------

export interface AssociationEdgeData {
  cardinality?: string
  waypoints?: { x: number; y: number }[]
  labelOffset?: { x: number; y: number }
}

export interface GeneralizationEdgeData {
  coverage?: GeneralizationCoverage
  disjoint?: GeneralizationDisjoint
  waypoints?: { x: number; y: number }[]
  labelOffset?: { x: number; y: number }
}

// ------------------------------------------------------------
// Formato serializzabile per import/export JSON
// ------------------------------------------------------------

export interface ERProject {
  version: '1.0'
  name: string
  createdAt: string
  updatedAt: string
  nodes: SerializedNode[]
  edges: SerializedEdge[]
  viewport: { x: number; y: number; zoom: number }
}

export interface SerializedNode {
  id: string
  type: ERNodeType
  position: { x: number; y: number }
  data: EntityNodeData | RelationNodeData | AttributeNodeData
}

export interface SerializedEdge {
  id: string
  type: EREdgeType
  source: string
  target: string
  data?: AssociationEdgeData | GeneralizationEdgeData
}

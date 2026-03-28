// ============================================================
// TIPI DI DOMINIO — Notazione ER accademica italiana (Chen)
//                   + notazione UML attributi (figura standard)
// ============================================================

export type ERNodeType = 'entity' | 'relation' | 'attribute'
export type EREdgeType = 'association' | 'generalization' | 'attribute-link'

/**
 * Tipi di attributo secondo la notazione UML/ER italiana:
 *
 *   normal           — cerchio vuoto, attributo semplice
 *   primary-key      — cerchio pieno (•), chiave singola
 *   optional         — cerchio vuoto + (0,1) sul link
 *   multivalued      — cerchio vuoto + (1,N) sul link
 *   optional-multi   — cerchio vuoto + (0,N) sul link
 *   derived          — cerchio tratteggiato
 *   composite        — ellisse con label, da cui partono rami figli
 *   composite-key    — pallino pieno da cui partono rami figli (chiave composta)
 */
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

// ── Attributo ────────────────────────────────────────────────
export interface AttributeData {
  id:   string
  name: string
  kind: AttributeKind
  /** Per composite / composite-key: ID dei sotto-attributi */
  childAttributeIds?: string[]
}

// ── Nodi ─────────────────────────────────────────────────────
export interface GeneralizationData {
  childIds: string[]
  coverage: GeneralizationCoverage
  disjoint: GeneralizationDisjoint
}

export interface EntityNodeData {
  label:           string
  attributes:      AttributeData[]
  generalization?: GeneralizationData
}

export interface RelationNodeData {
  label:         string
  cardinalities: Record<string, string>
  attributes:    AttributeData[]
}

export interface AttributeNodeData {
  label:              string
  kind:               AttributeKind
  ownerId:            string
  childAttributeIds?: string[]
}

// ── Archi ─────────────────────────────────────────────────────
export interface AssociationEdgeData {
  cardinality?:  string
  waypoints?:    { x: number; y: number }[]
  labelOffset?:  { x: number; y: number }
}

export interface AttributeLinkData {
  /** Cardinalità mostrata sul link (es. "(1,N)") — per multipli/opzionali */
  cardinality?:  string
  waypoints?:    { x: number; y: number }[]
}

export interface GeneralizationEdgeData {
  coverage?:         GeneralizationCoverage
  disjoint?:         GeneralizationDisjoint
  waypoints?:        { x: number; y: number }[]
  trunkWaypoints?:   { x: number; y: number }[]
  trunkLabelOffset?: { x: number; y: number }
  junctionOverride?: { x: number; y: number }
}

// ── Serializzazione ──────────────────────────────────────────
export interface ERProject {
  version:   '1.0'
  name:       string
  createdAt:  string
  updatedAt:  string
  nodes:      SerializedNode[]
  edges:      SerializedEdge[]
  viewport:   { x: number; y: number; zoom: number }
}

export interface SerializedNode {
  id:       string
  type:     ERNodeType
  position: { x: number; y: number }
  data:     EntityNodeData | RelationNodeData | AttributeNodeData
}

export interface SerializedEdge {
  id:      string
  type:    EREdgeType
  source:  string
  target:  string
  data?:   AssociationEdgeData | AttributeLinkData | GeneralizationEdgeData
}

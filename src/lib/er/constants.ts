import type { AttributeKind } from '../../types/er.types'

export const DEFAULT_PROJECT_NAME = 'Diagramma ER'
export const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 } as const
export const DEFAULT_ASSOCIATION_CARDINALITY = '(1,1)'

export const ATTRIBUTE_ORBIT = 120
export const CHILD_ATTRIBUTE_ORBIT = 80

export const ATTRIBUTE_CARDINALITY_BY_KIND: Partial<Record<AttributeKind, string>> = {
  multivalued: '(1,N)',
  optional: '(0,1)',
  'optional-multi': '(0,N)',
}

export const ATTRIBUTE_KINDS_WITH_CHILDREN = new Set<AttributeKind>([
  'composite',
  'composite-key',
])

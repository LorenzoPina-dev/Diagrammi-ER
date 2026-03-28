// ============================================================
// EDGE — Associazione (cardinalità draggabile + waypoints smart)
// ============================================================
import { memo } from 'react'
import { type EdgeProps } from 'reactflow'
import { FloatingEdge } from './FloatingEdge'
import type { AssociationEdgeData } from '../types/er.types'

const AssociationEdge = memo((props: EdgeProps<AssociationEdgeData>) => {
  const { data, selected } = props

  const labelContent = data?.cardinality ? (
    <span
      style={{
        display:      'inline-block',
        fontSize:     11,
        fontWeight:   700,
        color:        '#94a3b8',
        background:   '#0f172a',
        padding:      '1px 6px',
        borderRadius: 4,
        border:       `1px solid ${selected ? '#93c5fd' : '#334155'}`,
        whiteSpace:   'nowrap',
      }}
    >
      {data.cardinality}
    </span>
  ) : undefined

  return (
    <FloatingEdge
      {...props}
      strokeColor="#475569"
      strokeWidth={1.5}
      interactive={true}
      labelContent={labelContent}
    />
  )
})

AssociationEdge.displayName = 'AssociationEdge'
export default AssociationEdge

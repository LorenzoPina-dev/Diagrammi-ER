import { memo } from 'react'
import { useStore, type EdgeProps, type ReactFlowState } from 'reactflow'
import { ATTRIBUTE_CARDINALITY_BY_KIND } from '../lib/er'
import type { AttributeKind, AttributeLinkData } from '../types/er.types'
import { FloatingEdge } from './FloatingEdge'

const selectNodeInternals = (state: ReactFlowState) => state.nodeInternals

const AttributeLinkEdge = memo((props: EdgeProps<AttributeLinkData>) => {
  const nodeInternals = useStore(selectNodeInternals)
  const targetNode = nodeInternals.get(props.target)
  const kind = targetNode?.data?.kind as AttributeKind | undefined
  const cardinality = props.data?.cardinality ?? (kind ? ATTRIBUTE_CARDINALITY_BY_KIND[kind] : undefined)

  const labelContent = cardinality ? (
    <span
      style={{
        fontSize: 10,
        fontWeight: 500,
        color: '#94a3b8',
        background: 'transparent',
        whiteSpace: 'nowrap',
        fontFamily: 'system-ui, monospace',
      }}
    >
      {cardinality}
    </span>
  ) : undefined

  return (
    <FloatingEdge
      {...props}
      strokeColor="#334155"
      strokeWidth={1}
      interactive={false}
      labelContent={labelContent}
    />
  )
})

AttributeLinkEdge.displayName = 'AttributeLinkEdge'
export default AttributeLinkEdge

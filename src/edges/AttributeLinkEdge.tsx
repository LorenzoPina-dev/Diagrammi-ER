// ============================================================
// EDGE — Collegamento attributo (linea sottile, non interattiva)
// ============================================================
import { memo } from 'react'
import type { EdgeProps } from 'reactflow'
import { FloatingEdge } from './FloatingEdge'

const AttributeLinkEdge = memo((props: EdgeProps) => (
  <FloatingEdge
    {...props}
    strokeColor="#334155"
    strokeWidth={1}
    interactive={false}
  />
))

AttributeLinkEdge.displayName = 'AttributeLinkEdge'
export default AttributeLinkEdge

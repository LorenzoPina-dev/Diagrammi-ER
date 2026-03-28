// ============================================================
// EDGE — Collegamento attributo (notazione UML/ER italiana)
//
// Disegna una linea sottile da entità/relazione al terminale
// dell'attributo. Per i tipi con cardinalità esplicita
// (multivalued, optional, optional-multi) mostra la cardinalità
// vicino al terminale, come da standard UML.
//
// Il rendering usa FloatingEdge per il path con smart-aim,
// aggiungendo la label cardinalità dove necessario.
// ============================================================
import { memo } from 'react'
import type { EdgeProps } from 'reactflow'
import { FloatingEdge } from './FloatingEdge'
import type { AttributeLinkData, AttributeKind } from '../types/er.types'
import { useStore, type ReactFlowState } from 'reactflow'

// Cardinalità standard per tipo di attributo
const CARDINALITY: Partial<Record<AttributeKind, string>> = {
  'multivalued':    '(1,N)',
  'optional':       '(0,1)',
  'optional-multi': '(0,N)',
}

const nodeSelector = (s: ReactFlowState) => s.nodeInternals

const AttributeLinkEdge = memo((props: EdgeProps<AttributeLinkData>) => {
  const nodeInternals = useStore(nodeSelector)
  const tgtNode = nodeInternals.get(props.target)
  const kind    = tgtNode?.data?.kind as AttributeKind | undefined

  // Cardinalità: usa quella nell'edge data se presente, altrimenti quella
  // automatica derivata dal tipo dell'attributo target
  const cardinality = props.data?.cardinality ?? (kind ? CARDINALITY[kind] : undefined)

  const labelContent = cardinality ? (
    <span style={{
      fontSize:     10,
      fontWeight:   500,
      color:        '#94a3b8',
      background:   'transparent',
      whiteSpace:   'nowrap',
      fontFamily:   'system-ui, monospace',
    }}>
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

// ============================================================
// CUSTOM NODE — Attributo (Cerchio)
// Handle unico centrale per il floating edge
// ============================================================
import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { AttributeNodeData } from '../types/er.types'

const R = 22 // raggio cerchio

const AttributeNode = memo(({ data, selected }: NodeProps<AttributeNodeData>) => {
  const isPK       = data.kind === 'primary-key'
  const isOptional = data.kind === 'optional'

  const fill       = isPK ? '#14532d' : '#0f172a'
  const stroke     = isPK ? '#22c55e' : isOptional ? '#6b7280' : '#22c55e'
  const strokeDash = isOptional ? '4 3' : undefined
  const glow       = selected ? `0 0 8px ${stroke}99` : 'none'

  return (
    <div style={{ width: R * 2, height: R * 2, position: 'relative' }}>
      <svg
        width={R * 2}
        height={R * 2}
        style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
      >
        <circle
          cx={R}
          cy={R}
          r={R - 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={isPK ? 3 : 2}
          strokeDasharray={strokeDash}
          style={{ filter: glow, transition: 'filter 0.2s' }}
        />
        {isPK && <circle cx={R} cy={R} r={5} fill="#22c55e" />}
      </svg>

      {/* Label sopra il cerchio */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          left: '50%',
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap',
          fontSize: 11,
          color: '#cbd5e1',
          fontWeight: isPK ? 700 : 400,
          textDecoration: isPK ? 'underline' : 'none',
          pointerEvents: 'none',
        }}
      >
        {data.label}
      </div>

      {/* Handle centrale — il FloatingEdge troverà il bordo del cerchio */}
      <Handle
        type="source"
        position={Position.Left}
        id="center"
        style={hiddenHandleStyle}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="center"
        style={hiddenHandleStyle}
      />
    </div>
  )
})

const hiddenHandleStyle: React.CSSProperties = {
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 1,
  height: 1,
  background: 'transparent',
  border: 'none',
  opacity: 0,
  pointerEvents: 'all',
}

AttributeNode.displayName = 'AttributeNode'
export default AttributeNode

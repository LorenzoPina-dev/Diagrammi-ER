// ============================================================
// CUSTOM NODE — Relazione (Rombo viola)
//
// Handle invisibili sui 4 vertici del rombo.
// Nessun puntino visibile al hover: il collegamento si avvia
// cliccando sul nodo e trascinando verso il target.
// ============================================================
import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { RelationNodeData } from '../types/er.types'

const SIZE = 120

const RelationNode = memo(({ data, selected }: NodeProps<RelationNodeData>) => {
  const strokeColor = selected ? '#c084fc' : '#a855f7'

  return (
    <div
      style={{ width: SIZE, height: SIZE, position: 'relative' }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <polygon
          points={`${SIZE / 2},4 ${SIZE - 4},${SIZE / 2} ${SIZE / 2},${SIZE - 4} 4,${SIZE / 2}`}
          fill="#3b1f5e"
          stroke={strokeColor}
          strokeWidth={2}
          style={{
            filter:     selected ? `drop-shadow(0 0 8px ${strokeColor}99)` : 'none',
            transition: 'filter 0.2s',
          }}
        />
        <text
          x={SIZE / 2}
          y={SIZE / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#e2e8f0"
          fontSize={12}
          fontWeight={700}
          fontFamily="system-ui"
        >
          {data.label.length > 12 ? data.label.slice(0, 11) + '…' : data.label}
        </text>
      </svg>

      {/* ── Handle invisibili sui 4 vertici del rombo ── */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={{ ...hiddenHandleStyle, top: 4, left: '50%', transform: 'translateX(-50%)' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ ...hiddenHandleStyle, right: 4, top: '50%', transform: 'translateY(-50%)' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ ...hiddenHandleStyle, bottom: 4, left: '50%', transform: 'translateX(-50%)' }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ ...hiddenHandleStyle, left: 4, top: '50%', transform: 'translateY(-50%)' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-t"
        style={{ ...hiddenHandleStyle, top: 4, left: '50%', transform: 'translateX(-50%)' }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-t"
        style={{ ...hiddenHandleStyle, right: 4, top: '50%', transform: 'translateY(-50%)' }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-t"
        style={{ ...hiddenHandleStyle, bottom: 4, left: '50%', transform: 'translateX(-50%)' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-t"
        style={{ ...hiddenHandleStyle, left: 4, top: '50%', transform: 'translateY(-50%)' }}
      />
    </div>
  )
})

const hiddenHandleStyle: React.CSSProperties = {
  position:      'absolute',
  width:         12,
  height:        12,
  background:    'transparent',
  border:        'none',
  opacity:       0,
  pointerEvents: 'all',
}

RelationNode.displayName = 'RelationNode'
export default RelationNode

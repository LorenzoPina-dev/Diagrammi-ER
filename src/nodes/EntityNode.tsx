// ============================================================
// CUSTOM NODE — Entità (Rettangolo blu)
//
// Handle: unico centrale invisibile per il FloatingEdge.
// I puntini hover sono rimossi: il collegamento si avvia
// cliccando direttamente sul nodo e trascinando.
// ============================================================
import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { EntityNodeData } from '../types/er.types'

const EntityNode = memo(({ data, selected }: NodeProps<EntityNodeData>) => {
  const borderColor = selected ? '#60a5fa' : '#3b82f6'

  return (
    <div
      style={{
        border:       `2px solid ${borderColor}`,
        background:   '#1e3a5f',
        borderRadius: 6,
        minWidth:     140,
        boxShadow:    selected
          ? `0 0 12px ${borderColor}66`
          : '0 4px 12px #00000066',
        transition:   'box-shadow 0.2s, border-color 0.2s',
        position:     'relative',
      }}
    >
      {/* ── Label ── */}
      <div
        style={{
          padding:       '8px 16px',
          textAlign:     'center',
          fontWeight:    700,
          fontSize:      14,
          color:         '#e2e8f0',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {data.label}
      </div>

      {/* ── Handle invisibili su tutti i lati per avviare il drag-to-connect ── */}
      <Handle type="source" position={Position.Top}    id="top"    style={hiddenHandleStyle} />
      <Handle type="source" position={Position.Right}  id="right"  style={hiddenHandleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={hiddenHandleStyle} />
      <Handle type="source" position={Position.Left}   id="left"   style={hiddenHandleStyle} />
      <Handle type="target" position={Position.Top}    id="top-t"  style={hiddenHandleStyle} />
      <Handle type="target" position={Position.Right}  id="right-t" style={hiddenHandleStyle} />
      <Handle type="target" position={Position.Bottom} id="bottom-t" style={hiddenHandleStyle} />
      <Handle type="target" position={Position.Left}   id="left-t"  style={hiddenHandleStyle} />
    </div>
  )
})

const hiddenHandleStyle: React.CSSProperties = {
  width:         10,
  height:        10,
  background:    'transparent',
  border:        'none',
  opacity:       0,
  pointerEvents: 'all',
}

EntityNode.displayName = 'EntityNode'
export default EntityNode

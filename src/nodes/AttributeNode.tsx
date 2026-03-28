// ============================================================
// CUSTOM NODE — Attributo (notazione UML/ER italiana)
//
// Il nodo rappresenta solo il TERMINALE dell'attributo:
//   normal / optional / multivalued / optional-multi / derived
//     → cerchio vuoto (o tratteggiato per derived)
//   primary-key
//     → cerchio pieno •
//   composite
//     → ellisse con nome dell'attributo al centro
//   composite-key
//     → cerchio pieno grande (junction di una chiave composta)
//
// La linea di collegamento e l'eventuale cardinalità "(1,N)"
// sono disegnate da AttributeLinkEdge.
// ============================================================
import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { AttributeNodeData, AttributeKind } from '../types/er.types'

// ─── Costanti visive ─────────────────────────────────────────
const R = 8           // raggio cerchio terminale standard
const R_PK = 8        // raggio chiave primaria (cerchio pieno)
const R_CK = 10       // raggio junction chiave composta
const COMPOSITE_RX = 28  // semiasse X ellisse composta
const COMPOSITE_RY = 14  // semiasse Y ellisse composta

// Colori per tipo
const COLOR = {
  normal:         '#22c55e',
  'primary-key':  '#22c55e',
  optional:       '#94a3b8',
  multivalued:    '#38bdf8',
  'optional-multi': '#94a3b8',
  derived:        '#94a3b8',
  composite:      '#818cf8',
  'composite-key': '#22c55e',
} as const satisfies Record<AttributeKind, string>

// ─── Handle nascosto centrale ─────────────────────────────────
const hiddenHandle: React.CSSProperties = {
  top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 1, height: 1,
  background: 'transparent', border: 'none',
  opacity: 0, pointerEvents: 'all',
}

// ─── Rendering per tipo ───────────────────────────────────────

function renderTerminal(kind: AttributeKind, label: string, selected: boolean) {
  const color = COLOR[kind]
  const glow  = selected ? `0 0 6px ${color}bb` : 'none'

  switch (kind) {

    // ── Cerchio pieno — chiave primaria ──────────────────────
    case 'primary-key':
      return (
        <svg width={R_PK*2} height={R_PK*2} style={{ overflow: 'visible' }}>
          <circle cx={R_PK} cy={R_PK} r={R_PK}
            fill={color} stroke="none"
            style={{ filter: glow, transition: 'filter 0.2s' }}
          />
          {/* label sotto */}
          <text x={R_PK} y={R_PK*2 + 12}
            textAnchor="middle" fontSize={10} fill={color}
            fontWeight={700} textDecoration="underline"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >{label}</text>
        </svg>
      )

    // ── Cerchio pieno grande — junction chiave composta ──────
    case 'composite-key':
      return (
        <svg width={R_CK*2} height={R_CK*2} style={{ overflow: 'visible' }}>
          <circle cx={R_CK} cy={R_CK} r={R_CK}
            fill={color} stroke="none"
            style={{ filter: glow, transition: 'filter 0.2s' }}
          />
        </svg>
      )

    // ── Ellisse — attributo composto ─────────────────────────
    case 'composite': {
      const w = COMPOSITE_RX * 2
      const h = COMPOSITE_RY * 2
      return (
        <svg width={w} height={h} style={{ overflow: 'visible' }}>
          <ellipse cx={COMPOSITE_RX} cy={COMPOSITE_RY}
            rx={COMPOSITE_RX - 2} ry={COMPOSITE_RY - 2}
            fill="#1e1b4b" stroke={color} strokeWidth={1.5}
            style={{ filter: glow, transition: 'filter 0.2s' }}
          />
          <text x={COMPOSITE_RX} y={COMPOSITE_RY}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fill={color} fontWeight={600}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >{label}</text>
        </svg>
      )
    }

    // ── Cerchio tratteggiato — derivato ──────────────────────
    case 'derived':
      return (
        <svg width={R*2} height={R*2} style={{ overflow: 'visible' }}>
          <circle cx={R} cy={R} r={R - 1}
            fill="#0f172a" stroke={color} strokeWidth={1.5}
            strokeDasharray="3 2"
            style={{ filter: glow, transition: 'filter 0.2s' }}
          />
          <text x={R} y={R*2 + 12}
            textAnchor="middle" fontSize={10} fill={color}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >{label}</text>
        </svg>
      )

    // ── Cerchio vuoto — normal / optional / multivalued / optional-multi
    default:
      return (
        <svg width={R*2} height={R*2} style={{ overflow: 'visible' }}>
          <circle cx={R} cy={R} r={R - 1}
            fill="#0f172a" stroke={color} strokeWidth={1.5}
            style={{ filter: glow, transition: 'filter 0.2s' }}
          />
          <text x={R} y={R*2 + 12}
            textAnchor="middle" fontSize={10} fill={color}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >{label}</text>
        </svg>
      )
  }
}

// ─── Dimensioni del nodo per tipo ─────────────────────────────
function nodeSize(kind: AttributeKind): { w: number; h: number } {
  if (kind === 'composite')    return { w: COMPOSITE_RX*2, h: COMPOSITE_RY*2 }
  if (kind === 'composite-key') return { w: R_CK*2,        h: R_CK*2 }
  if (kind === 'primary-key')  return { w: R_PK*2,         h: R_PK*2 }
  return { w: R*2, h: R*2 }
}

// ─── Componente ───────────────────────────────────────────────
const AttributeNode = memo(({ data, selected }: NodeProps<AttributeNodeData>) => {
  const { w, h } = nodeSize(data.kind)
  return (
    <div style={{ width: w, height: h, position: 'relative' }}>
      {renderTerminal(data.kind, data.label, !!selected)}
      <Handle type="source" position={Position.Left} id="c" style={hiddenHandle} />
      <Handle type="target" position={Position.Left} id="c" style={hiddenHandle} />
    </div>
  )
})

AttributeNode.displayName = 'AttributeNode'
export default AttributeNode

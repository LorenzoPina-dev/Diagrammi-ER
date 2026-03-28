// ============================================================
// PANEL — Proprietà Relazione
// ============================================================
import { useState, useRef, type KeyboardEvent } from 'react'
import type { Node } from 'reactflow'
import { Trash2, Key, Circle, Minus, Link2, Unlink, Plus, RefreshCw, Layers, Hash, Sigma, KeyRound } from 'lucide-react'
import { useDiagramStore } from '../../store/diagramStore'
import type { RelationNodeData, AttributeData, AttributeKind } from '../../types/er.types'

interface Props { node: Node<RelationNodeData> }

const CARDINALITY_PRESETS = ['(1,1)', '(1,N)', '(0,1)', '(0,N)', '(N,N)']

const ATTR_KIND_OPTIONS: { kind: AttributeKind; label: string; icon: React.ReactNode }[] = [
  { kind: 'normal',         label: 'Semplice',    icon: <Circle   size={12} /> },
  { kind: 'primary-key',    label: 'Chiave (PK)', icon: <Key      size={12} /> },
  { kind: 'optional',       label: '(0,1)',        icon: <Minus    size={12} /> },
  { kind: 'multivalued',    label: '(1,N)',        icon: <Hash     size={12} /> },
  { kind: 'optional-multi', label: '(0,N)',        icon: <Hash     size={12} /> },
  { kind: 'derived',        label: 'Derivato',    icon: <Sigma    size={12} /> },
  { kind: 'composite',      label: 'Composto',    icon: <Layers   size={12} /> },
  { kind: 'composite-key',  label: 'Chiave comp.',icon: <KeyRound size={12} /> },
]

function AttrKindIcon({ kind }: { kind: AttributeKind }) {
  switch (kind) {
    case 'primary-key':    return <Key      size={12} className="text-green-400" />
    case 'optional':       return <Minus    size={12} className="text-gray-400" />
    case 'multivalued':    return <Hash     size={12} className="text-sky-400" />
    case 'optional-multi': return <Hash     size={12} className="text-gray-500" />
    case 'derived':        return <Sigma    size={12} className="text-gray-400" />
    case 'composite':      return <Layers   size={12} className="text-indigo-400" />
    case 'composite-key':  return <KeyRound size={12} className="text-green-400" />
    default:               return <Circle   size={12} className="text-green-500" />
  }
}

export default function RelationPanel({ node }: Props) {
  const {
    nodes, edges,
    updateRelationLabel, addAttributeToRelation,
    setCardinality, connectRelationToEntity, disconnectRelationFromEntity,
  } = useDiagramStore()

  const [attrName,       setAttrName]       = useState('')
  const [attrKind,       setAttrKind]       = useState<AttributeKind>('normal')
  const [newCardinality, setNewCardinality] = useState('(1,1)')
  const [selectedEntity, setSelectedEntity] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const allEntities    = nodes.filter((n) => n.type === 'entity')
  const connectedEdges = edges.filter(
    (e) => e.type === 'association' && (e.source === node.id || e.target === node.id),
  )
  const entityOccurrences = connectedEdges.reduce<Record<string, number>>((acc, edge) => {
    const eid = edge.source === node.id ? edge.target : edge.source
    acc[eid]  = (acc[eid] ?? 0) + 1
    return acc
  }, {})

  const getEntityLabel = (src: string, tgt: string) => {
    const eid = src === node.id ? tgt : src
    return nodes.find((n) => n.id === eid)?.data?.label ?? eid
  }

  const handleAddAttr = () => {
    if (!attrName.trim()) return
    addAttributeToRelation(node.id, { name: attrName.trim(), kind: attrKind })
    setAttrName('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-4 p-4">

      <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
        <div className="w-3 h-3 rotate-45 bg-purple-500" />
        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Relazione</span>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Nome</label>
        <input type="text" value={node.data.label}
          onChange={(e) => updateRelationLabel(node.id, e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
        />
      </div>

      {/* ── Entità collegate ─────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 flex items-center gap-1">
          <Link2 size={11} /> Entità collegate ({connectedEdges.length})
        </label>
        {connectedEdges.length === 0 && (
          <p className="text-xs text-gray-600 italic px-1">Nessuna entità collegata</p>
        )}
        <ul className="space-y-1">
          {connectedEdges.map((edge) => {
            const eid    = edge.source === node.id ? edge.target : edge.source
            const name   = getEntityLabel(edge.source, edge.target)
            const card   = edge.data?.cardinality ?? '(1,1)'
            const isSelf = (entityOccurrences[eid] ?? 0) > 1
            return (
              <li key={edge.id} className={`flex items-center gap-2 rounded px-2 py-2 ${isSelf ? 'bg-amber-950/40 border border-amber-800/40' : 'bg-gray-800'}`}>
                {isSelf && <RefreshCw size={11} className="text-amber-500 flex-shrink-0" />}
                <span className="flex-1 text-sm text-gray-200 truncate font-medium">{name}</span>
                <select value={card} onChange={(e) => setCardinality(edge.id, e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs text-gray-200 focus:border-purple-500 focus:outline-none cursor-pointer">
                  {CARDINALITY_PRESETS.map((c) => <option key={c} value={c}>{c}</option>)}
                  {!CARDINALITY_PRESETS.includes(card) && <option value={card}>{card}</option>}
                </select>
                <button onClick={() => disconnectRelationFromEntity(edge.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                  <Unlink size={13} />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* ── Form collegamento ────────────────────────────── */}
      <div className="space-y-2 border border-gray-800 rounded-lg p-3 bg-gray-900/50">
        <p className="text-xs text-gray-400 font-medium flex items-center gap-1"><Plus size={11} /> Collega entità</p>
        {allEntities.length === 0
          ? <p className="text-xs text-gray-600 italic">Nessuna entità nel diagramma</p>
          : (
            <>
              <select value={selectedEntity} onChange={(e) => setSelectedEntity(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none">
                <option value="">Scegli entità…</option>
                {allEntities.map((n) => {
                  const occ = entityOccurrences[n.id] ?? 0
                  return <option key={n.id} value={n.id}>{n.data.label}{occ > 0 ? ` (già ×${occ})` : ''}</option>
                })}
              </select>
              {selectedEntity && (entityOccurrences[selectedEntity] ?? 0) > 0 && (
                <p className="text-xs text-amber-500/80 flex items-center gap-1"><RefreshCw size={10} /> Self-relation</p>
              )}
              <div className="flex flex-wrap gap-1">
                {CARDINALITY_PRESETS.map((c) => (
                  <button key={c} onClick={() => setNewCardinality(c)}
                    className={`px-2 py-0.5 rounded text-xs font-mono font-medium border transition-colors ${
                      newCardinality === c ? 'bg-purple-600 border-purple-500 text-white'
                                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}>{c}</button>
                ))}
              </div>
              <input type="text" value={newCardinality} onChange={(e) => setNewCardinality(e.target.value)}
                placeholder="Custom…"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100 focus:border-purple-500 focus:outline-none font-mono"
              />
              <button onClick={() => { if (selectedEntity) connectRelationToEntity(node.id, selectedEntity, newCardinality) }}
                disabled={!selectedEntity}
                className="w-full py-2 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors flex items-center justify-center gap-2">
                <Link2 size={14} /> Collega
              </button>
            </>
          )
        }
      </div>

      {/* ── Attributi ────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400">Attributi relazione <span className="text-gray-600">(tipico N-N)</span></label>
        {node.data.attributes.length === 0 && <p className="text-xs text-gray-600 italic">Nessun attributo</p>}
        <ul className="space-y-1">
          {(node.data.attributes as AttributeData[]).map((attr) => (
            <li key={attr.id} className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1.5 text-sm text-gray-200">
              <AttrKindIcon kind={attr.kind} />
              <span className="flex-1">{attr.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2 border-t border-gray-800 pt-3">
        <label className="text-xs text-gray-400">Aggiungi Attributo</label>
        <input ref={inputRef} type="text" value={attrName}
          onChange={(e) => setAttrName(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleAddAttr() }}
          placeholder="Nome attributo…"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none placeholder-gray-600"
        />
        <div className="grid grid-cols-4 gap-1">
          {ATTR_KIND_OPTIONS.map(({ kind, label, icon }) => (
            <button key={kind} onClick={() => setAttrKind(kind)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded text-xs font-medium border transition-colors ${
                attrKind === kind ? 'bg-purple-600 border-purple-500 text-white'
                                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}>
              {icon}
              <span className="truncate text-[10px] leading-tight">{label}</span>
            </button>
          ))}
        </div>
        <button onClick={handleAddAttr} disabled={!attrName.trim()}
          className="w-full py-2 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors">
          Aggiungi (↵)
        </button>
      </div>
    </div>
  )
}

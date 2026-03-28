// ============================================================
// PANEL — Proprietà Entità
// ============================================================
import { useState, useRef, type KeyboardEvent } from 'react'
import type { Node } from 'reactflow'
import { Trash2, Key, Circle, Minus, GitMerge, Layers, Hash, Sigma, KeyRound } from 'lucide-react'
import { useDiagramStore } from '../../store/diagramStore'
import type {
  EntityNodeData, AttributeData, AttributeKind,
  GeneralizationCoverage, GeneralizationDisjoint,
} from '../../types/er.types'

interface Props { node: Node<EntityNodeData> }

// ─── Tipi attributo con UI ────────────────────────────────────
const ATTR_KIND_OPTIONS: { kind: AttributeKind; label: string; icon: React.ReactNode; title: string }[] = [
  { kind: 'normal',         label: 'Semplice',    icon: <Circle   size={12} />, title: 'Attributo semplice' },
  { kind: 'primary-key',    label: 'Chiave (PK)', icon: <Key      size={12} />, title: 'Chiave primaria — cerchio pieno' },
  { kind: 'optional',       label: '(0,1)',        icon: <Minus    size={12} />, title: 'Opzionale — (0,1) sul link' },
  { kind: 'multivalued',    label: '(1,N)',        icon: <Hash     size={12} />, title: 'Multiplo obbligatorio — (1,N) sul link' },
  { kind: 'optional-multi', label: '(0,N)',        icon: <Hash     size={12} />, title: 'Multiplo opzionale — (0,N) sul link' },
  { kind: 'derived',        label: 'Derivato',    icon: <Sigma    size={12} />, title: 'Attributo derivato — cerchio tratteggiato' },
  { kind: 'composite',      label: 'Composto',    icon: <Layers   size={12} />, title: 'Attributo composto — ellisse con figli' },
  { kind: 'composite-key',  label: 'Chiave comp.',icon: <KeyRound size={12} />, title: 'Chiave composta — pallino pieno con figli' },
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

const HAS_CHILDREN = new Set<AttributeKind>(['composite', 'composite-key'])

export default function EntityPanel({ node }: Props) {
  const {
    nodes, updateEntityLabel,
    addAttributeToEntity, removeAttributeFromEntity,
    addChildAttribute, setGeneralization,
  } = useDiagramStore()

  const [attrName, setAttrName]         = useState('')
  const [attrKind, setAttrKind]         = useState<AttributeKind>('normal')
  const [expandedId, setExpandedId]     = useState<string | null>(null)
  const [childAttrName, setChildAttrName] = useState('')
  const inputRef      = useRef<HTMLInputElement>(null)
  const childInputRef = useRef<HTMLInputElement>(null)

  const entityNodes     = nodes.filter((n) => n.type === 'entity' && n.id !== node.id)
  const gen             = node.data.generalization
  const currentChildIds = gen?.childIds   ?? []
  const currentCoverage = gen?.coverage   ?? 'partial'
  const currentDisjoint = gen?.disjoint   ?? 'exclusive'

  const handleAddAttr = () => {
    if (!attrName.trim()) return
    addAttributeToEntity(node.id, { name: attrName.trim(), kind: attrKind })
    setAttrName('')
    inputRef.current?.focus()
  }

  const handleAddChildAttr = (parentId: string) => {
    if (!childAttrName.trim()) return
    addChildAttribute(parentId, { name: childAttrName.trim(), kind: 'normal' })
    setChildAttrName('')
    childInputRef.current?.focus()
  }

  const toggleChild = (childId: string) => {
    const newIds = currentChildIds.includes(childId)
      ? currentChildIds.filter((id) => id !== childId)
      : [...currentChildIds, childId]
    setGeneralization(node.id, newIds, currentCoverage, currentDisjoint)
  }

  return (
    <div className="flex flex-col gap-4 p-4">

      {/* ── Intestazione ─────────────────────────────────── */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
        <div className="w-3 h-3 rounded-sm bg-blue-500" />
        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Entità</span>
      </div>

      {/* ── Nome ─────────────────────────────────────────── */}
      <div className="space-y-1">
        <label className="text-xs text-gray-400">Nome</label>
        <input type="text" value={node.data.label}
          onChange={(e) => updateEntityLabel(node.id, e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* ── Generalizzazione ─────────────────────────────── */}
      <div className="space-y-2 border-t border-gray-800 pt-3">
        <div className="flex items-center gap-2">
          <GitMerge size={13} className="text-amber-400" />
          <label className="text-xs text-amber-400 uppercase tracking-wider font-medium">Generalizzazione (Padre)</label>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400">Entità figlie</label>
          {entityNodes.length === 0
            ? <p className="text-xs text-gray-600 italic">Nessun'altra entità nel diagramma</p>
            : (
              <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                {entityNodes.map((en) => {
                  const checked = currentChildIds.includes(en.id)
                  return (
                    <label key={en.id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${
                      checked ? 'bg-amber-900/40 border border-amber-700 text-amber-200'
                              : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-500'
                    }`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleChild(en.id)} className="accent-amber-500" />
                      {en.data.label}
                    </label>
                  )
                })}
              </div>
            )
          }
        </div>

        <div className="flex gap-1">
          {(['total', 'partial'] as GeneralizationCoverage[]).map((v) => (
            <button key={v} onClick={() => setGeneralization(node.id, currentChildIds, v, currentDisjoint)}
              className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                currentCoverage === v ? 'bg-amber-600 border-amber-500 text-white'
                                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}>
              {v === 'total' ? 'Totale (t)' : 'Parziale (p)'}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['exclusive', 'overlapping'] as GeneralizationDisjoint[]).map((v) => (
            <button key={v} onClick={() => setGeneralization(node.id, currentChildIds, currentCoverage, v)}
              className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                currentDisjoint === v ? 'bg-amber-600 border-amber-500 text-white'
                                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}>
              {v === 'exclusive' ? 'Esclusiva (e)' : 'Non escl. (ne)'}
            </button>
          ))}
        </div>

        {currentChildIds.length > 0 && (
          <>
            <button onClick={() => setGeneralization(node.id, [], currentCoverage, currentDisjoint)}
              className="w-full py-1.5 rounded bg-red-900/50 hover:bg-red-800/60 border border-red-800 text-xs text-red-300 transition-colors">
              Rimuovi generalizzazione
            </button>
            <div className="text-xs text-gray-500 italic text-center">
              ({currentCoverage === 'total' ? 't' : 'p'}, {currentDisjoint === 'exclusive' ? 'e' : 'ne'})
            </div>
          </>
        )}
      </div>

      {/* ── Lista attributi ──────────────────────────────── */}
      <div className="space-y-2 border-t border-gray-800 pt-3">
        <label className="text-xs text-gray-400">Attributi ({node.data.attributes.length})</label>
        {node.data.attributes.length === 0 && <p className="text-xs text-gray-600 italic">Nessun attributo</p>}
        <ul className="space-y-1">
          {(node.data.attributes as AttributeData[]).map((attr) => (
            <li key={attr.id}>
              <div className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1.5 text-sm text-gray-200">
                <AttrKindIcon kind={attr.kind} />
                <span className={`flex-1 ${attr.kind === 'primary-key' ? 'font-bold underline' : ''}`}>
                  {attr.name}
                </span>
                {HAS_CHILDREN.has(attr.kind) && (
                  <button title="Aggiungi sotto-attributi"
                    onClick={() => setExpandedId(expandedId === attr.id ? null : attr.id)}
                    className={`text-indigo-400 hover:text-indigo-300 transition-colors ${expandedId === attr.id ? 'opacity-100' : 'opacity-40'}`}>
                    <Layers size={12} />
                  </button>
                )}
                <button onClick={() => removeAttributeFromEntity(node.id, attr.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>

              {HAS_CHILDREN.has(attr.kind) && expandedId === attr.id && (
                <div className="ml-4 mt-1 p-2 bg-indigo-950/30 border border-indigo-900/50 rounded space-y-1">
                  <p className="text-xs text-indigo-400">
                    {attr.kind === 'composite-key' ? 'Attributi della chiave' : 'Sotto-attributi'} di «{attr.name}»
                  </p>
                  <div className="flex gap-1">
                    <input ref={childInputRef} type="text" value={childAttrName}
                      onChange={(e) => setChildAttrName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddChildAttr(attr.id) }}
                      placeholder="Nome…"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100 focus:border-indigo-500 focus:outline-none placeholder-gray-600"
                    />
                    <button onClick={() => handleAddChildAttr(attr.id)} disabled={!childAttrName.trim()}
                      className="px-2 py-1 rounded bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-xs text-white transition-colors">
                      +
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Form aggiunta attributo ───────────────────────── */}
      <div className="space-y-2 border-t border-gray-800 pt-3">
        <label className="text-xs text-gray-400">Aggiungi Attributo</label>
        <input ref={inputRef} type="text" value={attrName}
          onChange={(e) => setAttrName(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleAddAttr() }}
          placeholder="Nome attributo…"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none placeholder-gray-600"
        />
        {/* Griglia 4×2 */}
        <div className="grid grid-cols-4 gap-1">
          {ATTR_KIND_OPTIONS.map(({ kind, label, icon, title }) => (
            <button key={kind} title={title} onClick={() => setAttrKind(kind)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded text-xs font-medium border transition-colors ${
                attrKind === kind ? 'bg-blue-600 border-blue-500 text-white'
                                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}>
              {icon}
              <span className="truncate text-[10px] leading-tight">{label}</span>
            </button>
          ))}
        </div>
        <button onClick={handleAddAttr} disabled={!attrName.trim()}
          className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors">
          Aggiungi (↵)
        </button>
      </div>
    </div>
  )
}

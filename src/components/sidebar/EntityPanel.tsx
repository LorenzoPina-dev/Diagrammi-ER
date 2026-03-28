// ============================================================
// PANEL — Proprietà Entità
// ============================================================
import { useState, useRef, type KeyboardEvent } from 'react'
import type { Node } from 'reactflow'
import { Trash2, Key, Circle, Minus, GitMerge } from 'lucide-react'
import { useDiagramStore }   from '../../store/diagramStore'
import type {
  EntityNodeData,
  AttributeData,
  AttributeKind,
  GeneralizationCoverage,
  GeneralizationDisjoint,
} from '../../types/er.types'

interface Props { node: Node<EntityNodeData> }

export default function EntityPanel({ node }: Props) {
  const {
    nodes,
    updateEntityLabel,
    addAttributeToEntity,
    removeAttributeFromEntity,
    setGeneralization,
  } = useDiagramStore()

  const [attrName, setAttrName] = useState('')
  const [attrKind, setAttrKind] = useState<AttributeKind>('normal')
  const inputRef = useRef<HTMLInputElement>(null)

  // Tutti i nodi entità tranne sé stesso e quelli già figli di altri
  const entityNodes = nodes.filter((n) => n.type === 'entity' && n.id !== node.id)

  // Stato corrente della generalizzazione di questo nodo come PADRE
  const gen = node.data.generalization
  const currentChildIds   = gen?.childIds   ?? []
  const currentCoverage   = gen?.coverage   ?? 'partial'
  const currentDisjoint   = gen?.disjoint   ?? 'exclusive'

  const handleAddAttr = () => {
    if (!attrName.trim()) return
    addAttributeToEntity(node.id, { name: attrName.trim(), kind: attrKind })
    setAttrName('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAddAttr()
  }

  // Toggle figlio nella lista
  const toggleChild = (childId: string) => {
    const newIds = currentChildIds.includes(childId)
      ? currentChildIds.filter((id) => id !== childId)
      : [...currentChildIds, childId]
    setGeneralization(node.id, newIds, currentCoverage, currentDisjoint)
  }

  const setCoverage = (c: GeneralizationCoverage) => {
    setGeneralization(node.id, currentChildIds, c, currentDisjoint)
  }

  const setDisjoint = (d: GeneralizationDisjoint) => {
    setGeneralization(node.id, currentChildIds, currentCoverage, d)
  }

  const clearGeneralization = () => {
    setGeneralization(node.id, [], currentCoverage, currentDisjoint)
  }

  const kindIcon = (kind: AttributeKind) => {
    if (kind === 'primary-key') return <Key size={12} className="text-green-400" />
    if (kind === 'optional')    return <Minus size={12} className="text-gray-400" />
    return <Circle size={12} className="text-green-500" />
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Intestazione */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
        <div className="w-3 h-3 rounded-sm bg-blue-500" />
        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Entità</span>
      </div>

      {/* Nome */}
      <div className="space-y-1">
        <label className="text-xs text-gray-400">Nome</label>
        <input
          type="text"
          value={node.data.label}
          onChange={(e) => updateEntityLabel(node.id, e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* ── Generalizzazione (questo nodo come PADRE) ─────────── */}
      <div className="space-y-2 border-t border-gray-800 pt-3">
        <div className="flex items-center gap-2">
          <GitMerge size={13} className="text-amber-400" />
          <label className="text-xs text-amber-400 uppercase tracking-wider font-medium">
            Generalizzazione (Padre)
          </label>
        </div>

        {/* Selezione figli */}
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Entità figlie</label>
          {entityNodes.length === 0 && (
            <p className="text-xs text-gray-600 italic">Nessun'altra entità nel diagramma</p>
          )}
          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
            {entityNodes.map((en) => {
              const checked = currentChildIds.includes(en.id)
              return (
                <label
                  key={en.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${
                    checked
                      ? 'bg-amber-900/40 border border-amber-700 text-amber-200'
                      : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleChild(en.id)}
                    className="accent-amber-500"
                  />
                  {en.data.label}
                </label>
              )
            })}
          </div>
        </div>

        {/* Tipo di copertura */}
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Copertura</label>
          <div className="flex gap-1">
            {([
              { val: 'total'   as GeneralizationCoverage, label: 'Totale (t)' },
              { val: 'partial' as GeneralizationCoverage, label: 'Parziale (p)' },
            ]).map(({ val, label }) => (
              <button
                key={val}
                onClick={() => setCoverage(val)}
                className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                  currentCoverage === val
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tipo disgiunzione */}
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Disgiunzione</label>
          <div className="flex gap-1">
            {([
              { val: 'exclusive'   as GeneralizationDisjoint, label: 'Esclusiva (e)' },
              { val: 'overlapping' as GeneralizationDisjoint, label: 'Non escl. (ne)' },
            ]).map(({ val, label }) => (
              <button
                key={val}
                onClick={() => setDisjoint(val)}
                className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                  currentDisjoint === val
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Pulsante reset */}
        {currentChildIds.length > 0 && (
          <button
            onClick={clearGeneralization}
            className="w-full py-1.5 rounded bg-red-900/50 hover:bg-red-800/60 border border-red-800 text-xs text-red-300 transition-colors"
          >
            Rimuovi generalizzazione
          </button>
        )}

        {/* Anteprima label */}
        {currentChildIds.length > 0 && (
          <div className="text-xs text-gray-500 italic text-center">
            Label: ({currentCoverage === 'total' ? 't' : 'p'}, {currentDisjoint === 'exclusive' ? 'e' : 'ne'})
          </div>
        )}
      </div>

      {/* Attributi esistenti */}
      <div className="space-y-2 border-t border-gray-800 pt-3">
        <label className="text-xs text-gray-400">Attributi ({node.data.attributes.length})</label>
        {node.data.attributes.length === 0 && (
          <p className="text-xs text-gray-600 italic">Nessun attributo</p>
        )}
        <ul className="space-y-1">
          {(node.data.attributes as AttributeData[]).map((attr) => (
            <li key={attr.id} className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1.5 text-sm text-gray-200">
              {kindIcon(attr.kind)}
              <span className={`flex-1 ${attr.kind === 'primary-key' ? 'font-bold underline' : ''}`}>
                {attr.name}
              </span>
              <button
                onClick={() => removeAttributeFromEntity(node.id, attr.id)}
                className="text-gray-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Form aggiunta rapida attributo */}
      <div className="space-y-2 border-t border-gray-800 pt-3">
        <label className="text-xs text-gray-400">Aggiungi Attributo</label>
        <input
          ref={inputRef}
          type="text"
          value={attrName}
          onChange={(e) => setAttrName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nome attributo…"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none placeholder-gray-600"
        />
        <div className="flex gap-1">
          {([
            { kind: 'normal'      as AttributeKind, label: 'Normale', icon: <Circle size={12} /> },
            { kind: 'primary-key' as AttributeKind, label: 'PK',      icon: <Key size={12} /> },
            { kind: 'optional'    as AttributeKind, label: 'Opz.',    icon: <Minus size={12} /> },
          ]).map(({ kind, label, icon }) => (
            <button
              key={kind}
              onClick={() => setAttrKind(kind)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                attrKind === kind
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>
        <button
          onClick={handleAddAttr}
          disabled={!attrName.trim()}
          className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
        >
          Aggiungi (↵ Enter)
        </button>
      </div>
    </div>
  )
}

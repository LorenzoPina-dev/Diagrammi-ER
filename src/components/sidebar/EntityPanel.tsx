// ============================================================
// PANEL — Proprietà Entità
// ============================================================
import { useState, useRef, type KeyboardEvent } from 'react'
import type { Node } from 'reactflow'
import { Trash2, Key, Circle, Minus } from 'lucide-react'
import { useDiagramStore }   from '../../store/diagramStore'
import type { EntityNodeData, AttributeData, AttributeKind } from '../../types/er.types'

interface Props { node: Node<EntityNodeData> }

export default function EntityPanel({ node }: Props) {
  const {
    nodes,
    updateEntityLabel,
    addAttributeToEntity,
    removeAttributeFromEntity,
    setEntityParent,
  } = useDiagramStore()

  const [attrName, setAttrName] = useState('')
  const [attrKind, setAttrKind] = useState<AttributeKind>('normal')
  const inputRef = useRef<HTMLInputElement>(null)

  const entityNodes = nodes.filter((n) => n.type === 'entity' && n.id !== node.id)

  const handleAddAttr = () => {
    if (!attrName.trim()) return
    addAttributeToEntity(node.id, { name: attrName.trim(), kind: attrKind })
    setAttrName('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAddAttr()
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

      {/* Classe Padre (Generalizzazione) */}
      <div className="space-y-1">
        <label className="text-xs text-gray-400">Generalizza da (Padre)</label>
        <select
          value={node.data.parentEntityId ?? ''}
          onChange={(e) => setEntityParent(node.id, e.target.value || undefined)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        >
          <option value="">— Nessuno —</option>
          {entityNodes.map((n) => (
            <option key={n.id} value={n.id}>{n.data.label}</option>
          ))}
        </select>
      </div>

      {/* Attributi esistenti */}
      <div className="space-y-2">
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
        {/* Selezione tipo attributo */}
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
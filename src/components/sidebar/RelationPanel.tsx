// ============================================================
// PANEL — Proprietà Relazione
//
// Permette di:
//   - Rinominare la relazione
//   - Collegare/scollegare entità con cardinalità configurabile
//   - Collegare la stessa entità più volte (self-relation)
//   - Aggiungere attributi (per relazioni N-N)
// ============================================================
import { useState, useRef, type KeyboardEvent } from 'react'
import type { Node } from 'reactflow'
import { Trash2, Key, Circle, Minus, Link2, Unlink, Plus, RefreshCw } from 'lucide-react'
import { useDiagramStore } from '../../store/diagramStore'
import type { RelationNodeData, AttributeData, AttributeKind } from '../../types/er.types'

interface Props { node: Node<RelationNodeData> }

const CARDINALITY_PRESETS = ['(1,1)', '(1,N)', '(0,1)', '(0,N)', '(N,N)']

export default function RelationPanel({ node }: Props) {
  const {
    nodes,
    edges,
    updateRelationLabel,
    addAttributeToRelation,
    setCardinality,
    connectRelationToEntity,
    disconnectRelationFromEntity,
  } = useDiagramStore()

  const [attrName, setAttrName]   = useState('')
  const [attrKind, setAttrKind]   = useState<AttributeKind>('normal')
  const [newCardinality, setNewCardinality] = useState('(1,1)')
  const [selectedEntity, setSelectedEntity] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Tutte le entità disponibili nel diagramma
  const allEntities = nodes.filter((n) => n.type === 'entity')

  // Archi di associazione già collegati a questa relazione
  const connectedEdges = edges.filter(
    (e) =>
      e.type === 'association' &&
      (e.source === node.id || e.target === node.id),
  )

  // ── Aggiunge un collegamento relazione → entità ────────
  // Non c'è più la logica "entità già collegata = esclusa":
  // la stessa entità può apparire più volte (self-relation).
  const handleConnect = () => {
    if (!selectedEntity) return
    connectRelationToEntity(node.id, selectedEntity, newCardinality)
    // Non resetta la selezione: facilita l'aggiunta rapida di un secondo
    // arco verso la stessa entità per la self-relation
  }

  // ── Aggiunge attributo alla relazione ─────────────────
  const handleAddAttr = () => {
    if (!attrName.trim()) return
    addAttributeToRelation(node.id, { name: attrName.trim(), kind: attrKind })
    setAttrName('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAddAttr()
  }

  // Helper: restituisce il nome dell'entità collegata da un arco
  const getEntityLabel = (edgeSource: string, edgeTarget: string) => {
    const entityId = edgeSource === node.id ? edgeTarget : edgeSource
    const entity   = nodes.find((n) => n.id === entityId)
    return entity?.data?.label ?? entityId
  }

  // Conta quante volte la stessa entità è collegata (per evidenziare le self-relation)
  const entityOccurrences = connectedEdges.reduce<Record<string, number>>((acc, edge) => {
    const entityId = edge.source === node.id ? edge.target : edge.source
    acc[entityId] = (acc[entityId] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-4 p-4">

      {/* ── Intestazione ────────────────────────────────── */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
        <div className="w-3 h-3 rotate-45 bg-purple-500" />
        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
          Relazione
        </span>
      </div>

      {/* ── Nome ────────────────────────────────────────── */}
      <div className="space-y-1">
        <label className="text-xs text-gray-400">Nome</label>
        <input
          type="text"
          value={node.data.label}
          onChange={(e) => updateRelationLabel(node.id, e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
        />
      </div>

      {/* ── Entità collegate ────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 flex items-center gap-1">
          <Link2 size={11} />
          Entità collegate ({connectedEdges.length})
        </label>

        {connectedEdges.length === 0 && (
          <p className="text-xs text-gray-600 italic px-1">
            Nessuna entità collegata — usa il form sotto o trascina un filo sulla canvas
          </p>
        )}

        <ul className="space-y-1">
          {connectedEdges.map((edge) => {
            const entityId   = edge.source === node.id ? edge.target : edge.source
            const entityName = getEntityLabel(edge.source, edge.target)
            const card       = edge.data?.cardinality ?? '(1,1)'
            const isSelfRef  = (entityOccurrences[entityId] ?? 0) > 1

            return (
              <li
                key={edge.id}
                className={`flex items-center gap-2 rounded px-2 py-2 ${
                  isSelfRef ? 'bg-amber-950/40 border border-amber-800/40' : 'bg-gray-800'
                }`}
              >
                {/* Icona self-relation */}
                {isSelfRef && (
                  <RefreshCw size={11} className="text-amber-500 flex-shrink-0" title="Self-relation" />
                )}

                {/* Nome entità */}
                <span className="flex-1 text-sm text-gray-200 truncate font-medium">
                  {entityName}
                </span>

                {/* Cardinalità */}
                <select
                  value={card}
                  onChange={(e) => setCardinality(edge.id, e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs text-gray-200 focus:border-purple-500 focus:outline-none cursor-pointer"
                >
                  {CARDINALITY_PRESETS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  {!CARDINALITY_PRESETS.includes(card) && (
                    <option value={card}>{card}</option>
                  )}
                </select>

                {/* Disconnetti */}
                <button
                  onClick={() => disconnectRelationFromEntity(edge.id)}
                  title="Disconnetti"
                  className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Unlink size={13} />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* ── Form collegamento ────────────────────────────── */}
      <div className="space-y-2 border border-gray-800 rounded-lg p-3 bg-gray-900/50">
        <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
          <Plus size={11} />
          Collega entità
        </p>

        {allEntities.length === 0 ? (
          <p className="text-xs text-gray-600 italic">Nessuna entità nel diagramma</p>
        ) : (
          <>
            {/* Selettore entità — mostra TUTTE le entità, anche già collegate */}
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
            >
              <option value="">Scegli entità…</option>
              {allEntities.map((n) => {
                const occurrences = entityOccurrences[n.id] ?? 0
                const selfLabel   = occurrences > 0 ? ` (già collegata ×${occurrences})` : ''
                return (
                  <option key={n.id} value={n.id}>
                    {n.data.label}{selfLabel}
                  </option>
                )
              })}
            </select>

            {/* Nota self-relation */}
            {selectedEntity && (entityOccurrences[selectedEntity] ?? 0) > 0 && (
              <p className="text-xs text-amber-500/80 flex items-center gap-1">
                <RefreshCw size={10} />
                Aggiunge un secondo arco — self-relation
              </p>
            )}

            {/* Cardinalità */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Cardinalità</label>
              <div className="flex flex-wrap gap-1">
                {CARDINALITY_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewCardinality(c)}
                    className={`px-2 py-0.5 rounded text-xs font-mono font-medium border transition-colors ${
                      newCardinality === c
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={newCardinality}
                onChange={(e) => setNewCardinality(e.target.value)}
                placeholder="Cardinalità custom…"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100 focus:border-purple-500 focus:outline-none font-mono"
              />
            </div>

            <button
              onClick={handleConnect}
              disabled={!selectedEntity}
              className="w-full py-2 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
            >
              <Link2 size={14} />
              Collega
            </button>
          </>
        )}
      </div>

      {/* ── Attributi relazione (N-N) ────────────────────── */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400">
          Attributi relazione
          <span className="ml-1 text-gray-600">(tipico per N-N)</span>
        </label>

        {node.data.attributes.length === 0 && (
          <p className="text-xs text-gray-600 italic">Nessun attributo</p>
        )}

        <ul className="space-y-1">
          {(node.data.attributes as AttributeData[]).map((attr) => (
            <li
              key={attr.id}
              className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1.5 text-sm text-gray-200"
            >
              <Circle size={12} className="text-green-500 flex-shrink-0" />
              <span className="flex-1">{attr.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Form aggiunta attributo ──────────────────────── */}
      <div className="space-y-2 border-t border-gray-800 pt-3">
        <label className="text-xs text-gray-400">Aggiungi Attributo</label>
        <input
          ref={inputRef}
          type="text"
          value={attrName}
          onChange={(e) => setAttrName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nome attributo…"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none placeholder-gray-600"
        />

        <div className="flex gap-1">
          {([
            { kind: 'normal'      as AttributeKind, label: 'Normale', icon: <Circle size={12} /> },
            { kind: 'primary-key' as AttributeKind, label: 'PK',      icon: <Key size={12} /> },
            { kind: 'optional'    as AttributeKind, label: 'Opz.',    icon: <Minus size={12} /> },
          ] as const).map(({ kind, label, icon }) => (
            <button
              key={kind}
              onClick={() => setAttrKind(kind)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                attrKind === kind
                  ? 'bg-purple-600 border-purple-500 text-white'
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
          className="w-full py-2 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
        >
          Aggiungi (↵ Enter)
        </button>
      </div>
    </div>
  )
}

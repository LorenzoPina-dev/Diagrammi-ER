import { useRef, useState, type KeyboardEvent } from 'react'
import { Link2, Plus, RefreshCw, Unlink } from 'lucide-react'
import shallow from 'zustand/shallow'
import { useDiagramStore } from '../../store/diagramStore'
import type { AssociationEdge, AttributeKind, RelationNode } from '../../types/er.types'
import {
  AttributeKindIcon,
  AttributeKindPicker,
} from './attributeUi'

interface Props {
  node: RelationNode
}

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
  } = useDiagramStore(
    (state) => ({
      nodes: state.nodes,
      edges: state.edges,
      updateRelationLabel: state.updateRelationLabel,
      addAttributeToRelation: state.addAttributeToRelation,
      setCardinality: state.setCardinality,
      connectRelationToEntity: state.connectRelationToEntity,
      disconnectRelationFromEntity: state.disconnectRelationFromEntity,
    }),
    shallow,
  )

  const [attributeName, setAttributeName] = useState('')
  const [attributeKind, setAttributeKind] = useState<AttributeKind>('normal')
  const [newCardinality, setNewCardinality] = useState('(1,1)')
  const [selectedEntityId, setSelectedEntityId] = useState('')

  const attributeInputRef = useRef<HTMLInputElement>(null)

  const entityNodes = nodes.filter((candidate) => candidate.type === 'entity')
  const connectedEdges = edges.filter(
    (edge) => edge.type === 'association' && (edge.source === node.id || edge.target === node.id),
  ) as AssociationEdge[]

  const entityOccurrences = connectedEdges.reduce<Record<string, number>>((accumulator, edge) => {
    const entityId = edge.source === node.id ? edge.target : edge.source
    accumulator[entityId] = (accumulator[entityId] ?? 0) + 1
    return accumulator
  }, {})

  const getEntityLabel = (edgeSource: string, edgeTarget: string) => {
    const entityId = edgeSource === node.id ? edgeTarget : edgeSource
    return nodes.find((candidate) => candidate.id === entityId)?.data.label ?? entityId
  }

  const submitAttribute = () => {
    const normalizedName = attributeName.trim()
    if (!normalizedName) return

    addAttributeToRelation(node.id, { name: normalizedName, kind: attributeKind })
    setAttributeName('')
    attributeInputRef.current?.focus()
  }

  const connectEntity = () => {
    if (!selectedEntityId) return
    connectRelationToEntity(node.id, selectedEntityId, newCardinality)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <div className="h-3 w-3 rotate-45 bg-purple-500" />
        <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Relazione</span>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Nome</label>
        <input
          type="text"
          value={node.data.label}
          onChange={(event) => updateRelationLabel(node.id, event.target.value)}
          className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1 text-xs text-gray-400">
          <Link2 size={11} /> Entita collegate ({connectedEdges.length})
        </label>
        {connectedEdges.length === 0 && (
          <p className="px-1 text-xs italic text-gray-600">Nessuna entita collegata</p>
        )}
        <ul className="space-y-1">
          {connectedEdges.map((edge) => {
            const entityId = edge.source === node.id ? edge.target : edge.source
            const entityName = getEntityLabel(edge.source, edge.target)
            const cardinality = edge.data?.cardinality ?? '(1,1)'
            const isSelfRelation = (entityOccurrences[entityId] ?? 0) > 1

            return (
              <li
                key={edge.id}
                className={`flex items-center gap-2 rounded px-2 py-2 ${
                  isSelfRelation
                    ? 'border border-amber-800/40 bg-amber-950/40'
                    : 'bg-gray-800'
                }`}
              >
                {isSelfRelation && <RefreshCw size={11} className="flex-shrink-0 text-amber-500" />}
                <span className="flex-1 truncate text-sm font-medium text-gray-200">{entityName}</span>
                <select
                  value={cardinality}
                  onChange={(event) => setCardinality(edge.id, event.target.value)}
                  className="cursor-pointer rounded border border-gray-600 bg-gray-700 px-1 py-0.5 text-xs text-gray-200 focus:border-purple-500 focus:outline-none"
                >
                  {CARDINALITY_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                  {!CARDINALITY_PRESETS.includes(cardinality) && (
                    <option value={cardinality}>{cardinality}</option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => disconnectRelationFromEntity(edge.id)}
                  className="flex-shrink-0 text-gray-600 transition-colors hover:text-red-400"
                >
                  <Unlink size={13} />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="space-y-2 rounded-lg border border-gray-800 bg-gray-900/50 p-3">
        <p className="flex items-center gap-1 text-xs font-medium text-gray-400">
          <Plus size={11} /> Collega entita
        </p>
        {entityNodes.length === 0 ? (
          <p className="text-xs italic text-gray-600">Nessuna entita nel diagramma</p>
        ) : (
          <>
            <select
              value={selectedEntityId}
              onChange={(event) => setSelectedEntityId(event.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
            >
              <option value="">Scegli entita...</option>
              {entityNodes.map((entity) => {
                const occurrences = entityOccurrences[entity.id] ?? 0
                const suffix = occurrences > 0 ? ` (gia x${occurrences})` : ''

                return (
                  <option key={entity.id} value={entity.id}>
                    {entity.data.label}
                    {suffix}
                  </option>
                )
              })}
            </select>
            {selectedEntityId && (entityOccurrences[selectedEntityId] ?? 0) > 0 && (
              <p className="flex items-center gap-1 text-xs text-amber-500/80">
                <RefreshCw size={10} /> Self-relation
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              {CARDINALITY_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNewCardinality(preset)}
                  className={`rounded border px-2 py-0.5 text-xs font-medium font-mono transition-colors ${
                    newCardinality === preset
                      ? 'border-purple-500 bg-purple-600 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={newCardinality}
              onChange={(event) => setNewCardinality(event.target.value)}
              placeholder="Custom..."
              className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 font-mono text-xs text-gray-100 focus:border-purple-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={connectEntity}
              disabled={!selectedEntityId}
              className="flex w-full items-center justify-center gap-2 rounded bg-purple-600 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Link2 size={14} /> Collega
            </button>
          </>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs text-gray-400">
          Attributi relazione <span className="text-gray-600">(tipico N-N)</span>
        </label>
        {node.data.attributes.length === 0 && (
          <p className="text-xs italic text-gray-600">Nessun attributo</p>
        )}
        <ul className="space-y-1">
          {node.data.attributes.map((attribute) => (
            <li
              key={attribute.id}
              className="flex items-center gap-2 rounded bg-gray-800 px-2 py-1.5 text-sm text-gray-200"
            >
              <AttributeKindIcon kind={attribute.kind} />
              <span className="flex-1">{attribute.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2 border-t border-gray-800 pt-3">
        <label className="text-xs text-gray-400">Aggiungi Attributo</label>
        <input
          ref={attributeInputRef}
          type="text"
          value={attributeName}
          onChange={(event) => setAttributeName(event.target.value)}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') submitAttribute()
          }}
          placeholder="Nome attributo..."
          className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-purple-500 focus:outline-none"
        />
        <AttributeKindPicker
          value={attributeKind}
          onChange={setAttributeKind}
          accentClassName="border-purple-500 bg-purple-600 text-white"
        />
        <button
          type="button"
          onClick={submitAttribute}
          disabled={!attributeName.trim()}
          className="w-full rounded bg-purple-600 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Aggiungi (Invio)
        </button>
      </div>
    </div>
  )
}

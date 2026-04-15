import { useRef, useState, type KeyboardEvent } from 'react'
import { GitMerge, Layers, Trash2 } from 'lucide-react'
import shallow from 'zustand/shallow'
import { useDiagramStore } from '../../store/diagramStore'
import type {
  AttributeKind,
  EntityNode,
  GeneralizationCoverage,
  GeneralizationDisjoint,
} from '../../types/er.types'
import {
  ATTRIBUTE_KINDS_WITH_CHILDREN,
  AttributeKindIcon,
  AttributeKindPicker,
} from './attributeUi'

interface Props {
  node: EntityNode
}

const COVERAGE_OPTIONS: { value: GeneralizationCoverage; label: string }[] = [
  { value: 'total', label: 'Totale (t)' },
  { value: 'partial', label: 'Parziale (p)' },
]

const DISJOINT_OPTIONS: { value: GeneralizationDisjoint; label: string }[] = [
  { value: 'exclusive', label: 'Esclusiva (e)' },
  { value: 'overlapping', label: 'Non escl. (ne)' },
]

export default function EntityPanel({ node }: Props) {
  const {
    nodes,
    updateEntityLabel,
    addAttributeToEntity,
    removeAttributeFromEntity,
    addChildAttribute,
    setGeneralization,
  } = useDiagramStore(
    (state) => ({
      nodes: state.nodes,
      updateEntityLabel: state.updateEntityLabel,
      addAttributeToEntity: state.addAttributeToEntity,
      removeAttributeFromEntity: state.removeAttributeFromEntity,
      addChildAttribute: state.addChildAttribute,
      setGeneralization: state.setGeneralization,
    }),
    shallow,
  )

  const [attributeName, setAttributeName] = useState('')
  const [attributeKind, setAttributeKind] = useState<AttributeKind>('normal')
  const [expandedAttributeId, setExpandedAttributeId] = useState<string | null>(null)
  const [childAttributeName, setChildAttributeName] = useState('')

  const attributeInputRef = useRef<HTMLInputElement>(null)
  const childInputRef = useRef<HTMLInputElement>(null)

  const siblingEntities = nodes.filter((candidate) => candidate.type === 'entity' && candidate.id !== node.id)
  const generalization = node.data.generalization
  const selectedChildIds = generalization?.childIds ?? []
  const coverage = generalization?.coverage ?? 'partial'
  const disjoint = generalization?.disjoint ?? 'exclusive'

  const submitAttribute = () => {
    const normalizedName = attributeName.trim()
    if (!normalizedName) return

    addAttributeToEntity(node.id, { name: normalizedName, kind: attributeKind })
    setAttributeName('')
    attributeInputRef.current?.focus()
  }

  const submitChildAttribute = (parentId: string) => {
    const normalizedName = childAttributeName.trim()
    if (!normalizedName) return

    addChildAttribute(parentId, { name: normalizedName, kind: 'normal' })
    setChildAttributeName('')
    childInputRef.current?.focus()
  }

  const toggleGeneralizationChild = (childId: string) => {
    const nextChildIds = selectedChildIds.includes(childId)
      ? selectedChildIds.filter((currentId) => currentId !== childId)
      : [...selectedChildIds, childId]

    setGeneralization(node.id, nextChildIds, coverage, disjoint)
  }

  const updateCoverage = (value: GeneralizationCoverage) => {
    setGeneralization(node.id, selectedChildIds, value, disjoint)
  }

  const updateDisjoint = (value: GeneralizationDisjoint) => {
    setGeneralization(node.id, selectedChildIds, coverage, value)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <div className="h-3 w-3 rounded-sm bg-blue-500" />
        <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Entita</span>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Nome</label>
        <input
          type="text"
          value={node.data.label}
          onChange={(event) => updateEntityLabel(node.id, event.target.value)}
          className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="space-y-2 border-t border-gray-800 pt-3">
        <div className="flex items-center gap-2">
          <GitMerge size={13} className="text-amber-400" />
          <label className="text-xs font-medium uppercase tracking-wider text-amber-400">
            Generalizzazione (Padre)
          </label>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400">Entita figlie</label>
          {siblingEntities.length === 0 ? (
            <p className="text-xs italic text-gray-600">Nessun'altra entita nel diagramma</p>
          ) : (
            <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
              {siblingEntities.map((entity) => {
                const checked = selectedChildIds.includes(entity.id)

                return (
                  <label
                    key={entity.id}
                    className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
                      checked
                        ? 'border border-amber-700 bg-amber-900/40 text-amber-200'
                        : 'border border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleGeneralizationChild(entity.id)}
                      className="accent-amber-500"
                    />
                    {entity.data.label}
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex gap-1">
          {COVERAGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateCoverage(option.value)}
              className={`flex-1 rounded border py-1.5 text-xs font-medium transition-colors ${
                coverage === option.value
                  ? 'border-amber-500 bg-amber-600 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {DISJOINT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateDisjoint(option.value)}
              className={`flex-1 rounded border py-1.5 text-xs font-medium transition-colors ${
                disjoint === option.value
                  ? 'border-amber-500 bg-amber-600 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {selectedChildIds.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setGeneralization(node.id, [], coverage, disjoint)}
              className="w-full rounded border border-red-800 bg-red-900/50 py-1.5 text-xs text-red-300 transition-colors hover:bg-red-800/60"
            >
              Rimuovi generalizzazione
            </button>
            <div className="text-center text-xs italic text-gray-500">
              ({coverage === 'total' ? 't' : 'p'}, {disjoint === 'exclusive' ? 'e' : 'ne'})
            </div>
          </>
        )}
      </div>

      <div className="space-y-2 border-t border-gray-800 pt-3">
        <label className="text-xs text-gray-400">Attributi ({node.data.attributes.length})</label>
        {node.data.attributes.length === 0 && (
          <p className="text-xs italic text-gray-600">Nessun attributo</p>
        )}
        <ul className="space-y-1">
          {node.data.attributes.map((attribute) => (
            <li key={attribute.id}>
              <div className="flex items-center gap-2 rounded bg-gray-800 px-2 py-1.5 text-sm text-gray-200">
                <AttributeKindIcon kind={attribute.kind} />
                <span
                  className={`flex-1 ${
                    attribute.kind === 'primary-key' ? 'font-bold underline' : ''
                  }`}
                >
                  {attribute.name}
                </span>
                {ATTRIBUTE_KINDS_WITH_CHILDREN.has(attribute.kind) && (
                  <button
                    type="button"
                    title="Aggiungi sotto-attributi"
                    onClick={() =>
                      setExpandedAttributeId(
                        expandedAttributeId === attribute.id ? null : attribute.id,
                      )
                    }
                    className={`text-indigo-400 transition-colors hover:text-indigo-300 ${
                      expandedAttributeId === attribute.id ? 'opacity-100' : 'opacity-40'
                    }`}
                  >
                    <Layers size={12} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAttributeFromEntity(node.id, attribute.id)}
                  className="text-gray-600 transition-colors hover:text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {ATTRIBUTE_KINDS_WITH_CHILDREN.has(attribute.kind) &&
                expandedAttributeId === attribute.id && (
                  <div className="ml-4 mt-1 space-y-1 rounded border border-indigo-900/50 bg-indigo-950/30 p-2">
                    <p className="text-xs text-indigo-400">
                      {attribute.kind === 'composite-key'
                        ? 'Attributi della chiave'
                        : 'Sotto-attributi'}{' '}
                      di "{attribute.name}"
                    </p>
                    <div className="flex gap-1">
                      <input
                        ref={childInputRef}
                        type="text"
                        value={childAttributeName}
                        onChange={(event) => setChildAttributeName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') submitChildAttribute(attribute.id)
                        }}
                        placeholder="Nome..."
                        className="flex-1 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-100 placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => submitChildAttribute(attribute.id)}
                        disabled={!childAttributeName.trim()}
                        className="rounded bg-indigo-700 px-2 py-1 text-xs text-white transition-colors hover:bg-indigo-600 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
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
          className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <AttributeKindPicker
          value={attributeKind}
          onChange={setAttributeKind}
          accentClassName="border-blue-500 bg-blue-600 text-white"
        />
        <button
          type="button"
          onClick={submitAttribute}
          disabled={!attributeName.trim()}
          className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Aggiungi (Invio)
        </button>
      </div>
    </div>
  )
}

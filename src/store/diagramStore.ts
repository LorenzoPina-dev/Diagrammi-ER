// ============================================================
// STORE GLOBALE — Zustand + Immer + Persist (localStorage)
// ============================================================
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Viewport,
} from 'reactflow'
import { nanoid } from './nanoid'
import type {
  EntityNodeData,
  RelationNodeData,
  AttributeNodeData,
  AttributeData,
  ERProject,
  GeneralizationCoverage,
  GeneralizationDisjoint,
} from '../types/er.types'

// ─────────────────────────────────────────────────────────────
// Snapshot per la history undo
// ─────────────────────────────────────────────────────────────
interface HistorySnapshot {
  nodes: Node[]
  edges: Edge[]
}

// ─────────────────────────────────────────────────────────────
// Stato + Azioni
// ─────────────────────────────────────────────────────────────
interface DiagramState {
  nodes:    Node[]
  edges:    Edge[]
  viewport: Viewport

  selectedNodeId: string | null

  history:      HistorySnapshot[]
  historyIndex: number

  projectName: string

  // ── Actions React Flow ──────────────────────────────────
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect:     (connection: Connection) => void
  setViewport:   (viewport: Viewport) => void

  // ── Actions Entità ──────────────────────────────────────
  addEntity:                (position: { x: number; y: number }) => string
  updateEntityLabel:        (id: string, label: string) => void
  addAttributeToEntity:     (entityId: string, attr: Omit<AttributeData, 'id'>) => void
  removeAttributeFromEntity:(entityId: string, attrId: string) => void
  setGeneralization:        (parentId: string, childIds: string[], coverage: GeneralizationCoverage, disjoint: GeneralizationDisjoint) => void

  // ── Actions Relazione ───────────────────────────────────
  addRelation:              (position: { x: number; y: number }) => string
  updateRelationLabel:      (id: string, label: string) => void
  setCardinality:           (edgeId: string, cardinality: string) => void
  addAttributeToRelation:   (relationId: string, attr: Omit<AttributeData, 'id'>) => void

  // ── Collegamento Relazione ↔ Entità ─────────────────────
  connectRelationToEntity:  (relationId: string, entityId: string, cardinality: string) => void
  disconnectRelationFromEntity: (edgeId: string) => void

  // ── Edge data (waypoints, parametri generalizzazione) ───
  setEdgeData: (edgeId: string, data: Record<string, unknown>) => void

  // ── Selezione ───────────────────────────────────────────
  selectNode: (id: string | null) => void

  // ── History ─────────────────────────────────────────────
  undo:        () => void
  pushHistory: () => void

  // ── Progetto ────────────────────────────────────────────
  loadProject:    (project: ERProject) => void
  resetProject:   () => void
  setProjectName: (name: string) => void
}

// ─────────────────────────────────────────────────────────────
// Factory — nodi con valori di default
// ─────────────────────────────────────────────────────────────
function makeEntityNode(id: string, position: { x: number; y: number }): Node<EntityNodeData> {
  return { id, type: 'entity', position, data: { label: 'NuovaEntità', attributes: [] } }
}

function makeRelationNode(id: string, position: { x: number; y: number }): Node<RelationNodeData> {
  return { id, type: 'relation', position, data: { label: 'NuovaRelazione', cardinalities: {}, attributes: [] } }
}

function makeAttributeNode(
  id: string,
  position: { x: number; y: number },
  attr: AttributeData,
  ownerId: string,
): Node<AttributeNodeData> {
  return { id, type: 'attribute', position, data: { label: attr.name, kind: attr.kind, ownerId } }
}

// ─────────────────────────────────────────────────────────────
// Posizionamento radiale degli attributi
// ─────────────────────────────────────────────────────────────
const ATTR_RADIUS_NODE = 22
const ATTR_ORBIT       = 130

function radialPosition(parentCenter: { x: number; y: number }, index: number, total: number) {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2
  return {
    x: parentCenter.x + ATTR_ORBIT * Math.cos(angle) - ATTR_RADIUS_NODE,
    y: parentCenter.y + ATTR_ORBIT * Math.sin(angle) - ATTR_RADIUS_NODE,
  }
}

function entityCenter(pos: { x: number; y: number }, w = 140, h = 38) {
  return { x: pos.x + w / 2, y: pos.y + h / 2 }
}

function relationCenter(pos: { x: number; y: number }, size = 120) {
  return { x: pos.x + size / 2, y: pos.y + size / 2 }
}

// ─────────────────────────────────────────────────────────────
// Store con persist
// ─────────────────────────────────────────────────────────────
export const useDiagramStore = create<DiagramState>()(
  persist(
    immer((set, get) => ({
      nodes:          [],
      edges:          [],
      viewport:       { x: 0, y: 0, zoom: 1 },
      selectedNodeId: null,
      history:        [],
      historyIndex:   -1,
      projectName:    'Diagramma ER',

      // ── React Flow ───────────────────────────────────────
      onNodesChange: (changes) =>
        set((s) => {
          // Intercetta la rimozione di nodi di tipo attributo dalla grafica
          // per sincronizzare anche entity.data.attributes
          const removals = changes
            .filter((c) => c.type === 'remove')
            .map((c) => (c as { type: 'remove'; id: string }).id)

          if (removals.length > 0) {
            for (const removedId of removals) {
              const removedNode = s.nodes.find((n) => n.id === removedId)
              if (removedNode?.type === 'attribute') {
                const ownerId = (removedNode.data as AttributeNodeData).ownerId
                const owner   = s.nodes.find((n) => n.id === ownerId)
                if (owner) {
                  owner.data.attributes = owner.data.attributes.filter(
                    (a: AttributeData) => a.id !== removedId,
                  )
                }
                s.edges = s.edges.filter(
                  (e) => e.source !== removedId && e.target !== removedId,
                )
              } else if (removedNode?.type === 'entity') {
                // Rimuovi edge di generalizzazione collegati
                s.edges = s.edges.filter(
                  (e) => !(e.type === 'generalization' && (e.source === removedId || e.target === removedId)),
                )
                // Rimuovi il nodo dai childIds di eventuali padri
                for (const n of s.nodes) {
                  if (n.type === 'entity' && n.data.generalization) {
                    n.data.generalization.childIds = n.data.generalization.childIds.filter(
                      (cid: string) => cid !== removedId,
                    )
                  }
                }
              }
            }
          }

          s.nodes = applyNodeChanges(changes, s.nodes)
        }),

      onEdgesChange: (changes) =>
        set((s) => { s.edges = applyEdgeChanges(changes, s.edges) }),

      onConnect: (connection) => {
        const state = get()
        const src = state.nodes.find((n) => n.id === connection.source)
        const tgt = state.nodes.find((n) => n.id === connection.target)

        // Blocca collegamenti tra attributi
        if (src?.type === 'attribute' || tgt?.type === 'attribute') return

        // Permette la self-relation (entità → stessa relazione) ma non
        // collegamenti diretti entità → entità senza passare per una relazione
        if (src?.type === 'entity' && tgt?.type === 'entity') return

        get().pushHistory()
        set((s) => {
          s.edges = addEdge(
            { ...connection, type: 'association', data: { cardinality: '(1,1)' } },
            s.edges,
          )
        })
      },

      setViewport: (viewport) =>
        set((s) => { s.viewport = viewport }),

      // ── Entità ───────────────────────────────────────────
      addEntity: (position) => {
        get().pushHistory()
        const id = nanoid()
        set((s) => { s.nodes.push(makeEntityNode(id, position)) })
        return id
      },

      updateEntityLabel: (id, label) =>
        set((s) => {
          const node = s.nodes.find((n) => n.id === id)
          if (node) node.data.label = label
        }),

      addAttributeToEntity: (entityId, attr) => {
        get().pushHistory()
        const attrId   = nanoid()
        const fullAttr: AttributeData = { ...attr, id: attrId }

        set((s) => {
          const entity = s.nodes.find((n) => n.id === entityId)
          if (!entity) return

          entity.data.attributes.push(fullAttr)

          const allAttrs: AttributeData[] = entity.data.attributes
          const total  = allAttrs.length
          const center = entityCenter(entity.position)

          allAttrs.forEach((a, i) => {
            const pos          = radialPosition(center, i, total)
            const existingNode = s.nodes.find((n) => n.id === a.id)

            if (existingNode) {
              existingNode.position = pos
            } else {
              s.nodes.push(makeAttributeNode(a.id, pos, a, entityId))
              s.edges.push({
                id:     nanoid(),
                source: entityId,
                target: a.id,
                type:   'attribute-link',
                data:   {},
              })
            }
          })
        })
      },

      removeAttributeFromEntity: (entityId, attrId) => {
        get().pushHistory()
        set((s) => {
          const entity = s.nodes.find((n) => n.id === entityId)
          if (!entity) return

          entity.data.attributes = entity.data.attributes.filter(
            (a: AttributeData) => a.id !== attrId,
          )
          s.nodes = s.nodes.filter((n) => n.id !== attrId)
          s.edges = s.edges.filter(
            (e) => e.source !== attrId && e.target !== attrId,
          )

          const remaining: AttributeData[] = entity.data.attributes
          const center = entityCenter(entity.position)
          remaining.forEach((a, i) => {
            const node = s.nodes.find((n) => n.id === a.id)
            if (node) node.position = radialPosition(center, i, remaining.length)
          })
        })
      },

      setGeneralization: (parentId, childIds, coverage, disjoint) => {
        get().pushHistory()
        set((s) => {
          // Aggiorna il dato sul nodo padre
          const parentNode = s.nodes.find((n) => n.id === parentId)
          if (!parentNode) return
          parentNode.data.generalization = { childIds, coverage, disjoint }

          // Rimuovi tutti gli edge di generalizzazione che hanno questo padre
          s.edges = s.edges.filter(
            (e) => !(e.type === 'generalization' && e.target === parentId),
          )

          // Crea un edge per ogni figlio (source=figlio, target=padre)
          for (const childId of childIds) {
            s.edges.push({
              id:     nanoid(),
              source: childId,
              target: parentId,
              type:   'generalization',
              data:   { coverage, disjoint, waypoints: [] },
            })
          }
        })
      },

      // ── Relazione ────────────────────────────────────────
      addRelation: (position) => {
        get().pushHistory()
        const id = nanoid()
        set((s) => { s.nodes.push(makeRelationNode(id, position)) })
        return id
      },

      updateRelationLabel: (id, label) =>
        set((s) => {
          const node = s.nodes.find((n) => n.id === id)
          if (node) node.data.label = label
        }),

      setCardinality: (edgeId, cardinality) =>
        set((s) => {
          const edge = s.edges.find((e) => e.id === edgeId)
          if (edge) edge.data = { ...edge.data, cardinality }
        }),

      addAttributeToRelation: (relationId, attr) => {
        get().pushHistory()
        const attrId   = nanoid()
        const fullAttr: AttributeData = { ...attr, id: attrId }

        set((s) => {
          const relation = s.nodes.find((n) => n.id === relationId)
          if (!relation) return

          relation.data.attributes.push(fullAttr)

          const allAttrs: AttributeData[] = relation.data.attributes
          const total  = allAttrs.length
          const center = relationCenter(relation.position)

          allAttrs.forEach((a: AttributeData, i: number) => {
            const existing = s.nodes.find((n) => n.id === a.id)
            const pos      = radialPosition(center, i, total)

            if (!existing) {
              s.nodes.push(makeAttributeNode(a.id, pos, a, relationId))
              s.edges.push({
                id:     nanoid(),
                source: relationId,
                target: a.id,
                type:   'attribute-link',
                data:   {},
              })
            } else {
              existing.position = pos
            }
          })
        })
      },

      // ── Collegamento Relazione ↔ Entità ──────────────────
      // La stessa entità può essere collegata più volte (self-relation):
      // non si blocca il duplicato per entityId, ogni arco è indipendente.
      connectRelationToEntity: (relationId, entityId, cardinality) => {
        get().pushHistory()
        set((s) => {
          s.edges.push({
            id:     nanoid(),
            source: relationId,
            target: entityId,
            type:   'association',
            data:   { cardinality },
          })
        })
      },

      disconnectRelationFromEntity: (edgeId) => {
        get().pushHistory()
        set((s) => {
          s.edges = s.edges.filter((e) => e.id !== edgeId)
        })
      },

      // ── Edge data ────────────────────────────────────────
      setEdgeData: (edgeId, data) =>
        set((s) => {
          const edge = s.edges.find((e) => e.id === edgeId)
          if (edge) edge.data = { ...edge.data, ...data }
        }),

      // ── Selezione ────────────────────────────────────────
      selectNode: (id) =>
        set((s) => { s.selectedNodeId = id }),

      // ── History ──────────────────────────────────────────
      pushHistory: () =>
        set((s) => {
          const snapshot: HistorySnapshot = {
            nodes: JSON.parse(JSON.stringify(s.nodes)),
            edges: JSON.parse(JSON.stringify(s.edges)),
          }
          s.history      = s.history.slice(0, s.historyIndex + 1)
          s.history.push(snapshot)
          s.historyIndex = s.history.length - 1
        }),

      undo: () =>
        set((s) => {
          if (s.historyIndex <= 0) return
          s.historyIndex -= 1
          const snap = s.history[s.historyIndex]
          s.nodes    = snap.nodes
          s.edges    = snap.edges
        }),

      // ── Progetto ─────────────────────────────────────────
      loadProject: (project) =>
        set((s) => {
          s.nodes        = project.nodes as Node[]
          s.edges        = project.edges as Edge[]
          s.viewport     = project.viewport
          s.projectName  = project.name
          s.history      = []
          s.historyIndex = -1
        }),

      resetProject: () =>
        set((s) => {
          s.nodes          = []
          s.edges          = []
          s.viewport       = { x: 0, y: 0, zoom: 1 }
          s.history        = []
          s.historyIndex   = -1
          s.selectedNodeId = null
          s.projectName    = 'Diagramma ER'
        }),

      setProjectName: (name) =>
        set((s) => { s.projectName = name }),
    })),

    {
      name:    'er-diagram-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nodes:       state.nodes,
        edges:       state.edges,
        viewport:    state.viewport,
        projectName: state.projectName,
      }),
    },
  ),
)

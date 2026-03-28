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
import { nodeCenter, type NodeGeometry } from '../lib/path'
import type {
  EntityNodeData,
  RelationNodeData,
  AttributeNodeData,
  AttributeData,
  AttributeKind,
  ERProject,
  GeneralizationCoverage,
  GeneralizationDisjoint,
} from '../types/er.types'

// ─── Cardinalità automatica per tipo attributo ───────────────
const ATTR_CARDINALITY: Partial<Record<AttributeKind, string>> = {
  'multivalued':    '(1,N)',
  'optional':       '(0,1)',
  'optional-multi': '(0,N)',
}

// ─── Snapshot per la history undo ────────────────────────────
interface HistorySnapshot {
  nodes: Node[]
  edges: Edge[]
}

// ─── Stato + Azioni ──────────────────────────────────────────
interface DiagramState {
  nodes:    Node[]
  edges:    Edge[]
  viewport: Viewport

  selectedNodeId: string | null
  history:        HistorySnapshot[]
  historyIndex:   number
  projectName:    string

  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect:     (connection: Connection) => void
  setViewport:   (viewport: Viewport) => void

  addEntity:                 (position: { x: number; y: number }) => string
  updateEntityLabel:         (id: string, label: string) => void
  addAttributeToEntity:      (entityId: string, attr: Omit<AttributeData, 'id'>) => void
  removeAttributeFromEntity: (entityId: string, attrId: string) => void
  setGeneralization:         (parentId: string, childIds: string[], coverage: GeneralizationCoverage, disjoint: GeneralizationDisjoint) => void

  addRelation:             (position: { x: number; y: number }) => string
  updateRelationLabel:     (id: string, label: string) => void
  setCardinality:          (edgeId: string, cardinality: string) => void
  addAttributeToRelation:  (relationId: string, attr: Omit<AttributeData, 'id'>) => void

  connectRelationToEntity:      (relationId: string, entityId: string, cardinality: string) => void
  disconnectRelationFromEntity: (edgeId: string) => void

  /** Aggiunge un sotto-attributo a un nodo composite o composite-key */
  addChildAttribute: (parentAttrId: string, attr: Omit<AttributeData, 'id'>) => void

  setEdgeData: (edgeId: string, data: Record<string, unknown>) => void
  selectNode:  (id: string | null) => void
  undo:        () => void
  pushHistory: () => void
  loadProject:    (project: ERProject) => void
  resetProject:   () => void
  setProjectName: (name: string) => void
}

// ─── Factory ─────────────────────────────────────────────────

function makeEntityNode(id: string, pos: { x: number; y: number }): Node<EntityNodeData> {
  return { id, type: 'entity', position: pos, data: { label: 'NuovaEntità', attributes: [] } }
}

function makeRelationNode(id: string, pos: { x: number; y: number }): Node<RelationNodeData> {
  return { id, type: 'relation', position: pos, data: { label: 'NuovaRelazione', cardinalities: {}, attributes: [] } }
}

function makeAttributeNode(
  id: string, pos: { x: number; y: number },
  attr: AttributeData, ownerId: string,
): Node<AttributeNodeData> {
  return { id, type: 'attribute', position: pos, data: { label: attr.name, kind: attr.kind, ownerId } }
}

// ─── Posizionamento radiale ───────────────────────────────────
const ATTR_ORBIT       = 120
const CHILD_ATTR_ORBIT = 80

function radialPos(center: { x: number; y: number }, i: number, total: number, orbit: number, nodeR = 22) {
  const angle = (2 * Math.PI * i) / total - Math.PI / 2
  return {
    x: center.x + orbit * Math.cos(angle) - nodeR,
    y: center.y + orbit * Math.sin(angle) - nodeR,
  }
}

function geoOf(node: Node): NodeGeometry {
  return { type: node.type, position: node.position, width: node.width, height: node.height }
}

// ─── Store ───────────────────────────────────────────────────

export const useDiagramStore = create<DiagramState>()(
  persist(
    immer((set, get) => ({
      nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 },
      selectedNodeId: null, history: [], historyIndex: -1,
      projectName: 'Diagramma ER',

      // ── React Flow ───────────────────────────────────────
      onNodesChange: (changes) =>
        set((s) => {
          const removals = changes
            .filter((c) => c.type === 'remove')
            .map((c) => (c as { type: 'remove'; id: string }).id)

          for (const rid of removals) {
            const rNode = s.nodes.find((n) => n.id === rid)
            if (rNode?.type === 'attribute') {
              const owner = s.nodes.find((n) => n.id === (rNode.data as AttributeNodeData).ownerId)
              if (owner) {
                owner.data.attributes = owner.data.attributes.filter((a: AttributeData) => a.id !== rid)
              }
              s.edges = s.edges.filter((e) => e.source !== rid && e.target !== rid)
            } else if (rNode?.type === 'entity') {
              s.edges = s.edges.filter(
                (e) => !(e.type === 'generalization' && (e.source === rid || e.target === rid)),
              )
              for (const n of s.nodes) {
                if (n.type === 'entity' && n.data.generalization) {
                  n.data.generalization.childIds = n.data.generalization.childIds.filter(
                    (cid: string) => cid !== rid,
                  )
                }
              }
            }
          }
          s.nodes = applyNodeChanges(changes, s.nodes)
        }),

      onEdgesChange: (changes) =>
        set((s) => { s.edges = applyEdgeChanges(changes, s.edges) }),

      onConnect: (connection) => {
        const { nodes } = get()
        const src = nodes.find((n) => n.id === connection.source)
        const tgt = nodes.find((n) => n.id === connection.target)
        if (src?.type === 'attribute' || tgt?.type === 'attribute') return
        if (src?.type === 'entity' && tgt?.type === 'entity') return
        get().pushHistory()
        set((s) => {
          s.edges = addEdge({ ...connection, type: 'association', data: { cardinality: '(1,1)' } }, s.edges)
        })
      },

      setViewport: (vp) => set((s) => { s.viewport = vp }),

      // ── Entità ───────────────────────────────────────────
      addEntity: (pos) => {
        get().pushHistory()
        const id = nanoid()
        set((s) => { s.nodes.push(makeEntityNode(id, pos)) })
        return id
      },

      updateEntityLabel: (id, label) =>
        set((s) => { const n = s.nodes.find((n) => n.id === id); if (n) n.data.label = label }),

      addAttributeToEntity: (entityId, attr) => {
        get().pushHistory()
        const attrId = nanoid()
        const full: AttributeData = { ...attr, id: attrId }
        set((s) => {
          const entity = s.nodes.find((n) => n.id === entityId)
          if (!entity) return
          entity.data.attributes.push(full)
          const all: AttributeData[] = entity.data.attributes
          const geo = geoOf(entity)
          const center = nodeCenter(geo)
          all.forEach((a, i) => {
            const pos     = radialPos(center, i, all.length, ATTR_ORBIT)
            const existing = s.nodes.find((n) => n.id === a.id)
            if (existing) { existing.position = pos }
            else {
              s.nodes.push(makeAttributeNode(a.id, pos, a, entityId))
              s.edges.push({
                id: nanoid(), source: entityId, target: a.id,
                type: 'attribute-link',
                data: { cardinality: ATTR_CARDINALITY[a.kind] },
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
          entity.data.attributes = entity.data.attributes.filter((a: AttributeData) => a.id !== attrId)
          s.nodes = s.nodes.filter((n) => n.id !== attrId)
          s.edges = s.edges.filter((e) => e.source !== attrId && e.target !== attrId)
          const rem: AttributeData[] = entity.data.attributes
          const center = nodeCenter(geoOf(entity))
          rem.forEach((a, i) => {
            const node = s.nodes.find((n) => n.id === a.id)
            if (node) node.position = radialPos(center, i, rem.length, ATTR_ORBIT)
          })
        })
      },

      setGeneralization: (parentId, childIds, coverage, disjoint) => {
        get().pushHistory()
        set((s) => {
          const pn = s.nodes.find((n) => n.id === parentId)
          if (!pn) return
          pn.data.generalization = { childIds, coverage, disjoint }
          s.edges = s.edges.filter((e) => !(e.type === 'generalization' && e.target === parentId))
          for (const cid of childIds) {
            s.edges.push({
              id: nanoid(), source: cid, target: parentId,
              type: 'generalization', data: { coverage, disjoint, waypoints: [] },
            })
          }
        })
      },

      // ── Relazione ────────────────────────────────────────
      addRelation: (pos) => {
        get().pushHistory()
        const id = nanoid()
        set((s) => { s.nodes.push(makeRelationNode(id, pos)) })
        return id
      },

      updateRelationLabel: (id, label) =>
        set((s) => { const n = s.nodes.find((n) => n.id === id); if (n) n.data.label = label }),

      setCardinality: (edgeId, cardinality) =>
        set((s) => { const e = s.edges.find((e) => e.id === edgeId); if (e) e.data = { ...e.data, cardinality } }),

      addAttributeToRelation: (relationId, attr) => {
        get().pushHistory()
        const attrId = nanoid()
        const full: AttributeData = { ...attr, id: attrId }
        set((s) => {
          const relation = s.nodes.find((n) => n.id === relationId)
          if (!relation) return
          relation.data.attributes.push(full)
          const all: AttributeData[] = relation.data.attributes
          const center = nodeCenter(geoOf(relation))
          all.forEach((a: AttributeData, i: number) => {
            const existing = s.nodes.find((n) => n.id === a.id)
            const pos = radialPos(center, i, all.length, ATTR_ORBIT)
            if (!existing) {
              s.nodes.push(makeAttributeNode(a.id, pos, a, relationId))
              s.edges.push({
                id: nanoid(), source: relationId, target: a.id,
                type: 'attribute-link',
                data: { cardinality: ATTR_CARDINALITY[a.kind] },
              })
            } else { existing.position = pos }
          })
        })
      },

      // ── Attributi composti / chiave composta ──────────────
      addChildAttribute: (parentAttrId, attr) => {
        get().pushHistory()
        const childId = nanoid()
        const full: AttributeData = { ...attr, id: childId }
        set((s) => {
          const parentAttr = s.nodes.find((n) => n.id === parentAttrId)
          if (!parentAttr || parentAttr.type !== 'attribute') return

          if (!parentAttr.data.childAttributeIds) parentAttr.data.childAttributeIds = []
          parentAttr.data.childAttributeIds.push(childId)

          const allChildIds: string[] = parentAttr.data.childAttributeIds
          const total = allChildIds.length

          // Il nodo attributo potrebbe non avere ancora width/height misurati dal DOM.
          // Usiamo le dimensioni fisiche corrette in base al kind (composite = ellisse 56×28,
          // composite-key = cerchio r=10, altrimenti cerchio r=8).
          const parentKind = (parentAttr.data as AttributeNodeData).kind
          const parentW = parentKind === 'composite' ? 56
                        : parentKind === 'composite-key' ? 20
                        : 16
          const parentH = parentKind === 'composite' ? 28
                        : parentKind === 'composite-key' ? 20
                        : 16
          const center = {
            x: parentAttr.position.x + parentW / 2,
            y: parentAttr.position.y + parentH / 2,
          }

          allChildIds.forEach((cid, i) => {
            const pos = radialPos(center, i, total, CHILD_ATTR_ORBIT)
            const existing = s.nodes.find((n) => n.id === cid)
            if (existing) {
              existing.position = pos
            } else {
              s.nodes.push(makeAttributeNode(cid, pos, full, parentAttrId))
              s.edges.push({
                id: nanoid(), source: parentAttrId, target: cid,
                type: 'attribute-link', data: {},
              })
            }
          })
        })
      },

      // ── Collegamento Relazione ↔ Entità ──────────────────
      connectRelationToEntity: (relationId, entityId, cardinality) => {
        get().pushHistory()
        set((s) => {
          s.edges.push({
            id: nanoid(), source: relationId, target: entityId,
            type: 'association', data: { cardinality },
          })
        })
      },

      disconnectRelationFromEntity: (edgeId) => {
        get().pushHistory()
        set((s) => { s.edges = s.edges.filter((e) => e.id !== edgeId) })
      },

      setEdgeData: (edgeId, data) =>
        set((s) => {
          const edge = s.edges.find((e) => e.id === edgeId)
          if (edge) edge.data = { ...edge.data, ...data }
        }),

      selectNode: (id) => set((s) => { s.selectedNodeId = id }),

      pushHistory: () =>
        set((s) => {
          const snap: HistorySnapshot = {
            nodes: JSON.parse(JSON.stringify(s.nodes)),
            edges: JSON.parse(JSON.stringify(s.edges)),
          }
          s.history      = s.history.slice(0, s.historyIndex + 1)
          s.history.push(snap)
          s.historyIndex = s.history.length - 1
        }),

      undo: () =>
        set((s) => {
          if (s.historyIndex <= 0) return
          s.historyIndex -= 1
          const snap = s.history[s.historyIndex]
          s.nodes = snap.nodes
          s.edges = snap.edges
        }),

      loadProject: (project) =>
        set((s) => {
          s.nodes = project.nodes as Node[]
          s.edges = project.edges as Edge[]
          s.viewport = project.viewport
          s.projectName = project.name
          s.history = []; s.historyIndex = -1
        }),

      resetProject: () =>
        set((s) => {
          s.nodes = []; s.edges = []; s.viewport = { x: 0, y: 0, zoom: 1 }
          s.history = []; s.historyIndex = -1; s.selectedNodeId = null
          s.projectName = 'Diagramma ER'
        }),

      setProjectName: (name) => set((s) => { s.projectName = name }),
    })),
    {
      name: 'er-diagram-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ nodes: s.nodes, edges: s.edges, viewport: s.viewport, projectName: s.projectName }),
    },
  ),
)

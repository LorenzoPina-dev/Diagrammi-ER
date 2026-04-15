import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Connection, EdgeChange, NodeChange, Viewport } from 'reactflow'
import {
  DEFAULT_PROJECT_NAME,
  DEFAULT_VIEWPORT,
  DEFAULT_ASSOCIATION_CARDINALITY,
  isValidDiagramConnection,
} from '../lib/er'
import { nanoid } from './nanoid'
import {
  addAttributeToOwner,
  applyDiagramEdgeChanges,
  applyDiagramNodeChanges,
  cloneHistorySnapshot,
  createAssociationEdge,
  createEntityNode,
  createRelationNode,
  findNodeById,
  handleNodeRemoval,
  HistorySnapshot,
  removeAttributeSubtree,
  setGeneralizationGroup,
} from './diagramStore.utils'
import type {
  AttributeData,
  EREdge,
  ERNode,
  ERProject,
  GeneralizationCoverage,
  GeneralizationDisjoint,
  Point,
} from '../types/er.types'

interface DiagramState {
  nodes: ERNode[]
  edges: EREdge[]
  viewport: Viewport
  selectedNodeId: string | null
  history: HistorySnapshot[]
  historyIndex: number
  projectName: string
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  setViewport: (viewport: Viewport) => void
  addEntity: (position: Point) => string
  updateEntityLabel: (id: string, label: string) => void
  addAttributeToEntity: (entityId: string, attribute: Omit<AttributeData, 'id'>) => void
  removeAttributeFromEntity: (entityId: string, attributeId: string) => void
  setGeneralization: (
    parentId: string,
    childIds: string[],
    coverage: GeneralizationCoverage,
    disjoint: GeneralizationDisjoint,
  ) => void
  addRelation: (position: Point) => string
  updateRelationLabel: (id: string, label: string) => void
  setCardinality: (edgeId: string, cardinality: string) => void
  addAttributeToRelation: (relationId: string, attribute: Omit<AttributeData, 'id'>) => void
  connectRelationToEntity: (relationId: string, entityId: string, cardinality: string) => void
  disconnectRelationFromEntity: (edgeId: string) => void
  addChildAttribute: (parentAttributeId: string, attribute: Omit<AttributeData, 'id'>) => void
  setEdgeData: (edgeId: string, data: Record<string, unknown>) => void
  selectNode: (id: string | null) => void
  undo: () => void
  pushHistory: () => void
  loadProject: (project: ERProject) => void
  resetProject: () => void
  setProjectName: (name: string) => void
}

function createAttributeData(attribute: Omit<AttributeData, 'id'>): AttributeData {
  return { ...attribute, id: nanoid() }
}

function pushNode(state: DiagramState, node: ERNode): string {
  state.nodes.push(node)
  return node.id
}

export const useDiagramStore = create<DiagramState>()(
  persist(
    immer((set, get) => ({
      nodes: [],
      edges: [],
      viewport: { ...DEFAULT_VIEWPORT },
      selectedNodeId: null,
      history: [],
      historyIndex: -1,
      projectName: DEFAULT_PROJECT_NAME,

      onNodesChange: (changes) =>
        set((state) => {
          const removals = changes.filter((change) => change.type === 'remove')
          removals.forEach((change) => handleNodeRemoval(state, change.id))

          state.nodes = applyDiagramNodeChanges(
            state.nodes,
            changes.filter((change) => change.type !== 'remove'),
          )
        }),

      onEdgesChange: (changes) =>
        set((state) => {
          state.edges = applyDiagramEdgeChanges(state.edges, changes)
        }),

      onConnect: (connection) => {
        const { nodes } = get()
        if (!isValidDiagramConnection(connection, nodes)) return
        if (!connection.source || !connection.target) return
        const source = connection.source
        const target = connection.target

        get().pushHistory()
        set((state) => {
          state.edges.push(createAssociationEdge({ source, target }))
        })
      },

      setViewport: (viewport) =>
        set((state) => {
          state.viewport = viewport
        }),

      addEntity: (position) => {
        get().pushHistory()
        const id = nanoid()
        set((state) => {
          pushNode(state, createEntityNode(id, position))
        })
        return id
      },

      updateEntityLabel: (id, label) =>
        set((state) => {
          const node = findNodeById(state.nodes, id)
          if (node?.type === 'entity') node.data.label = label
        }),

      addAttributeToEntity: (entityId, attribute) => {
        get().pushHistory()
        set((state) => {
          addAttributeToOwner(state, entityId, createAttributeData(attribute))
        })
      },

      removeAttributeFromEntity: (_entityId, attributeId) => {
        get().pushHistory()
        set((state) => {
          removeAttributeSubtree(state, attributeId)
        })
      },

      setGeneralization: (parentId, childIds, coverage, disjoint) => {
        get().pushHistory()
        set((state) => {
          setGeneralizationGroup(state, parentId, childIds, coverage, disjoint)
        })
      },

      addRelation: (position) => {
        get().pushHistory()
        const id = nanoid()
        set((state) => {
          pushNode(state, createRelationNode(id, position))
        })
        return id
      },

      updateRelationLabel: (id, label) =>
        set((state) => {
          const node = findNodeById(state.nodes, id)
          if (node?.type === 'relation') node.data.label = label
        }),

      setCardinality: (edgeId, cardinality) =>
        set((state) => {
          const edge = state.edges.find((candidate: EREdge) => candidate.id === edgeId)
          if (edge) edge.data = { ...edge.data, cardinality }
        }),

      addAttributeToRelation: (relationId, attribute) => {
        get().pushHistory()
        set((state) => {
          addAttributeToOwner(state, relationId, createAttributeData(attribute))
        })
      },

      connectRelationToEntity: (relationId, entityId, cardinality) => {
        get().pushHistory()
        set((state) => {
          state.edges.push(
            createAssociationEdge(
              { source: relationId, target: entityId },
              cardinality || DEFAULT_ASSOCIATION_CARDINALITY,
            ),
          )
        })
      },

      disconnectRelationFromEntity: (edgeId) => {
        get().pushHistory()
        set((state) => {
          state.edges = state.edges.filter((edge: EREdge) => edge.id !== edgeId)
        })
      },

      addChildAttribute: (parentAttributeId, attribute) => {
        get().pushHistory()
        set((state) => {
          addAttributeToOwner(state, parentAttributeId, createAttributeData(attribute))
        })
      },

      setEdgeData: (edgeId, data) =>
        set((state) => {
          const edge = state.edges.find((candidate: EREdge) => candidate.id === edgeId)
          if (edge) edge.data = { ...edge.data, ...data }
        }),

      selectNode: (id) =>
        set((state) => {
          state.selectedNodeId = id
        }),

      pushHistory: () =>
        set((state) => {
          state.history = state.history.slice(0, state.historyIndex + 1)
          state.history.push(cloneHistorySnapshot(state))
          state.historyIndex = state.history.length - 1
        }),

      undo: () =>
        set((state) => {
          if (state.historyIndex < 0) return

          const snapshot = state.history[state.historyIndex]
          if (!snapshot) return

          state.nodes = snapshot.nodes
          state.edges = snapshot.edges
          state.historyIndex -= 1
        }),

      loadProject: (project) =>
        set((state) => {
          state.nodes = project.nodes as ERNode[]
          state.edges = project.edges as EREdge[]
          state.viewport = project.viewport
          state.projectName = project.name
          state.history = []
          state.historyIndex = -1
        }),

      resetProject: () =>
        set((state) => {
          state.nodes = []
          state.edges = []
          state.viewport = { ...DEFAULT_VIEWPORT }
          state.history = []
          state.historyIndex = -1
          state.selectedNodeId = null
          state.projectName = DEFAULT_PROJECT_NAME
        }),

      setProjectName: (name) =>
        set((state) => {
          state.projectName = name
        }),
    })),
    {
      name: 'er-diagram-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        viewport: state.viewport,
        projectName: state.projectName,
      }),
    },
  ),
)

import { current, isDraft } from 'immer'
import { applyEdgeChanges, applyNodeChanges, type EdgeChange, type NodeChange } from 'reactflow'
import { nodeCenter, type NodeGeometry } from '../lib/path'
import {
  ATTRIBUTE_CARDINALITY_BY_KIND,
  ATTRIBUTE_ORBIT,
  CHILD_ATTRIBUTE_ORBIT,
  DEFAULT_ASSOCIATION_CARDINALITY,
} from '../lib/er'
import { nanoid } from './nanoid'
import type {
  AssociationEdge,
  AttributeData,
  AttributeLinkEdge,
  AttributeNode,
  EREdge,
  ERNode,
  EntityNode,
  GeneralizationCoverage,
  GeneralizationDisjoint,
  GeneralizationEdge,
  RelationNode,
} from '../types/er.types'

export interface HistorySnapshot {
  nodes: ERNode[]
  edges: EREdge[]
}

export interface DiagramGraphState {
  nodes: ERNode[]
  edges: EREdge[]
}

export function createEntityNode(id: string, position: { x: number; y: number }): EntityNode {
  return {
    id,
    type: 'entity',
    position,
    data: { label: 'NuovaEntita', attributes: [] },
  }
}

export function createRelationNode(id: string, position: { x: number; y: number }): RelationNode {
  return {
    id,
    type: 'relation',
    position,
    data: { label: 'NuovaRelazione', cardinalities: {}, attributes: [] },
  }
}

export function createAttributeNode(
  id: string,
  position: { x: number; y: number },
  attribute: AttributeData,
  ownerId: string,
): AttributeNode {
  return {
    id,
    type: 'attribute',
    position,
    data: {
      label: attribute.name,
      kind: attribute.kind,
      ownerId,
      childAttributeIds: attribute.childAttributeIds,
    },
  }
}

export function createAssociationEdge(
  connection: { source: string; target: string },
  cardinality = DEFAULT_ASSOCIATION_CARDINALITY,
): AssociationEdge {
  return {
    id: nanoid(),
    type: 'association',
    source: connection.source,
    target: connection.target,
    data: { cardinality },
  }
}

export function createAttributeLinkEdge(
  ownerId: string,
  attributeId: string,
  attribute: AttributeData,
): AttributeLinkEdge {
  return {
    id: nanoid(),
    source: ownerId,
    target: attributeId,
    type: 'attribute-link',
    data: { cardinality: ATTRIBUTE_CARDINALITY_BY_KIND[attribute.kind] },
  }
}

export function createGeneralizationEdge(
  childId: string,
  parentId: string,
  coverage: GeneralizationCoverage,
  disjoint: GeneralizationDisjoint,
): GeneralizationEdge {
  return {
    id: nanoid(),
    source: childId,
    target: parentId,
    type: 'generalization',
    data: { coverage, disjoint, waypoints: [] },
  }
}

export function applyDiagramNodeChanges(nodes: ERNode[], changes: NodeChange[]): ERNode[] {
  return applyNodeChanges(changes, nodes as never) as ERNode[]
}

export function applyDiagramEdgeChanges(edges: EREdge[], changes: EdgeChange[]): EREdge[] {
  return applyEdgeChanges(changes, edges as never) as EREdge[]
}

export function cloneHistorySnapshot(state: DiagramGraphState): HistorySnapshot {
  const nodes = isDraft(state.nodes) ? current(state.nodes) : state.nodes
  const edges = isDraft(state.edges) ? current(state.edges) : state.edges

  return structuredClone({
    nodes,
    edges,
  })
}

export function toNodeGeometry(node: ERNode): NodeGeometry {
  return {
    type: node.type,
    position: node.position,
    width: node.width,
    height: node.height,
    attrKind: node.type === 'attribute' ? node.data.kind : undefined,
  }
}

export function radialPosition(
  center: { x: number; y: number },
  index: number,
  total: number,
  orbit: number,
  nodeRadius = 22,
): { x: number; y: number } {
  const angle = (2 * Math.PI * index) / Math.max(total, 1) - Math.PI / 2

  return {
    x: center.x + orbit * Math.cos(angle) - nodeRadius,
    y: center.y + orbit * Math.sin(angle) - nodeRadius,
  }
}

export function addAttributeToOwner(
  state: DiagramGraphState,
  ownerId: string,
  attribute: AttributeData,
): void {
  const owner = findNodeById(state.nodes, ownerId)
  if (!owner) return

  if (owner.type === 'entity' || owner.type === 'relation') {
    owner.data.attributes.push(attribute)
    layoutOwnedAttributes(state, owner, owner.data.attributes, ATTRIBUTE_ORBIT)
    return
  }

  if (!isAttributeNode(owner)) return

  owner.data.childAttributeIds = [...(owner.data.childAttributeIds ?? []), attribute.id]
  const position = radialPosition(
    nodeCenter(toNodeGeometry(owner)),
    owner.data.childAttributeIds.length - 1,
    owner.data.childAttributeIds.length,
    CHILD_ATTRIBUTE_ORBIT,
  )
  const existingNode = findNodeById(state.nodes, attribute.id)

  if (isAttributeNode(existingNode)) {
    existingNode.position = position
    existingNode.data.label = attribute.name
    existingNode.data.kind = attribute.kind
    existingNode.data.ownerId = owner.id
  } else {
    state.nodes.push(createAttributeNode(attribute.id, position, attribute, owner.id))
    state.edges.push(createAttributeLinkEdge(owner.id, attribute.id, attribute))
  }

  layoutChildAttributes(state, owner)
  syncAttributeMetadata(state.nodes, owner.id, owner.data.childAttributeIds)
}

export function removeAttributeSubtree(
  state: DiagramGraphState,
  attributeId: string,
): void {
  const root = findNodeById(state.nodes, attributeId)
  if (!isAttributeNode(root)) return

  const removedIds = collectAttributeSubtreeIds(state.nodes, attributeId)
  detachAttributeFromOwner(state.nodes, root.data.ownerId, attributeId)

  state.nodes = state.nodes.filter((node) => !removedIds.has(node.id))
  state.edges = state.edges.filter(
    (edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target),
  )

  const owner = findNodeById(state.nodes, root.data.ownerId)
  if (owner?.type === 'entity' || owner?.type === 'relation') {
    layoutOwnedAttributes(state, owner, owner.data.attributes, ATTRIBUTE_ORBIT)
  } else if (isAttributeNode(owner)) {
    layoutChildAttributes(state, owner)
    syncAttributeMetadata(state.nodes, owner.id, owner.data.childAttributeIds)
  }
}

export function removeEntityGeneralizationReferences(
  state: DiagramGraphState,
  entityId: string,
): void {
  state.edges = state.edges.filter(
    (edge) => !(edge.type === 'generalization' && (edge.source === entityId || edge.target === entityId)),
  )

  for (const node of state.nodes) {
    if (node.type !== 'entity' || !node.data.generalization) continue

    node.data.generalization.childIds = node.data.generalization.childIds.filter(
      (childId) => childId !== entityId,
    )

    if (node.data.generalization.childIds.length === 0) {
      delete node.data.generalization
    }
  }
}

export function setGeneralizationGroup(
  state: DiagramGraphState,
  parentId: string,
  childIds: string[],
  coverage: GeneralizationCoverage,
  disjoint: GeneralizationDisjoint,
): void {
  const parentNode = findNodeById(state.nodes, parentId)
  if (!isEntityNode(parentNode)) return

  if (childIds.length === 0) {
    delete parentNode.data.generalization
  } else {
    parentNode.data.generalization = { childIds, coverage, disjoint }
  }

  state.edges = state.edges.filter(
    (edge) => !(edge.type === 'generalization' && edge.target === parentId),
  )

  childIds.forEach((childId) => {
    state.edges.push(createGeneralizationEdge(childId, parentId, coverage, disjoint))
  })
}

export function findNodeById(nodes: ERNode[], id: string): ERNode | undefined {
  return nodes.find((node) => node.id === id)
}

export function isEntityNode(node: ERNode | undefined): node is EntityNode {
  return node?.type === 'entity'
}

export function isRelationNode(node: ERNode | undefined): node is RelationNode {
  return node?.type === 'relation'
}

export function isAttributeNode(node: ERNode | undefined): node is AttributeNode {
  return node?.type === 'attribute'
}

export function handleNodeRemoval(state: DiagramGraphState, nodeId: string): void {
  const node = findNodeById(state.nodes, nodeId)
  if (!node) return

  if (node.type === 'attribute') {
    removeAttributeSubtree(state, node.id)
    return
  }

  if (node.type === 'entity') {
    removeEntityGeneralizationReferences(state, node.id)
  }
}

function layoutOwnedAttributes(
  state: DiagramGraphState,
  owner: EntityNode | RelationNode,
  attributes: AttributeData[],
  orbit: number,
): void {
  const center = nodeCenter(toNodeGeometry(owner))

  attributes.forEach((attribute, index) => {
    const position = radialPosition(center, index, attributes.length, orbit)
    const existingNode = findNodeById(state.nodes, attribute.id)

    if (isAttributeNode(existingNode)) {
      existingNode.position = position
      existingNode.data.label = attribute.name
      existingNode.data.kind = attribute.kind
      existingNode.data.ownerId = owner.id
      existingNode.data.childAttributeIds = attribute.childAttributeIds
      return
    }

    state.nodes.push(createAttributeNode(attribute.id, position, attribute, owner.id))
    state.edges.push(createAttributeLinkEdge(owner.id, attribute.id, attribute))
  })
}

function layoutChildAttributes(state: DiagramGraphState, owner: AttributeNode): void {
  const childIds = owner.data.childAttributeIds ?? []
  const center = nodeCenter(toNodeGeometry(owner))

  childIds.forEach((childId, index) => {
    const childNode = findNodeById(state.nodes, childId)
    if (!isAttributeNode(childNode)) return

    childNode.position = radialPosition(center, index, childIds.length, CHILD_ATTRIBUTE_ORBIT)
  })
}

function collectAttributeSubtreeIds(nodes: ERNode[], rootId: string): Set<string> {
  const queue = [rootId]
  const collected = new Set<string>()

  while (queue.length > 0) {
    const currentId = queue.pop()
    if (!currentId || collected.has(currentId)) continue

    collected.add(currentId)

    const currentNode = findNodeById(nodes, currentId)
    if (!isAttributeNode(currentNode)) continue

    ;(currentNode.data.childAttributeIds ?? []).forEach((childId) => {
      if (!collected.has(childId)) queue.push(childId)
    })
  }

  return collected
}

function detachAttributeFromOwner(nodes: ERNode[], ownerId: string, attributeId: string): void {
  const owner = findNodeById(nodes, ownerId)
  if (!owner) return

  if (owner.type === 'entity' || owner.type === 'relation') {
    owner.data.attributes = owner.data.attributes.filter((attribute) => attribute.id !== attributeId)
    return
  }

  if (!isAttributeNode(owner)) return

  owner.data.childAttributeIds = (owner.data.childAttributeIds ?? []).filter(
    (childId) => childId !== attributeId,
  )
}

function syncAttributeMetadata(nodes: ERNode[], attributeId: string, childAttributeIds?: string[]): void {
  for (const node of nodes) {
    if (node.type !== 'entity' && node.type !== 'relation') continue

    const attribute = node.data.attributes.find((entry) => entry.id === attributeId)
    if (!attribute) continue

    attribute.childAttributeIds = childAttributeIds
    return
  }
}

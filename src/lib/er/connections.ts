import type { Connection } from 'reactflow'
import type { ERNode } from '../../types/er.types'

export function isValidDiagramConnection(
  connection: Pick<Connection, 'source' | 'target'>,
  nodes: ERNode[],
): boolean {
  const sourceNode = nodes.find((node) => node.id === connection.source)
  const targetNode = nodes.find((node) => node.id === connection.target)

  if (!sourceNode || !targetNode) return false
  if (sourceNode.id === targetNode.id && sourceNode.type === 'relation') return false
  if (sourceNode.type === 'attribute' || targetNode.type === 'attribute') return false
  if (sourceNode.type === 'entity' && targetNode.type === 'entity') return false

  return true
}

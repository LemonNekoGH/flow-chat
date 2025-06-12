import type { Edge, Node } from '@vue-flow/core'
import type { NodeData } from '~/types/node'
import dagre from '@dagrejs/dagre'
import { Position, useVueFlow } from '@vue-flow/core'
import { ref } from 'vue'

/**
 * Composable to run the layout algorithm on the graph.
 * It uses the `dagre` library to calculate the layout of the nodes and edges.
 */
export function useLayout() {
  const { findNode } = useVueFlow()

  const graph = ref(new dagre.graphlib.Graph())

  function layout(nodes: Node<NodeData>[], edges: Edge[]) {
    // we create a new graph instance, in case some nodes/edges were removed, otherwise dagre would act as if they were still there
    const dagreGraph = new dagre.graphlib.Graph()

    graph.value = dagreGraph

    dagreGraph.setDefaultEdgeLabel(() => ({}))

    dagreGraph.setGraph({ rankdir: 'LR' })

    for (const node of nodes) {
      // if you need width+height of nodes for your layout, you can use the dimensions property of the internal node (`GraphNode` type)
      const graphNode = findNode(node.id)

      if (!graphNode) {
        continue
      }

      dagreGraph.setNode(node.id, { width: graphNode.dimensions.width || 150, height: graphNode.dimensions.height || 50 })
    }

    for (const edge of edges) {
      dagreGraph.setEdge(edge.source, edge.target)
    }

    dagre.layout(dagreGraph)

    // We prefer to use the top left corner as anchor point, but dagre result is center of the node,
    // so we need to calc the top left padding of the graph then trim the blank space
    let leftPadding = 0
    let topPadding = 0
    dagreGraph.nodes().forEach((nodeId) => {
      const node = dagreGraph.node(nodeId)
      if (!node) {
        return
      }
      if (leftPadding === 0) {
        leftPadding = node.x
      }
      if (topPadding === 0) {
        topPadding = node.y
      }
      if (node.x < leftPadding) {
        leftPadding = node.x
      }
      if (node.y < topPadding) {
        topPadding = node.y
      }
    })

    // set nodes with updated positions
    return nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id)

      if (!nodeWithPosition) {
        return node
      }

      return {
        ...node,
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        position: { x: nodeWithPosition.x - leftPadding, y: nodeWithPosition.y - topPadding },
      }
    })
  }

  return { graph, layout }
}

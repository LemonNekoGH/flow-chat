import type { Root } from 'hast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

export const rehypeToolCall: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, (node, index, parent) => {
      if (node.type !== 'raw' || !parent)
        return

      const rawNode = node as { value: string }
      const match = rawNode.value.match(/<div data-tool-call-id="([^"]+)" class="tool-call-placeholder"><\/div>/)

      if (!match)
        return

      const toolCallId = match[1]

      const elementNode = {
        type: 'element' as const,
        tagName: 'div',
        properties: {
          'data-tool-call-id': toolCallId,
          'class': 'tool-call-placeholder',
        },
        children: [],
      }

      if (typeof index === 'number' && Array.isArray(parent.children)) {
        parent.children[index] = elementNode
      }
    })
  }
}

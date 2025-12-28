import type { Root } from 'mdast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

interface RemarkToolCallOptions {}

interface NodeWithData {
  type: string
  value?: string
  data?: {
    hProperties?: Record<string, unknown>
    toolCallId?: string
  }
  children?: NodeWithData[]
}

export const remarkToolCall: Plugin<[RemarkToolCallOptions?], Root> = () => {
  return (tree: Root) => {
    visit(tree, (node) => {
      if (node.type !== 'paragraph')
        return

      const paragraph = node as NodeWithData
      if (!paragraph.children || paragraph.children.length !== 1)
        return

      const textNode = paragraph.children[0]
      if (textNode.type !== 'text')
        return

      const text = (textNode as { value: string }).value
      const match = text.match(/^:::tool-call\s+([a-f0-9-]{36}):::$/i)

      if (!match)
        return

      const toolCallId = match[1]

      const htmlNode: NodeWithData = {
        type: 'html',
        value: `<div data-tool-call-id="${toolCallId}" class="tool-call-placeholder"></div>`,
        data: {
          hProperties: {
            'data-tool-call-id': toolCallId,
          },
          toolCallId,
        },
      }

      Object.assign(paragraph, htmlNode)
      delete paragraph.children
    })
  }
}

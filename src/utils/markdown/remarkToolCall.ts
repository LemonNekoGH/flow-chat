import type { Root } from 'mdast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

interface RemarkToolCallOptions {
  // 可选：用于在解析时验证 UUID 格式
}

type NodeWithData = {
  type: string
  value?: string
  data?: {
    hProperties?: Record<string, unknown>
    toolCallId?: string
  }
  children?: NodeWithData[]
}

/**
 * Remark 插件：解析 :::tool-call uuid::: 语法
 * 将其转换为带有 data-tool-call-id 属性的 HTML 元素
 * 这样可以在 rehype 阶段被处理，或者在 VueMarkdown 中使用插槽处理
 */
export const remarkToolCall: Plugin<[RemarkToolCallOptions?], Root> = (options = {}) => {
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
      // 匹配 :::tool-call uuid::: 格式
      const match = text.match(/^:::tool-call\s+([a-f0-9-]{36}):::$/i)

      if (!match)
        return

      const toolCallId = match[1]

      // 将段落节点转换为 HTML 节点，生成一个可以被 VueMarkdown 识别的 HTML 元素
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

      // 替换整个段落
      Object.assign(paragraph, htmlNode)
      delete paragraph.children
    })
  }
}

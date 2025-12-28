import type { Root } from 'hast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

interface RehypeToolCallOptions {
  // 可选配置
}

/**
 * Rehype 插件：处理工具调用占位符
 * 将带有 data-tool-call-id 的 div 转换为可以被 VueMarkdown 插槽处理的格式
 */
export const rehypeToolCall: Plugin<[RehypeToolCallOptions?], Root> = (options = {}) => {
  return (tree: Root) => {
    visit(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'div')
        return

      const element = node as {
        type: 'element'
        tagName: string
        properties?: Record<string, unknown>
        children?: unknown[]
      }

      const toolCallId = element.properties?.['data-tool-call-id']
      if (!toolCallId || typeof toolCallId !== 'string')
        return

      // 添加一个特殊的 class，以便 VueMarkdown 可以识别
      const classList = (element.properties.class as string[]) || []
      if (!classList.includes('tool-call-placeholder'))
        classList.push('tool-call-placeholder')
      element.properties.class = classList

      // 确保 data-tool-call-id 属性存在
      element.properties['data-tool-call-id'] = toolCallId
    })
  }
}

import type { Root } from 'hast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

export const rehypeToolCall: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'div')
        return

      const toolCallId = node.properties?.['data-tool-call-id']
      if (!toolCallId || typeof toolCallId !== 'string')
        return

      const classList = (node.properties.class as string[]) || []
      if (!classList.includes('tool-call-placeholder'))
        classList.push('tool-call-placeholder')
      node.properties.class = classList
    })
  }
}

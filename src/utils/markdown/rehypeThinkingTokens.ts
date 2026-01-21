import type { Root } from 'hast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

const thinkingTags = new Set(['think', 'thinking'])

function normalizeClassList(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter(item => typeof item === 'string' && item.trim().length > 0)
  if (typeof value === 'string')
    return value.split(' ').map(item => item.trim()).filter(Boolean)
  return []
}

export const rehypeThinkingTokens: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, (node) => {
      if (node.type !== 'element')
        return

      const tagName = node.tagName?.toLowerCase()
      if (!tagName || !thinkingTags.has(tagName))
        return

      const properties = node.properties ?? {}
      const classList = normalizeClassList(properties.class)
      if (!classList.includes('thinking-placeholder'))
        classList.push('thinking-placeholder')

      node.tagName = 'div'
      node.properties = {
        ...properties,
        class: classList,
        'data-thinking': 'true',
        'data-thinking-tag': tagName,
      }
    })
  }
}

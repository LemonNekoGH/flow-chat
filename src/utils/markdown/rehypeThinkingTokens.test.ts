import type { Root } from 'hast'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { describe, expect, it } from 'vitest'
import { rehypeThinkingTokens } from './rehypeThinkingTokens'

function processHast(hast: Root) {
  const processor = unified()
    .use(rehypeThinkingTokens)

  return processor.run(hast) as Promise<Root>
}

function extractDivElements(tree: Root) {
  const divs: Array<{ tagName: string, properties?: Record<string, unknown> }> = []
  visit(tree, (node) => {
    if (node.type === 'element' && node.tagName === 'div') {
      divs.push(node as { tagName: string, properties?: Record<string, unknown> })
    }
  })
  return divs
}

describe('rehypeThinkingTokens', () => {
  it('converts think elements to placeholders', async () => {
    const hast: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'think',
          properties: {},
          children: [
            { type: 'text', value: 'Reasoning here' },
          ],
        },
      ],
    }

    const processed = await processHast(hast)
    const divs = extractDivElements(processed)

    expect(divs).toHaveLength(1)
    expect(divs[0].properties?.['data-thinking']).toBe('true')
    expect(divs[0].properties?.['data-thinking-tag']).toBe('think')
    const classList = Array.isArray(divs[0].properties?.class)
      ? divs[0].properties.class
      : typeof divs[0].properties?.class === 'string'
        ? [divs[0].properties.class]
        : []
    expect(classList).toContain('thinking-placeholder')
  })

  it('preserves existing class names', async () => {
    const hast: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'thinking',
          properties: {
            class: ['existing-class'],
          },
          children: [],
        },
      ],
    }

    const processed = await processHast(hast)
    const divs = extractDivElements(processed)

    expect(divs).toHaveLength(1)
    const classList = Array.isArray(divs[0].properties?.class)
      ? divs[0].properties.class
      : typeof divs[0].properties?.class === 'string'
        ? [divs[0].properties.class]
        : []
    expect(classList).toContain('existing-class')
    expect(classList).toContain('thinking-placeholder')
    expect(divs[0].properties?.['data-thinking-tag']).toBe('thinking')
  })

  it('does not modify non-thinking elements', async () => {
    const hast: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            class: ['other-class'],
          },
          children: [],
        },
      ],
    }

    const processed = await processHast(hast)
    const divs = extractDivElements(processed)
    expect(divs).toHaveLength(0)
  })
})

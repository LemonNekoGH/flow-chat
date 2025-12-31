import type { Root } from 'hast'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { describe, expect, it } from 'vitest'
import { rehypeToolCall } from './rehypeToolCall'

function processHast(hast: Root) {
  const processor = unified()
    .use(rehypeToolCall)

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

describe('rehypeToolCall', () => {
  it('adds tool-call-placeholder class to div with data-tool-call-id', async () => {
    const toolCallId = '123e4567-e89b-12d3-a456-426614174000'
    const hast: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'div',
          properties: {
            'data-tool-call-id': toolCallId,
          },
          children: [],
        },
      ],
    }

    const processed = await processHast(hast)
    const divs = extractDivElements(processed)

    expect(divs).toHaveLength(1)
    expect(divs[0].properties?.['data-tool-call-id']).toBe(toolCallId)
    const classList = Array.isArray(divs[0].properties?.class)
      ? divs[0].properties.class
      : typeof divs[0].properties?.class === 'string'
        ? [divs[0].properties.class]
        : []
    expect(classList).toContain('tool-call-placeholder')
  })

  it('preserves existing class names', async () => {
    const toolCallId = '123e4567-e89b-12d3-a456-426614174000'
    const hast: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'div',
          properties: {
            'data-tool-call-id': toolCallId,
            'class': ['existing-class'],
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
    expect(classList).toContain('tool-call-placeholder')
  })

  it('does not modify divs without data-tool-call-id', async () => {
    const hast: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'div',
          properties: {
            class: ['other-class'],
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
    expect(classList).not.toContain('tool-call-placeholder')
    expect(classList).toContain('other-class')
  })

  it('handles multiple tool call divs', async () => {
    const toolCallId1 = '123e4567-e89b-12d3-a456-426614174000'
    const toolCallId2 = '223e4567-e89b-12d3-a456-426614174001'
    const hast: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'div',
          properties: {
            'data-tool-call-id': toolCallId1,
          },
          children: [],
        },
        {
          type: 'text',
          value: 'Some text',
        },
        {
          type: 'element',
          tagName: 'div',
          properties: {
            'data-tool-call-id': toolCallId2,
          },
          children: [],
        },
      ],
    }

    const processed = await processHast(hast)
    const divs = extractDivElements(processed)

    const toolCallDivs = divs.filter(d => d.properties?.['data-tool-call-id'])
    expect(toolCallDivs).toHaveLength(2)
    expect(toolCallDivs[0].properties?.['data-tool-call-id']).toBe(toolCallId1)
    expect(toolCallDivs[1].properties?.['data-tool-call-id']).toBe(toolCallId2)
    toolCallDivs.forEach((div) => {
      const classList = Array.isArray(div.properties?.class)
        ? div.properties.class
        : typeof div.properties?.class === 'string'
          ? [div.properties.class]
          : []
      expect(classList).toContain('tool-call-placeholder')
    })
  })

  it('does not modify non-div elements', async () => {
    const hast: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            'data-tool-call-id': '123e4567-e89b-12d3-a456-426614174000',
          },
          children: [],
        },
      ],
    }

    const processed = await processHast(hast)
    const spans: Array<{ tagName: string, properties?: Record<string, unknown> }> = []
    visit(processed, (node) => {
      if (node.type === 'element' && node.tagName === 'span')
        spans.push(node as { tagName: string, properties?: Record<string, unknown> })
    })

    expect(spans).toHaveLength(1)
    const classList = Array.isArray(spans[0]?.properties?.class)
      ? spans[0].properties.class
      : typeof spans[0]?.properties?.class === 'string'
        ? [spans[0].properties.class]
        : []
    expect(classList).not.toContain('tool-call-placeholder')
  })

  it('handles divs with data-tool-call-id but no class', async () => {
    const toolCallId = '123e4567-e89b-12d3-a456-426614174000'
    const hast: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'div',
          properties: {
            'data-tool-call-id': toolCallId,
          },
          children: [],
        },
      ],
    }

    const processed = await processHast(hast)
    const divs = extractDivElements(processed)

    expect(divs).toHaveLength(1)
    expect(divs[0].properties?.['data-tool-call-id']).toBe(toolCallId)
    const classList = Array.isArray(divs[0].properties?.class)
      ? divs[0].properties.class
      : typeof divs[0].properties?.class === 'string'
        ? [divs[0].properties.class]
        : []
    expect(classList).toContain('tool-call-placeholder')
  })
})

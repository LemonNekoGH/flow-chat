import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { describe, expect, it } from 'vitest'
import { remarkToolCall } from './remarkToolCall'

describe('remarkToolCall', () => {
  it('converts tool call syntax to HTML node', async () => {
    const toolCallId = '123e4567-e89b-12d3-a456-426614174000'
    const markdown = `:::tool-call ${toolCallId}:::`

    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkToolCall)

    const tree = processor.parse(markdown)
    const processed = await processor.run(tree)

    const htmlNodes: Array<{ value: string, data?: unknown }> = []
    visit(processed, (node: any) => {
      if (node.type === 'html')
        htmlNodes.push(node)
    })

    expect(htmlNodes).toHaveLength(1)
    expect(htmlNodes[0].value).toBe(`<div data-tool-call-id="${toolCallId}" class="tool-call-placeholder"></div>`)
    expect(htmlNodes[0].data?.toolCallId).toBe(toolCallId)
    expect(htmlNodes[0].data?.hProperties?.['data-tool-call-id']).toBe(toolCallId)
  })

  it('handles multiple tool call markers', async () => {
    const toolCallId1 = '123e4567-e89b-12d3-a456-426614174000'
    const toolCallId2 = '223e4567-e89b-12d3-a456-426614174001'
    const markdown = [
      `:::tool-call ${toolCallId1}:::`,
      '',
      'Some text',
      '',
      `:::tool-call ${toolCallId2}:::`,
    ].join('\n')

    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkToolCall)

    const tree = processor.parse(markdown)
    const processed = await processor.run(tree)

    const htmlNodes: Array<{ value: string }> = []
    visit(processed, (node: any) => {
      if (node.type === 'html')
        htmlNodes.push(node)
    })

    expect(htmlNodes).toHaveLength(2)
    expect(htmlNodes[0].value).toContain(toolCallId1)
    expect(htmlNodes[1].value).toContain(toolCallId2)
  })

  it('does not convert regular text', async () => {
    const markdown = 'This is just regular text with no tool call markers'

    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkToolCall)

    const tree = processor.parse(markdown)
    const processed = await processor.run(tree)

    const htmlNodes: Array<{ value: string }> = []
    visit(processed, (node: any) => {
      if (node.type === 'html')
        htmlNodes.push(node)
    })

    expect(htmlNodes).toHaveLength(0)
  })

  it('does not convert text that looks similar but is not a tool call', async () => {
    const markdown = 'This contains :::tool-call but not a valid marker:::'

    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkToolCall)

    const tree = processor.parse(markdown)
    const processed = await processor.run(tree)

    const htmlNodes: Array<{ value: string }> = []
    visit(processed, (node: any) => {
      if (node.type === 'html')
        htmlNodes.push(node)
    })

    expect(htmlNodes).toHaveLength(0)
  })

  it('requires exact format with UUID', async () => {
    const markdown = ':::tool-call not-a-uuid:::'

    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkToolCall)

    const tree = processor.parse(markdown)
    const processed = await processor.run(tree)

    const htmlNodes: Array<{ value: string }> = []
    visit(processed, (node: any) => {
      if (node.type === 'html')
        htmlNodes.push(node)
    })

    expect(htmlNodes).toHaveLength(0)
  })

  it('handles tool call marker in paragraph with other content', async () => {
    const toolCallId = '123e4567-e89b-12d3-a456-426614174000'
    const markdown = `Some text before :::tool-call ${toolCallId}::: and after`

    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkToolCall)

    const tree = processor.parse(markdown)
    const processed = await processor.run(tree)

    const htmlNodes: Array<{ value: string }> = []
    visit(processed, (node: any) => {
      if (node.type === 'html')
        htmlNodes.push(node)
    })

    expect(htmlNodes).toHaveLength(0)
  })

  it('handles tool call marker as standalone paragraph', async () => {
    const toolCallId = '123e4567-e89b-12d3-a456-426614174000'
    const markdown = [
      'Paragraph before',
      '',
      `:::tool-call ${toolCallId}:::`,
      '',
      'Paragraph after',
    ].join('\n')

    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkToolCall)

    const tree = processor.parse(markdown)
    const processed = await processor.run(tree)

    const htmlNodes: Array<{ value: string }> = []
    visit(processed, (node: any) => {
      if (node.type === 'html')
        htmlNodes.push(node)
    })

    expect(htmlNodes).toHaveLength(1)
    expect(htmlNodes[0].value).toContain(toolCallId)
  })

  it('preserves UUID case in HTML output', async () => {
    const toolCallId = '123E4567-E89B-12D3-A456-426614174000'
    const markdown = `:::tool-call ${toolCallId}:::`

    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkToolCall)

    const tree = processor.parse(markdown)
    const processed = await processor.run(tree)

    const htmlNodes: Array<{ value: string }> = []
    visit(processed, (node: any) => {
      if (node.type === 'html')
        htmlNodes.push(node)
    })

    expect(htmlNodes).toHaveLength(1)
    expect(htmlNodes[0].value).toContain(toolCallId)
  })
})

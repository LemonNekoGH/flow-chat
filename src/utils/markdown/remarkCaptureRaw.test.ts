import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { describe, expect, it } from 'vitest'
import { remarkCaptureRaw } from './remarkCaptureRaw'

describe('remarkCaptureRaw', () => {
  it('captures original markdown for tables and code blocks', async () => {
    const markdown = [
      '# Heading',
      '',
      '| Column 1 | Column 2 |',
      '|----------|----------|',
      '| Data 1   | Data 2   |',
      '',
      '```js',
      'console.log("hello")',
      '```',
      '',
    ].join('\n')

    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkCaptureRaw, { source: markdown })

    const tree = processor.parse(markdown)
    const processed = await processor.run(tree)

    const raws: string[] = []
    visit(processed, (node: any) => {
      if ((node.type === 'table' || node.type === 'code') && node.data?.raw)
        raws.push(node.data.raw)
    })

    expect(raws).toHaveLength(2)
    expect(raws[0]).toContain('| Column 1 | Column 2 |')
    expect(raws[1]).toContain('console.log("hello")')
  })
})

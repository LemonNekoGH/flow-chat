import type { Code, Root, Table } from 'mdast'
import type { Plugin } from 'unified'
import type { Position } from 'unist'
import { visit } from 'unist-util-visit'

interface RemarkCaptureRawOptions {
  source?: string
}

type NodeWithData = (Code | Table) & {
  data?: {
    raw?: string
    hProperties?: Record<string, unknown>
  }
}

function sliceRaw(source: string, position?: Position): string | undefined {
  const startOffset = position?.start?.offset
  const endOffset = position?.end?.offset

  if (typeof startOffset === 'number' && typeof endOffset === 'number')
    return source.slice(startOffset, endOffset)

  if (!position?.start || !position?.end)
    return undefined

  const lines = source.split(/\r?\n/g)
  const startLine = Math.max(0, (position.start.line ?? 1) - 1)
  const endLine = Math.max(0, (position.end.line ?? position.start.line ?? 1) - 1)

  if (startLine >= lines.length || endLine >= lines.length)
    return undefined

  const segments: string[] = []
  for (let index = startLine; index <= endLine; index += 1) {
    const line = lines[index] ?? ''
    const startColumn = index === startLine ? Math.max(0, (position.start.column ?? 1) - 1) : 0
    const endColumn = index === endLine ? Math.max(0, (position.end.column ?? line.length + 1) - 1) : line.length
    segments.push(line.slice(startColumn, endColumn))
  }

  return segments.join('\n')
}

export const remarkCaptureRaw: Plugin<[RemarkCaptureRawOptions?], Root> = (options = {}) => {
  return (tree: Root, file: { value?: unknown }) => {
    const explicitSource = options.source
    const candidate = typeof explicitSource === 'string'
      ? explicitSource
      : typeof file.value === 'string'
        ? file.value
        : undefined

    const source = candidate ?? ''
    if (!source)
      return

    visit(tree, (node) => {
      if (node.type !== 'code' && node.type !== 'table')
        return

      const raw = sliceRaw(source, node.position)
      if (!raw)
        return

      const enriched = node as NodeWithData
      enriched.data = enriched.data || {}
      enriched.data.raw = raw
      enriched.data.hProperties = {
        ...enriched.data.hProperties,
        'data-raw': raw,
      }
    })
  }
}

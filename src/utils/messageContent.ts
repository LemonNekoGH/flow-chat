import type { CommonContentPart, TextContentPart } from 'xsai'

export function isTextContentPart(part: CommonContentPart): part is TextContentPart {
  return part.type === 'text'
}

export function getMessageText(content: CommonContentPart[]): string {
  return content.filter(isTextContentPart).map(part => part.text).join('')
}

export function toTextContentParts(text: string): TextContentPart[] {
  if (!text) {
    return []
  }

  return [{ type: 'text', text }]
}

export function parseMessage(text: string): {
  model?: string
  repeat: number
  message: string
} {
  // example: model=gpt-4 repeat=2 Hello, world!
  const modelRegex = /model=(\S+)/
  const repeatRegex = /repeat=(\d+)/
  const match = text.match(modelRegex)
  const repeatMatch = text.match(repeatRegex)
  return {
    model: match ? match[1] : undefined,
    repeat: repeatMatch ? Number.parseInt(repeatMatch[1]) : 1,
    message: text.replace(modelRegex, '').replace(repeatRegex, '').trim(),
  }
}

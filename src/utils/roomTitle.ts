function cleanTitle(raw: string) {
  return raw
    .replaceAll('\r', '')
    .replaceAll('\n', ' ')
    .trim()
    .replaceAll(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim()
}

export function extractFirstSentenceTitle(text: string, maxLength = 60) {
  const cleaned = cleanTitle(text)
  if (!cleaned)
    return ''

  // Prefer sentence terminators or newlines.
  const terminators = ['\n', '。', '！', '？', '.', '!', '?', '；', ';']
  let cutIndex = -1
  for (const t of terminators) {
    const idx = cleaned.indexOf(t)
    if (idx !== -1)
      cutIndex = cutIndex === -1 ? idx : Math.min(cutIndex, idx)
  }

  const first = cutIndex === -1 ? cleaned : cleaned.slice(0, cutIndex)
  const title = cleanTitle(first).slice(0, maxLength).trim()
  return title
}

export function normalizeGeneratedTopicTitle(text: string, maxLength = 80) {
  const cleaned = cleanTitle(text)
  return cleaned.slice(0, maxLength).trim()
}

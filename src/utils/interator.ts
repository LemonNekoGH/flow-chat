export async function* asyncIteratorFromReadableStream<T, F = Uint8Array>(
  res: ReadableStream<F>,
  func: (value: F) => Promise<T>,
): AsyncGenerator<T, void, unknown> {
  const reader = res.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        return
      }

      yield func(value)
    }
  }
  finally {
    reader.releaseLock()
  }
}

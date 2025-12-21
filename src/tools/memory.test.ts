import { describe, expect, it } from 'vitest'
import { loadMemories, writeMemory } from './memory'

function createMemoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => map.set(key, value),
    removeItem: (key: string) => map.delete(key),
  }
}

describe('writeMemory', () => {
  it('writes a new global memory', () => {
    const storage = createMemoryStorage()
    const item = writeMemory(
      { content: 'User prefers concise answers.', scope: 'global', tags: ['preference'] },
      { storage },
    )
    expect(item.id).toMatch(/^mem_|^[0-9a-f-]{36}$/i)
    expect(item.scope).toBe('global')
    expect(item.roomId).toBeNull()

    const all = loadMemories(storage)
    expect(all).toHaveLength(1)
    expect(all[0]!.content).toBe('User prefers concise answers.')
  })

  it('dedupes same content within same scope+room', () => {
    const storage = createMemoryStorage()

    const first = writeMemory(
      { content: 'Use Chinese Simplified.', scope: 'room', tags: ['lang'] },
      { storage, roomId: 'room-1' },
    )
    const second = writeMemory(
      { content: 'Use Chinese Simplified.', scope: 'room', tags: ['i18n'] },
      { storage, roomId: 'room-1' },
    )

    expect(second.id).toBe(first.id)
    expect(second.tags.sort()).toEqual(['i18n', 'lang'])
    expect(loadMemories(storage)).toHaveLength(1)
  })

  it('does not dedupe across rooms', () => {
    const storage = createMemoryStorage()
    writeMemory(
      { content: 'Remember this per-room.', scope: 'room' },
      { storage, roomId: 'room-1' },
    )
    writeMemory(
      { content: 'Remember this per-room.', scope: 'room' },
      { storage, roomId: 'room-2' },
    )
    expect(loadMemories(storage)).toHaveLength(2)
  })
})

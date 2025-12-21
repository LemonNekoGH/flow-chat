import { tool } from '@xsai/tool'
import { z } from 'zod'

export type MemoryScope = 'global' | 'room'

export interface MemoryItem {
  id: string
  content: string
  tags: string[]
  scope: MemoryScope
  roomId: string | null
  createdAt: number
  updatedAt: number
}

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const DEFAULT_STORAGE_KEY = 'flow-chat/memories'

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw)
    return null
  try {
    return JSON.parse(raw) as T
  }
  catch {
    return null
  }
}

function now() {
  return Date.now()
}

function randomId(): string {
  const cryptoObj = globalThis.crypto
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID()
  }
  return `mem_${now()}_${Math.random().toString(16).slice(2)}`
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags))
    return []
  const set = new Set<string>()
  for (const tag of tags) {
    if (typeof tag !== 'string')
      continue
    const trimmed = tag.trim()
    if (trimmed)
      set.add(trimmed)
  }
  return Array.from(set)
}

export function loadMemories(storage: KeyValueStorage | undefined, key: string = DEFAULT_STORAGE_KEY): MemoryItem[] {
  if (!storage)
    return []
  const parsed = safeJsonParse<MemoryItem[]>(storage.getItem(key))
  if (!parsed || !Array.isArray(parsed))
    return []
  // Defensive: ignore malformed items.
  return parsed.filter((it): it is MemoryItem => {
    return !!it
      && typeof it.id === 'string'
      && typeof it.content === 'string'
      && Array.isArray(it.tags)
      && (it.scope === 'global' || it.scope === 'room')
      && (typeof it.roomId === 'string' || it.roomId === null)
      && typeof it.createdAt === 'number'
      && typeof it.updatedAt === 'number'
  })
}

export function saveMemories(storage: KeyValueStorage | undefined, items: MemoryItem[], key: string = DEFAULT_STORAGE_KEY) {
  if (!storage)
    return
  storage.setItem(key, JSON.stringify(items))
}

export interface WriteMemoryInput {
  content: string
  tags?: string[]
  scope?: MemoryScope
}

export interface WriteMemoryOptions {
  storage?: KeyValueStorage
  storageKey?: string
  roomId?: string | null
  dedupe?: boolean
}

/**
 * Write a memory item into storage.
 *
 * - scope=global: roomId will be stored as null
 * - scope=room: roomId will be stored (or null if not provided)
 * - dedupe: if an identical memory (same content+scope+roomId) exists, update it instead of creating a new one
 */
export function writeMemory(input: WriteMemoryInput, options: WriteMemoryOptions = {}) {
  const storage = options.storage
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY
  const dedupe = options.dedupe ?? true

  const content = input.content?.trim()
  if (!content) {
    throw new Error('Memory content is required')
  }

  const scope: MemoryScope = input.scope ?? 'global'
  const roomId = scope === 'room' ? (options.roomId ?? null) : null
  const tags = normalizeTags(input.tags)

  const items = loadMemories(storage, storageKey)
  if (dedupe) {
    const existing = items.find(it =>
      it.content === content
      && it.scope === scope
      && it.roomId === roomId,
    )
    if (existing) {
      existing.tags = Array.from(new Set([...existing.tags, ...tags]))
      existing.updatedAt = now()
      saveMemories(storage, items, storageKey)
      return existing
    }
  }

  const ts = now()
  const item: MemoryItem = {
    id: randomId(),
    content,
    tags,
    scope,
    roomId,
    createdAt: ts,
    updatedAt: ts,
  }
  items.unshift(item)
  saveMemories(storage, items, storageKey)
  return item
}

export interface CreateMemoryToolsOptions {
  roomId?: string | null
  storageKey?: string
}

export async function createMemoryTools(options: CreateMemoryToolsOptions = {}) {
  return [
    await tool({
      name: 'write_memory',
      description: 'Write a memory for future conversations (persisted locally).',
      parameters: z.object({
        content: z.string().min(1).describe('The memory to save. Keep it short and factual.'),
        scope: z.enum(['global', 'room']).default('global').describe('Save globally or only for current room.'),
        tags: z.array(z.string()).optional().describe('Optional tags for organization/search.'),
      }),
      execute: async ({ content, scope, tags }) => {
        const storage = typeof localStorage === 'undefined' ? undefined : localStorage
        const item = writeMemory(
          { content, scope, tags },
          {
            storage,
            storageKey: options.storageKey,
            roomId: options.roomId ?? null,
            dedupe: true,
          },
        )
        return `Memory saved: ${item.id}`
      },
    }),
  ]
}

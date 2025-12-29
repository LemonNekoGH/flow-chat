import type { Memory, MemoryScope } from '~/types/memory'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { useDatabaseStore } from '~/stores/database'
import * as schema from '../../db/schema'

function safeJsonParseArray(raw: string | null | undefined): string[] {
  if (!raw)
    return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed))
      return []
    return parsed.filter((it): it is string => typeof it === 'string').map(it => it.trim()).filter(Boolean)
  }
  catch {
    return []
  }
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

function mergeTags(a: string[], b: string[]) {
  return Array.from(new Set([...a, ...b]))
}

function toMemory(row: any): Memory {
  return {
    ...row,
    tags: safeJsonParseArray(row.tags),
  } as Memory
}

export interface UpsertMemoryInput {
  content: string
  scope: MemoryScope
  roomId?: string | null
  tags?: string[]
}

export function useMemoryModel() {
  const dbStore = useDatabaseStore()

  async function upsert(input: UpsertMemoryInput): Promise<Memory> {
    const content = input.content.trim()
    if (!content) {
      throw new Error('Memory content is required')
    }

    const scope = input.scope
    const roomId = scope === 'room' ? (input.roomId ?? null) : null
    const tags = normalizeTags(input.tags)

    const conditions = [
      eq(schema.memories.scope, scope),
      eq(schema.memories.content, content),
      roomId ? eq(schema.memories.room_id, roomId) : isNull(schema.memories.room_id),
    ]

    const existing = (await dbStore.db()
      .select()
      .from(schema.memories)
      .where(and(...conditions))
      .limit(1))[0]

    if (!existing) {
      const [created] = await dbStore.withCheckpoint(db => db.insert(schema.memories).values({
        content,
        scope,
        room_id: roomId,
        tags: JSON.stringify(tags),
      }).returning())
      return toMemory(created)
    }

    const merged = mergeTags(safeJsonParseArray(existing.tags), tags)
    const [updated] = await dbStore.withCheckpoint(db => db.update(schema.memories).set({
      tags: JSON.stringify(merged),
      updated_at: sql`now()`,
    }).where(eq(schema.memories.id, existing.id)).returning())

    return toMemory(updated ?? existing)
  }

  async function getByRoomId(roomId: string | null, scope?: MemoryScope) {
    const effectiveScope: MemoryScope = scope ?? (roomId ? 'room' : 'global')
    const conditions = [
      eq(schema.memories.scope, effectiveScope),
      roomId ? eq(schema.memories.room_id, roomId) : isNull(schema.memories.room_id),
    ]
    const rows = await dbStore.db().select().from(schema.memories).where(and(...conditions))
    return rows.map(toMemory)
  }

  async function getAll() {
    const rows = await dbStore.db().select().from(schema.memories).orderBy(schema.memories.created_at)
    return rows.map(toMemory)
  }

  async function deleteById(id: string) {
    return dbStore.withCheckpoint((db) => {
      return db.delete(schema.memories).where(eq(schema.memories.id, id))
    })
  }

  return {
    upsert,
    getByRoomId,
    getAll,
    deleteById,
  }
}

import type { Message } from '~/types/messages'
import { and, cosineDistance, desc, eq, getTableColumns, ilike, inArray, isNull, sql } from 'drizzle-orm'
import { useDatabaseStore } from '~/stores/database'
import * as schema from '../../db/schema'

export function useMessageModel() {
  const dbStore = useDatabaseStore()

  function getAll() {
    return dbStore.db().select().from(schema.messages)
  }

  function getByRoomId(roomId: string) {
    return dbStore.db().select().from(schema.messages).where(eq(schema.messages.room_id, roomId))
  }

  function deleteByIds(ids: string[]) {
    return dbStore.withCheckpoint((db) => {
      return db.delete(schema.messages).where(inArray(schema.messages.id, ids))
    })
  }

  async function create(msg: Omit<Message, 'id'>) {
    const message = await dbStore.withCheckpoint((db) => {
      return db.insert(schema.messages).values(msg).returning()
    })

    return message[0]
  }

  function update(id: string, msg: Message) {
    return dbStore.withCheckpoint((db) => {
      return db.update(schema.messages).set(msg).where(eq(schema.messages.id, id))
    })
  }

  function appendContent(id: string, content: string) {
    return dbStore.withCheckpoint((db) => {
      return db.execute(sql`UPDATE messages SET content = content || ${content} WHERE id = ${id}`)
    })
  }

  function updateContent(id: string, content: string) {
    return dbStore.withCheckpoint((db) => {
      return db.update(schema.messages).set({ content }).where(eq(schema.messages.id, id))
    })
  }

  function appendSummary(id: string, summary: string) {
    return dbStore.withCheckpoint((db) => {
      return db.execute(sql`UPDATE messages SET summary = COALESCE(summary, '') || ${summary} WHERE id = ${id}`)
    })
  }

  function updateSummary(id: string, summary: string) {
    return dbStore.withCheckpoint((db) => {
      return db.update(schema.messages).set({ summary }).where(eq(schema.messages.id, id))
    })
  }
  function searchByContent(keyword: string, roomId?: string) {
    const conditions = [ilike(schema.messages.content, `%${keyword}%`)]

    if (roomId) {
      conditions.push(eq(schema.messages.room_id, roomId))
    }

    return dbStore.db()
      .select()
      .from(schema.messages)
      .where(and(...conditions))
  }

  function notEmbeddedMessages() {
    return dbStore.db().select().from(schema.messages).where(isNull(schema.messages.embedding))
  }

  function updateEmbedding(id: string, embedding: number[]) {
    return dbStore.withCheckpoint((db) => {
      return db.update(schema.messages).set({ embedding }).where(eq(schema.messages.id, id))
    })
  }

  function vectorSimilaritySearch(embedding: number[], limit: number = 10) {
    const similarity = sql<number>`1 - (${cosineDistance(schema.messages.embedding, embedding)})`
    return dbStore.db()
      .select({ similarity, ...getTableColumns(schema.messages) })
      .from(schema.messages)
      .orderBy(t => desc(t.similarity))
      .limit(limit)
  }

  return {
    getAll,
    getByRoomId,
    deleteByIds,
    create,
    update,
    appendContent,
    searchByContent,
    notEmbeddedMessages,
    updateEmbedding,
    vectorSimilaritySearch,
    updateContent,
    appendSummary,
    updateSummary,

  }
}

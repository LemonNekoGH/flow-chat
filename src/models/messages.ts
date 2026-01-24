import type { InferSelectModel } from 'drizzle-orm'
import type { Message } from '~/types/messages'
import { and, cosineDistance, desc, eq, getTableColumns, ilike, inArray, isNull, sql } from 'drizzle-orm'
import { useDatabaseStore } from '~/stores/database'
import * as schema from '../../db/schema'

type MessageRow = InferSelectModel<typeof schema.messages>

function toMessage(row: MessageRow): Message {
  return {
    ...row,
    memory: row.memory,
  }
}

export function useMessageModel() {
  const dbStore = useDatabaseStore()

  function getAll() {
    return dbStore.db().select().from(schema.messages).then(rows => rows.map(toMessage))
  }

  function getByRoomId(roomId: string) {
    return dbStore.db().select().from(schema.messages).where(eq(schema.messages.room_id, roomId)).then(rows => rows.map(toMessage))
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

    return toMessage(message[0])
  }

  function update(id: string, msg: Message) {
    return dbStore.withCheckpoint((db) => {
      return db.update(schema.messages).set(msg).where(eq(schema.messages.id, id))
    })
  }

  function appendContent(id: string, content: string | string[]) {
    const contentToAppend = Array.isArray(content) ? content.join('') : content

    return dbStore.withCheckpoint((db) => {
      return db.execute(sql`UPDATE messages SET content = content || ${contentToAppend} WHERE id = ${id}`)
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

  function updateShowSummary(id: string, show_summary: boolean) {
    return dbStore.withCheckpoint((db) => {
      return db.update(schema.messages).set({ show_summary }).where(eq(schema.messages.id, id))
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
      .then(rows => rows.map(toMessage))
  }

  function notEmbeddedMessages() {
    return dbStore.db().select().from(schema.messages).where(isNull(schema.messages.embedding)).then(rows => rows.map(toMessage))
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
      .then(rows => rows.map(row => ({ ...toMessage(row), similarity: row.similarity })))
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
    updateShowSummary,

  }
}

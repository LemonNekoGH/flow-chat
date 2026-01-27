import type { CommonContentPart } from 'xsai'
import type { Message } from '~/types/messages'
import { and, asc, cosineDistance, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { useDatabaseStore } from '~/stores/database'
import * as schema from '../../db/schema'

export function combineMessagesAndParts(messagesAndParts: {
  messages: typeof schema.messages.$inferSelect
  message_parts: typeof schema.message_parts.$inferSelect | null
}[]): Message[] {
  const messagesMap = new Map<string, Message>()

  for (const { messages: message, message_parts: messagePart } of messagesAndParts) {
    if (!messagesMap.has(message.id)) {
      messagesMap.set(message.id, {
        ...message,
        content: [],
      })
    }

    if (messagePart) {
      const msg = messagesMap.get(message.id)!
      msg.content.push(messagePart.content)
    }
  }

  return Array.from(messagesMap.values())
}

export function useMessageModel() {
  const dbStore = useDatabaseStore()

  async function getAll(roomId?: string): Promise<Message[]> {
    const messagesAndParts = await dbStore.db()
      .select()
      .from(schema.messages)
      .where(roomId ? eq(schema.messages.room_id, roomId) : undefined)
      .leftJoin(schema.message_parts, eq(schema.messages.id, schema.message_parts.message_id))
      .orderBy(asc(schema.messages.created_at), asc(schema.message_parts.order))

    return combineMessagesAndParts(messagesAndParts)
  }

  function getByRoomId(roomId: string) {
    return getAll(roomId)
  }

  function deleteByIds(ids: string[]) {
    return dbStore.withCheckpoint((db) => {
      return db.delete(schema.messages).where(inArray(schema.messages.id, ids))
    })
  }

  async function create(msg: Omit<typeof schema.messages.$inferInsert, 'id' | 'created_at' | 'updated_at' | 'embedding' | 'show_summary'>) {
    return await dbStore.withCheckpoint((db) => {
      return db.insert(schema.messages).values(msg).returning()
    })
  }

  function update(id: string, msg: Message) {
    return dbStore.withCheckpoint((db) => {
      return db.update(schema.messages).set(msg).where(eq(schema.messages.id, id))
    })
  }

  function appendContent(message_id: string, part: CommonContentPart) {
    return dbStore.withCheckpoint((db) => {
      return db.execute(sql`
        INSERT INTO message_parts (message_id, part_type, content, "order")
        VALUES (
          ${message_id},
          ${part.type}::part_type,
          ${JSON.stringify(part)}::jsonb,
          COALESCE((
            SELECT MAX("order") + 1
            FROM message_parts
            WHERE message_id = ${message_id}
          ), 0)
        )
      `)
    })
  }

  async function appendContentBatch(message_id: string, parts: CommonContentPart[]) {
    return await dbStore.withCheckpoint(async (db) => {
      const result = await db
        .select({ maxOrder: sql<number>`COALESCE(MAX("order"), -1)` })
        .from(schema.message_parts)
        .where(eq(schema.message_parts.message_id, message_id))

      const startOrder = (result[0]?.maxOrder ?? -1) + 1

      return db.insert(schema.message_parts).values(
        parts.map((part, index) => ({
          message_id,
          part_type: part.type,
          content: part,
          order: startOrder + index,
        })),
      )
    })
  }

  function deleteContent(message_id: string) {
    return dbStore.withCheckpoint((db) => {
      return db.delete(schema.message_parts).where(eq(schema.message_parts.message_id, message_id))
    })
  }

  async function updateContent(message_id: string, parts: CommonContentPart[]) {
    await deleteContent(message_id)

    if (parts.length === 0) {
      return
    }

    return dbStore.withCheckpoint(async (db) => {
      await db.insert(schema.message_parts).values(parts.map(part => ({ message_id, part_type: part.type, content: part, order: parts.indexOf(part) })))
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

  async function searchByContent(keyword: string, roomId?: string): Promise<Message[]> {
    const conditions = roomId ? [eq(schema.messages.room_id, roomId)] : []

    const messagesAndParts = await dbStore.db()
      .selectDistinct({ messages: schema.messages, message_parts: schema.message_parts })
      .from(schema.message_parts)
      .innerJoin(schema.messages, eq(schema.message_parts.message_id, schema.messages.id))
      .where(and(
        sql`${schema.message_parts.content}::text ILIKE ${`%${keyword}%`}`,
        ...conditions,
      ))

    if (messagesAndParts.length === 0) {
      return []
    }

    return combineMessagesAndParts(messagesAndParts)
  }

  function notEmbeddedMessages() {
    return dbStore.db().select().from(schema.messages).where(isNull(schema.messages.embedding))
  }

  function updateEmbedding(id: string, embedding: number[]) {
    return dbStore.withCheckpoint((db) => {
      return db.update(schema.messages).set({ embedding }).where(eq(schema.messages.id, id))
    })
  }

  async function vectorSimilaritySearch(embedding: number[], limit: number = 10) {
    const similarity = sql<number>`1 - (${cosineDistance(schema.messages.embedding, embedding)})`

    const topMessages = await dbStore.db()
      .select({ id: schema.messages.id, similarity })
      .from(schema.messages)
      .orderBy(desc(similarity))
      .limit(limit)

    if (topMessages.length === 0) {
      return []
    }

    const messageIds = topMessages.map(m => m.id)
    const similarityMap = new Map(topMessages.map(m => [m.id, m.similarity]))

    const messagesAndParts = await dbStore.db()
      .select()
      .from(schema.messages)
      .where(inArray(schema.messages.id, messageIds))
      .leftJoin(schema.message_parts, eq(schema.messages.id, schema.message_parts.message_id))
      .orderBy(asc(schema.message_parts.order))

    const messages = combineMessagesAndParts(messagesAndParts)

    return messages
      .map(msg => ({ ...msg, similarity: similarityMap.get(msg.id) ?? 0 }))
      .sort((a, b) => b.similarity - a.similarity)
  }

  return {
    getAll,
    getByRoomId,
    deleteByIds,
    create,
    update,
    appendContent,
    appendContentBatch,
    searchByContent,
    notEmbeddedMessages,
    updateEmbedding,
    vectorSimilaritySearch,
    updateContent,
    deleteContent,
    appendSummary,
    updateSummary,
    updateShowSummary,

  }
}

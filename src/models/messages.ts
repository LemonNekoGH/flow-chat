import type { Message } from '~/types/messages'
import { eq, inArray, sql } from 'drizzle-orm'
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

  return {
    getAll,
    getByRoomId,
    deleteByIds,
    create,
    update,
    appendContent,
  }
}

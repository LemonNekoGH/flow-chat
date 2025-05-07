import type { Room } from '~/types/rooms'
import { eq } from 'drizzle-orm'
import { storeToRefs } from 'pinia'
import { useDatabaseStore } from '~/stores/database'
import * as schema from '../../db/schema'

export function useRoomModel() {
  const dbStore = useDatabaseStore()
  const { db } = storeToRefs(dbStore)

  async function create(name: string, templateId?: string) {
    if (!db.value) {
      throw new Error('Database not initialized')
    }

    const room = await db.value.insert(schema.rooms).values({
      name,
      template_id: templateId,
      default_model: 'gpt-4o',
    }).returning()
    await db.value.execute('CHECKPOINT;')

    return room[0]
  }

  async function update(id: string, data: Partial<Omit<Room, 'id' | 'createdAt'>>) {
    if (!db.value) {
      throw new Error('Database not initialized')
    }

    const room = await db.value.update(schema.rooms).set(data).where(eq(schema.rooms.id, id)).returning()
    await db.value.execute('CHECKPOINT;')

    return room[0]
  }

  async function destroy(id: string) {
    if (!db.value) {
      throw new Error('Database not initialized')
    }

    await db.value.delete(schema.rooms).where(eq(schema.rooms.id, id))
    await db.value.execute('CHECKPOINT;')
  }

  async function getById(id: string) {
    if (!db.value) {
      throw new Error('Database not initialized')
    }

    const room = await db.value.select().from(schema.rooms).where(eq(schema.rooms.id, id))
    return room[0]
  }

  async function getAll() {
    if (!db.value) {
      throw new Error('Database not initialized')
    }

    return await db.value.select().from(schema.rooms)
  }

  return {
    create,
    update,
    destroy,
    getById,
    getAll,
  }
}

import type { Room } from '~/types/rooms'
import { eq } from 'drizzle-orm'
import { useDatabaseStore } from '~/stores/database'
import * as schema from '../../db/schema'

export function useRoomModel() {
  const dbStore = useDatabaseStore()

  async function create(name: string, templateId?: string) {
    return (await dbStore.withCheckpoint((db) => {
      return db.insert(schema.rooms).values({
        name,
        template_id: templateId || null,
        default_model: 'gpt-4o',
      }).returning()
    }))[0]
  }

  function update(id: string, data: Partial<Omit<Room, 'id' | 'createdAt'>>) {
    // Ensure empty strings are converted to null for UUID fields
    const cleanData = {
      ...data,
      ...(data.template_id !== undefined && { template_id: data.template_id || null }),
    }

    return dbStore.withCheckpoint((db) => {
      return db.update(schema.rooms).set(cleanData).where(eq(schema.rooms.id, id)).returning()
    })
  }

  function destroy(id: string) {
    return dbStore.withCheckpoint((db) => {
      return db.delete(schema.rooms).where(eq(schema.rooms.id, id))
    })
  }

  async function getById(id: string) {
    return (await dbStore.db().select().from(schema.rooms).where(eq(schema.rooms.id, id)))[0]
  }

  function getAll() {
    return dbStore.db().select().from(schema.rooms)
  }

  return {
    create,
    update,
    destroy,
    getById,
    getAll,
  }
}

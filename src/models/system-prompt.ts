import { eq } from 'drizzle-orm'
import { storeToRefs } from 'pinia'
import { useDatabaseStore } from '~/stores/database'
import * as schema from '../../db/schema'

export function useSystemPromptModel() {
  const dbStore = useDatabaseStore()
  const { db } = storeToRefs(dbStore)

  async function create(name: string, content: string) {
    if (!db.value) {
      throw new Error('Database not initialized')
    }

    await db.value?.insert(schema.systemPrompts).values({
      name,
      content,
    })
  }

  async function update(id: string, name: string, content: string) {
    if (!db.value) {
      throw new Error('Database not initialized')
    }

    await db.value?.update(schema.systemPrompts).set({
      name,
      content,
    }).where(eq(schema.systemPrompts.id, id))
  }

  async function destroy(id: string) {
    if (!db.value) {
      throw new Error('Database not initialized')
    }

    await db.value?.delete(schema.systemPrompts).where(eq(schema.systemPrompts.id, id))
  }

  async function getById(id: string) {
    if (!db.value) {
      throw new Error('Database not initialized')
    }

    return await db.value?.select().from(schema.systemPrompts).where(eq(schema.systemPrompts.id, id))
  }

  return {
    create,
    update,
    destroy,
    getById,
  }
}

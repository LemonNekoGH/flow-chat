import { eq } from 'drizzle-orm'
import { storeToRefs } from 'pinia'
import { useDatabaseStore } from '~/stores/database'
import * as schema from '../../db/schema'

export function useTemplateModel() {
  const dbStore = useDatabaseStore()
  const { db } = storeToRefs(dbStore)

  async function create(name: string, systemPrompt: string) {
    if (!db.value) {
      throw new Error('Database not initialized')
    }

    await db.value?.insert(schema.templates).values({
      name,
      systemPrompt,
    })
  }

  async function update(id: string, name: string, systemPrompt: string) {
    if (!db.value) {
      throw new Error('Database not initialized')
    }

    await db.value?.update(schema.templates).set({
      name,
      systemPrompt,
    }).where(eq(schema.templates.id, id))
  }

  async function destroy(id: string) {
    if (!db.value) {
      throw new Error('Database not initialized')
    }

    await db.value?.delete(schema.templates).where(eq(schema.templates.id, id))
  }

  async function getById(id: string) {
    if (!db.value) {
      throw new Error('Database not initialized')
    }

    return await db.value?.select().from(schema.templates).where(eq(schema.templates.id, id))
  }

  return {
    create,
    update,
    destroy,
    getById,
  }
}

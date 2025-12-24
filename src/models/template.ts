import { eq } from 'drizzle-orm'
import { useDatabaseStore } from '~/stores/database'
import * as schema from '../../db/schema'

export function useTemplateModel() {
  const dbStore = useDatabaseStore()

  function create(name: string, systemPrompt: string) {
    return dbStore.withCheckpoint((db) => {
      return db.insert(schema.templates).values({
        name,
        system_prompt: systemPrompt,
      })
    })
  }

  function update(id: string, name: string, systemPrompt: string) {
    return dbStore.withCheckpoint((db) => {
      return db.update(schema.templates).set({
        name,
        system_prompt: systemPrompt,
      }).where(eq(schema.templates.id, id))
    })
  }

  function destroy(id: string) {
    return dbStore.withCheckpoint((db) => {
      return db.delete(schema.templates).where(eq(schema.templates.id, id))
    })
  }

  async function getById(id: string) {
    return (await dbStore.db().select().from(schema.templates).where(eq(schema.templates.id, id)))[0]
  }

  function getAll() {
    return dbStore.db().select().from(schema.templates)
  }

  return {
    create,
    update,
    destroy,
    getById,
    getAll,
  }
}

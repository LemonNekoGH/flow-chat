import type { PgliteDatabase } from 'drizzle-orm/pglite'
import { IdbFs, PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { useLogg } from '@guiiai/logg'

import { migrate as migrateInternal } from '@proj-airi/drizzle-orm-browser-migrator/pglite'
import { until } from '@vueuse/core'
import { drizzle } from 'drizzle-orm/pglite'
import { defineStore } from 'pinia'
import migrations from 'virtual:drizzle-migrations.sql'
import { ref, toRaw } from 'vue'
import * as schema from '../../db/schema'

export const useDatabaseStore = defineStore('database', () => {
  const logger = useLogg('database')

  const migrating = ref(false)
  const _db = ref<PgliteDatabase<typeof schema>>()

  async function migrate() {
    migrating.value = true
    logger.log('Running database migrations')

    await migrateInternal(db(), migrations)

    await db().execute('CHECKPOINT;')

    logger.log('Database migrations completed')
    migrating.value = false
  }

  async function clearDb() {
    await db().execute('DROP TABLE IF EXISTS __migrations;')
    await db().execute('DROP TABLE IF EXISTS messages;')
    await db().execute('DROP TABLE IF EXISTS rooms;')
    await db().execute('DROP TABLE IF EXISTS templates;')
    await db().execute('CHECKPOINT;')
  }

  async function initialize(inMemory = false) {
    if (_db.value) {
      logger.warn('Database connection already initialized')
      return
    }

    const pgClient = new PGlite({
      fs: inMemory ? undefined : new IdbFs('flow-chat'),
      extensions: { vector },
    })

    _db.value = drizzle({ client: pgClient, schema })

    // It can only use in node environment
    // await migrate(db.value, {
    //   migrationsFolder: 'drizzle',
    //   migrationsTable: '__migrations',
    //   migrationsSchema: 'public',
    // })

    logger.log('Database initialized')
  }

  function db() {
    if (!_db.value) {
      throw new Error('Database not initialized')
    }

    return toRaw(_db.value)
  }

  async function withCheckpoint<T>(cb: (db: PgliteDatabase<typeof schema>) => Promise<T>) {
    const result = await cb(db())
    await db().execute('CHECKPOINT;') // TODO: is this necessary?

    return result
  }

  function waitForDbInitialized() {
    return until(_db).toBeTruthy()
  }

  return {
    db,
    migrating,

    initialize,
    clearDb,
    migrate,

    withCheckpoint,
    waitForDbInitialized,
  }
})

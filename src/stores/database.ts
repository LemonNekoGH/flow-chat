import type { DuckDBWasmDrizzleDatabase } from '@proj-airi/drizzle-duckdb-wasm'
import { useLogg } from '@guiiai/logg'
import { buildDSN, drizzle } from '@proj-airi/drizzle-duckdb-wasm'
import { DBStorageType, DuckDBAccessMode } from '@proj-airi/duckdb-wasm'
import { until } from '@vueuse/core'

import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as schema from '../../db/schema'
import migration1 from '../../drizzle/0000_yummy_morg.sql?raw'

export const useDatabaseStore = defineStore('database', () => {
  const logger = useLogg('database')

  const migrating = ref(false)
  const _db = ref<DuckDBWasmDrizzleDatabase<typeof schema>>()

  // TODO: use https://github.com/proj-airi/drizzle-orm-browser instead
  async function migrate(migrations?: string[]) {
    migrating.value = true
    await db().execute(`CREATE TABLE IF NOT EXISTS __migrations (
      id INTEGER PRIMARY KEY,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`)

    // get executed migration ids
    const executedMigrations = await db().execute<{ id: number }>('SELECT id FROM __migrations')
    const maxId = executedMigrations.reduce((max, migration) => Math.max(max, migration.id), -1)

    const m = migrations ?? [ // TODO: unit test
      migration1,
    ]

    for (let i = maxId + 1; i < m.length; i++) {
      logger.log('Running migration', m[i])
      await db().execute(m[i])
      await db().execute(`INSERT INTO __migrations (id) VALUES (${i});`)
    }

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

    const dsn = inMemory
      ? 'duckdb-wasm:'
      : buildDSN({
          scheme: 'duckdb-wasm:',
          bundles: 'import-url',
          logger: true,
          storage: {
            type: DBStorageType.ORIGIN_PRIVATE_FS,
            path: 'flow_chat.db',
            accessMode: DuckDBAccessMode.READ_WRITE,
          },
        })
    logger.log('dsn', dsn)

    _db.value = drizzle(dsn, { schema })

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

    return _db.value
  }

  async function withCheckpoint<T>(cb: (db: DuckDBWasmDrizzleDatabase<typeof schema>) => Promise<T>) {
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

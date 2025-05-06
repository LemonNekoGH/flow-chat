import type { DuckDBWasmDrizzleDatabase } from '@proj-airi/drizzle-duckdb-wasm'
import { useLogg } from '@guiiai/logg'
import { buildDSN, drizzle } from '@proj-airi/drizzle-duckdb-wasm'
import { DBStorageType, DuckDBAccessMode } from '@proj-airi/duckdb-wasm'
import { defineStore } from 'pinia'

import { ref } from 'vue'
import * as schema from '../../db/schema'
import migration1 from '../../drizzle/0000_next_talos.sql?raw'

export const useDatabaseStore = defineStore('database', () => {
  const logger = useLogg('database')

  const migrating = ref(false)
  const db = ref<DuckDBWasmDrizzleDatabase<typeof schema>>()
  const dsn = buildDSN({
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

  async function initialize() {
    if (db.value) {
      logger.warn('Database connection already initialized')
      return
    }

    migrating.value = true
    db.value = drizzle(dsn, { schema })
    await db.value.execute(`CREATE TABLE IF NOT EXISTS __migrations (
      id INTEGER PRIMARY KEY,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`)

    // get executed migration ids
    const executedMigrations = await db.value.execute<{ id: number }>('SELECT id FROM __migrations')
    const maxId = executedMigrations.reduce((max, migration) => Math.max(max, migration.id), -1)

    const migrations = [ // TODO: unit test
      migration1,
    ]

    for (let i = maxId + 1; i < migrations.length; i++) {
      logger.log('Running migration', migrations[i])
      await db.value.execute(migrations[i])
      await db.value.execute(`INSERT INTO __migrations (id) VALUES (${i});`)
    }
    migrating.value = false
  }

  async function persistData() {
    if (!db.value)
      return

    // force write WAL log to main database file
    await db.value.execute('PRAGMA wal_checkpoint(FULL);')
  }

  return {
    db,
    migrating,

    initialize,
    persistData,
  }
})

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

/**
 * Check if there's a pending database dump import
 */
async function checkPendingImport(): Promise<Blob | null> {
  return new Promise((resolve) => {
    const dbRequest = indexedDB.open('flow-chat-import', 1)

    dbRequest.onerror = () => resolve(null)
    dbRequest.onupgradeneeded = () => {
      const idb = dbRequest.result
      if (!idb.objectStoreNames.contains('pending-import')) {
        idb.createObjectStore('pending-import')
      }
    }
    dbRequest.onsuccess = () => {
      const idb = dbRequest.result
      if (!idb.objectStoreNames.contains('pending-import')) {
        idb.close()
        resolve(null)
        return
      }
      const tx = idb.transaction('pending-import', 'readonly')
      const store = tx.objectStore('pending-import')
      const getRequest = store.get('dump')

      getRequest.onsuccess = () => {
        const data = getRequest.result as ArrayBuffer | undefined
        idb.close()
        if (data) {
          resolve(new Blob([data], { type: 'application/gzip' }))
        }
        else {
          resolve(null)
        }
      }
      getRequest.onerror = () => {
        idb.close()
        resolve(null)
      }
    }
  })
}

/**
 * Clear pending import data
 */
async function clearPendingImport(): Promise<void> {
  return new Promise((resolve) => {
    const deleteRequest = indexedDB.deleteDatabase('flow-chat-import')
    deleteRequest.onsuccess = () => resolve()
    deleteRequest.onerror = () => resolve()
    deleteRequest.onblocked = () => resolve()
  })
}

export const useDatabaseStore = defineStore('database', () => {
  const logger = useLogg('database')

  const migrating = ref(false)
  const importing = ref(false)
  const _db = ref<PgliteDatabase<typeof schema>>()

  let migratePromise: Promise<void> | null = null

  async function migrate() {
    if (migratePromise) {
      return migratePromise
    }

    migrating.value = true
    migratePromise = (async () => {
      logger.log('Running database migrations')

      await migrateInternal(db(), migrations)

      await db().execute('CHECKPOINT;')

      logger.log('Database migrations completed')
    })()
      .finally(() => {
        migrating.value = false
        migratePromise = null
      })

    return migratePromise
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

    // Check for pending import
    const pendingImport = await checkPendingImport()

    if (pendingImport) {
      logger.log('Found pending database import, loading from dump...')
      importing.value = true

      try {
        const pgClient = new PGlite({
          fs: inMemory ? undefined : new IdbFs('flow-chat'),
          extensions: { vector },
          loadDataDir: pendingImport,
        })

        _db.value = drizzle({ client: pgClient, schema })

        // Clear pending import after successful load
        await clearPendingImport()

        logger.log('Database imported successfully from dump')
      }
      catch (error) {
        logger.error('Failed to import database from dump:', String(error))
        // Clear the failed import and initialize normally
        await clearPendingImport()

        const pgClient = new PGlite({
          fs: inMemory ? undefined : new IdbFs('flow-chat'),
          extensions: { vector },
        })

        _db.value = drizzle({ client: pgClient, schema })
      }
      finally {
        importing.value = false
      }
    }
    else {
      const pgClient = new PGlite({
        fs: inMemory ? undefined : new IdbFs('flow-chat'),
        extensions: { vector },
      })

      _db.value = drizzle({ client: pgClient, schema })
    }

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
    importing,

    initialize,
    clearDb,
    migrate,

    withCheckpoint,
    waitForDbInitialized,
  }
})

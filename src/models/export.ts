import type { PGlite } from '@electric-sql/pglite'
import { useDatabaseStore } from '~/stores/database'

const IMPORT_DB_NAME = 'flow-chat-import'
const IMPORT_STORE_NAME = 'pending'

export function useExportModel() {
  const dbStore = useDatabaseStore()

  function downloadBlob(blob: Blob | File, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function exportDatabaseDump() {
    const db = dbStore.db()
    const pglite = (db as unknown as { $client: PGlite }).$client
    const blob = await pglite.dumpDataDir('gzip')
    downloadBlob(blob, `flow-chat-backup-${new Date().toISOString().slice(0, 10)}.tar.gz`)
  }

  async function importDatabaseDump(file: File) {
    const data = await file.arrayBuffer()

    // Store in IndexedDB for loading after reload
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(IMPORT_DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(IMPORT_STORE_NAME)
      req.onsuccess = () => {
        const tx = req.result.transaction(IMPORT_STORE_NAME, 'readwrite')
        tx.objectStore(IMPORT_STORE_NAME).put(data, 'dump')
        tx.oncomplete = () => {
          req.result.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
      req.onerror = () => reject(req.error)
    })

    // Clear existing database and reload
    await indexedDB.deleteDatabase('/pglite/flow-chat')
    window.location.reload()
  }

  return {
    exportDatabaseDump,
    importDatabaseDump,
  }
}

/** Check for pending import data (called during db init) */
export async function getPendingImport(): Promise<Blob | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open(IMPORT_DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(IMPORT_STORE_NAME)
    req.onerror = () => resolve(null)
    req.onsuccess = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IMPORT_STORE_NAME)) {
        db.close()
        return resolve(null)
      }
      const tx = db.transaction(IMPORT_STORE_NAME, 'readonly')
      const get = tx.objectStore(IMPORT_STORE_NAME).get('dump')
      get.onsuccess = () => {
        db.close()
        resolve(get.result ? new Blob([get.result]) : null)
      }
      get.onerror = () => {
        db.close()
        resolve(null)
      }
    }
  })
}

/** Clear pending import data */
export async function clearPendingImport(): Promise<void> {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(IMPORT_DB_NAME)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
}

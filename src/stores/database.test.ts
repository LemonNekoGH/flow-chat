import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import migration1 from '../../drizzle/0000_next_talos.sql?raw'
import { useDatabaseStore } from './database'

const migration2 = `
ALTER TABLE messages
ADD COLUMN metadata VARCHAR;
`

describe('useDatabaseStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should run migration if not executed', async () => {
    const store = useDatabaseStore()
    await store.initialize(true)
    await store.migrate([migration1])

    // verify the migration status
    expect(store.migrating).toBe(false)

    // verify the migration table is created
    const migrations = await store.db().execute<{ id: number, executed_at: string }>(
      'SELECT * FROM __migrations ORDER BY id',
    )
    expect(migrations).toBeDefined()
    expect(migrations?.length).toBe(1)
    expect(migrations?.[0].id).toBe(0)

    // verify the business tables are created
    const tables = await store.db().execute<{ name: string }>(
      `SELECT name FROM sqlite_master
       WHERE type='table' AND name IN ('messages', 'rooms', 'templates')`,
    )
    expect(tables).toBeDefined()
    expect(tables?.length).toBe(3)
  })

  it('should not run migration if already executed', async () => {
    const store = useDatabaseStore()

    await store.initialize(true)
    await store.migrate([migration1])
    const firstMigrations = await store.db().execute<{ id: number }>(
      'SELECT * FROM __migrations',
    )
    expect(firstMigrations?.length).toBe(1)

    // migrate again
    await store.migrate([migration1])
    const secondMigrations = await store.db().execute<{ id: number }>(
      'SELECT * FROM __migrations',
    )

    expect(secondMigrations?.length).toBe(1)
    expect(store.migrating).toBe(false)
  })

  it('should handle db.value already initialized', async () => {
    const store = useDatabaseStore()
    await store.initialize(true)
    await store.migrate([migration1])

    // re-initialize should return directly
    await store.initialize(true)
    expect(store.migrating).toBe(false)

    // confirm the database connection is still available
    const result = await store.db().execute('SELECT 1')
    expect(result).toBeDefined()
    expect(result?.[0]).toEqual({ 1: 1 })
  })

  it('should run incremental migration from v1 to v2', async () => {
    const store = useDatabaseStore()

    // initialize and run the first migration
    await store.initialize(true)
    await store.migrate([migration1])

    // verify the first migration is completed
    const firstMigrations = await store.db().execute<{ id: number }>(
      'SELECT * FROM __migrations ORDER BY id',
    )
    expect(firstMigrations).toBeDefined()
    expect(firstMigrations?.length).toBe(1)
    expect(firstMigrations?.[0].id).toBe(0)

    // verify the metadata column does not exist
    const beforeColumns = await store.db().execute<{ name: string, type: string }>(
      `SELECT name, type FROM pragma_table_info('messages')`,
    )
    expect(beforeColumns?.find(c => c.name === 'metadata')).toBeUndefined()

    // run the second migration
    await store.migrate([migration1, migration2])

    // verify both migrations are completed
    const secondMigrations = await store.db().execute<{ id: number }>(
      'SELECT * FROM __migrations ORDER BY id',
    )
    expect(secondMigrations).toBeDefined()
    expect(secondMigrations?.length).toBe(2)
    expect(secondMigrations?.map(m => m.id)).toEqual([0, 1])

    // verify the new metadata column
    const afterColumns = await store.db().execute<{ name: string, type: string }>(
      `SELECT name, type FROM pragma_table_info('messages')`,
    )
    expect(afterColumns).toBeDefined()
    expect(afterColumns?.find(c => c.name === 'metadata')?.type).toBe('VARCHAR')
  })
})

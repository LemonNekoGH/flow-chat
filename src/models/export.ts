import type { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { useDatabaseStore } from '~/stores/database'
import * as schema from '../../db/schema'

export interface ExportData {
  version: string
  exportedAt: string
  templates: Array<{
    id: string
    name: string
    system_prompt: string
    created_at: Date
    updated_at: Date
  }>
  rooms: Array<{
    id: string
    name: string
    template_id: string | null
    default_model: string | null
    focus_node_id: string | null
    viewport_x: number | null
    viewport_y: number | null
    viewport_zoom: number | null
    created_at: Date
    updated_at: Date
  }>
  messages: Array<{
    id: string
    content: string
    model: string
    provider: string
    role: string
    room_id: string | null
    parent_id: string | null
    summary: string | null
    show_summary: boolean
    memory: string[]
    created_at: Date
    updated_at: Date
    // embedding is excluded
  }>
  memories: Array<{
    id: string
    content: string
    scope: string
    room_id: string | null
    tags: string
    created_at: Date
    updated_at: Date
  }>
  tool_calls: Array<{
    id: string
    message_id: string
    tool_name: string
    parameters: unknown
    result: unknown
    position: number | null
    created_at: Date
  }>
}

export function useExportModel() {
  const dbStore = useDatabaseStore()

  async function exportAllData(): Promise<ExportData> {
    const db = dbStore.db()

    // Fetch all data from tables
    const [templates, rooms, messages, memories, toolCalls] = await Promise.all([
      db.select().from(schema.templates),
      db.select().from(schema.rooms),
      db.select({
        id: schema.messages.id,
        content: schema.messages.content,
        model: schema.messages.model,
        provider: schema.messages.provider,
        role: schema.messages.role,
        room_id: schema.messages.room_id,
        parent_id: schema.messages.parent_id,
        summary: schema.messages.summary,
        show_summary: schema.messages.show_summary,
        memory: schema.messages.memory,
        created_at: schema.messages.created_at,
        updated_at: schema.messages.updated_at,
        // embedding is excluded from export
      }).from(schema.messages),
      db.select().from(schema.memories),
      db.select().from(schema.tool_calls),
    ])

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      templates,
      rooms,
      messages,
      memories,
      tool_calls: toolCalls,
    }
  }

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

  function downloadExportData(data: ExportData) {
    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    downloadBlob(blob, `flow-chat-export-${new Date().toISOString().slice(0, 10)}.json`)
  }

  async function exportAndDownload() {
    const data = await exportAllData()
    downloadExportData(data)
    return data
  }

  /**
   * Export entire PGlite database as a tarball
   * This includes all data including embeddings
   */
  async function exportDatabaseDump() {
    const db = dbStore.db()
    // Access the underlying PGlite client via $client
    const pglite = (db as unknown as { $client: PGlite }).$client
    const blob = await pglite.dumpDataDir('gzip')
    const filename = `flow-chat-db-dump-${new Date().toISOString().slice(0, 10)}.tar.gz`
    downloadBlob(blob, filename)
    return blob
  }

  /**
   * Import data from JSON file
   * This will clear existing data and import the new data
   */
  async function importFromJson(file: File): Promise<void> {
    const text = await file.text()
    const data = JSON.parse(text) as ExportData

    if (!data.version || !data.templates || !data.rooms || !data.messages) {
      throw new Error('Invalid export file format')
    }

    const db = dbStore.db()

    // Clear existing data (in reverse order of dependencies)
    await db.delete(schema.tool_calls)
    await db.delete(schema.memories)
    await db.delete(schema.messages)
    await db.delete(schema.rooms)
    await db.delete(schema.templates)

    // Import data (in order of dependencies)
    if (data.templates.length > 0) {
      await db.insert(schema.templates).values(
        data.templates.map(t => ({
          id: t.id,
          name: t.name,
          system_prompt: t.system_prompt,
          created_at: new Date(t.created_at),
          updated_at: new Date(t.updated_at),
        })),
      )
    }

    if (data.rooms.length > 0) {
      await db.insert(schema.rooms).values(
        data.rooms.map(r => ({
          id: r.id,
          name: r.name,
          template_id: r.template_id,
          default_model: r.default_model,
          focus_node_id: r.focus_node_id,
          viewport_x: r.viewport_x,
          viewport_y: r.viewport_y,
          viewport_zoom: r.viewport_zoom,
          created_at: new Date(r.created_at),
          updated_at: new Date(r.updated_at),
        })),
      )
    }

    if (data.messages.length > 0) {
      await db.insert(schema.messages).values(
        data.messages.map(m => ({
          id: m.id,
          content: m.content,
          model: m.model,
          provider: m.provider,
          role: m.role,
          room_id: m.room_id,
          parent_id: m.parent_id,
          summary: m.summary,
          show_summary: m.show_summary,
          memory: m.memory,
          created_at: new Date(m.created_at),
          updated_at: new Date(m.updated_at),
          // embedding will be null, can be regenerated later
        })),
      )
    }

    if (data.memories.length > 0) {
      await db.insert(schema.memories).values(
        data.memories.map(m => ({
          id: m.id,
          content: m.content,
          scope: m.scope,
          room_id: m.room_id,
          tags: m.tags,
          created_at: new Date(m.created_at),
          updated_at: new Date(m.updated_at),
        })),
      )
    }

    if (data.tool_calls.length > 0) {
      await db.insert(schema.tool_calls).values(
        data.tool_calls.map(tc => ({
          id: tc.id,
          message_id: tc.message_id,
          tool_name: tc.tool_name,
          parameters: tc.parameters,
          result: tc.result,
          position: tc.position,
          created_at: new Date(tc.created_at),
        })),
      )
    }

    // Checkpoint to persist changes
    await db.execute(sql`CHECKPOINT`)
  }

  return {
    exportAllData,
    downloadExportData,
    exportAndDownload,
    exportDatabaseDump,
    importFromJson,
  }
}

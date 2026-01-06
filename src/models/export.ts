import type { PGlite } from '@electric-sql/pglite'
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

  return {
    exportAllData,
    downloadExportData,
    exportAndDownload,
    exportDatabaseDump,
  }
}

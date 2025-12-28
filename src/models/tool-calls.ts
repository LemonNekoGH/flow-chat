import type { ToolCall, CreateToolCallInput } from '~/types/tool-call'
import type { InferSelectModel } from 'drizzle-orm'
import { asc, eq } from 'drizzle-orm'
import { useDatabaseStore } from '~/stores/database'
import * as schema from '../../db/schema'

type ToolCallRow = InferSelectModel<typeof schema.tool_calls>

function toToolCall(row: ToolCallRow): ToolCall {
  return {
    ...row,
  }
}

export function useToolCallModel() {
  const dbStore = useDatabaseStore()

  async function create(input: CreateToolCallInput): Promise<ToolCall> {
    const [created] = await dbStore.withCheckpoint((db) => {
      return db.insert(schema.tool_calls).values({
        message_id: input.message_id,
        tool_name: input.tool_name,
        parameters: input.parameters ?? null,
        result: input.result ?? null,
        position: input.position ?? null,
      }).returning()
    })

    return toToolCall(created)
  }

  async function getByMessageId(messageId: string): Promise<ToolCall[]> {
    const rows = await dbStore.db()
      .select()
      .from(schema.tool_calls)
      .where(eq(schema.tool_calls.message_id, messageId))
      .orderBy(asc(schema.tool_calls.created_at))

    return rows.map(toToolCall)
  }

  async function getById(id: string): Promise<ToolCall | null> {
    const [row] = await dbStore.db()
      .select()
      .from(schema.tool_calls)
      .where(eq(schema.tool_calls.id, id))
      .limit(1)

    return row ? toToolCall(row) : null
  }

  async function updateResult(id: string, result: unknown): Promise<ToolCall> {
    const [updated] = await dbStore.withCheckpoint((db) => {
      return db.update(schema.tool_calls)
        .set({ result })
        .where(eq(schema.tool_calls.id, id))
        .returning()
    })

    return toToolCall(updated)
  }

  return {
    create,
    getByMessageId,
    getById,
    updateResult,
  }
}

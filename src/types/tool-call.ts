import type { InferSelectModel } from 'drizzle-orm'
import type * as schema from '../../db/schema'

export type ToolCall = InferSelectModel<typeof schema.tool_calls>

export interface CreateToolCallInput {
  message_id: string
  tool_name: string
  parameters?: unknown
  result?: unknown
  position?: number
}

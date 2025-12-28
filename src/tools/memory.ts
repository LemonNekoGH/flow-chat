import type { useMessagesStore } from '~/stores/messages'
import type { MemoryScope } from '~/types/memory'
import { tool } from '@xsai/tool'
import { z } from 'zod'
import { useMemoryModel } from '~/models/memories'
import { useToolCallModel } from '~/models/tool-calls'

export interface CreateMemoryToolsOptions {
  roomId?: string | null
  messageId: string
  piniaStore: ReturnType<typeof useMessagesStore>
}

export async function createMemoryTools(options: CreateMemoryToolsOptions) {
  const memoryModel = useMemoryModel()
  const toolCallModel = useToolCallModel()

  return [
    await tool({
      name: 'write_memory',
      description: 'Write a memory for future conversations (persisted in local database).',
      parameters: z.object({
        content: z.string().min(1).describe('The memory to save. Keep it short and factual.'),
        scope: z.enum(['global', 'room']).describe('Save globally or only for current room. Defaults to "global" if not provided.'),
        tags: z.array(z.string()).describe('Optional tags for organization/search.'),
      }),
      execute: async ({ content, scope, tags }) => {
        const toolCall = await toolCallModel.create({
          message_id: options.messageId,
          tool_name: 'write_memory',
          parameters: { content, scope, tags },
          position: null,
        })

        try {
          const normalizedScope: MemoryScope = scope ?? 'global'
          const item = await memoryModel.upsert({
            content,
            scope: normalizedScope,
            tags,
            roomId: options.roomId ?? null,
          })

          const result = `Memory saved: ${item.id}`

          await toolCallModel.updateResult(toolCall.id, result)

          const toolCallMarkdown = `\n\n:::tool-call ${toolCall.id}:::\n\n`
          await options.piniaStore.appendContent(options.messageId, toolCallMarkdown)

          return result
        }
        catch (error) {
          await toolCallModel.updateResult(toolCall.id, { error: String(error) })
          throw error
        }
      },
    }),
  ]
}

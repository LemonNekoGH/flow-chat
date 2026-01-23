import type { useMessagesStore } from '~/stores/messages'
import type { MemoryScope } from '~/types/memory'
import { tool } from '@xsai/tool'
import { z } from 'zod'
import { useMemoryModel } from '~/models/memories'
import { withToolCallLog } from './with-tool-call-log'

export interface CreateMemoryToolsOptions {
  roomId?: string | null
  messageId: string
  piniaStore: ReturnType<typeof useMessagesStore>
}

export async function createMemoryTools(options: CreateMemoryToolsOptions) {
  const memoryModel = useMemoryModel()

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
        return withToolCallLog(
          {
            toolName: 'write_memory',
            messageId: options.messageId,
            parameters: { content, scope, tags },
          },
          async () => {
            const normalizedScope: MemoryScope = scope ?? 'global'
            const item = await memoryModel.upsert({
              content,
              scope: normalizedScope,
              tags,
              roomId: options.roomId ?? null,
            })

            return `Memory saved: ${item.id}`
          },
        )
      },
    }),
  ]
}

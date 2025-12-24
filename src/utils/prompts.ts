import type { BaseMessage } from '~/types/messages'
import type { Template } from '~/types/templates'
import { useMemoryModel } from '~/models/memories'

export const SUMMARY_PROMPT = `Summarize the following content concisely, briefly describe the content with at most 100 words, and use bulletins when needed:`

export interface BuildSystemPromptOptions {
  template: Template
  roomId: string | null
}

/**
 * Build a two-layer system prompt:
 * - Layer 1: Developer system prompt (cannot be bypassed)
 * - Layer 2: User system prompt (from database)
 * - Optionally includes memories if use_memory is enabled
 */
export async function buildSystemPrompt(options: BuildSystemPromptOptions): Promise<BaseMessage[]> {
  const { template, roomId } = options
  const messages: BaseMessage[] = []

  // Layer 1: Developer system prompt (if exists, this is mandatory and cannot be bypassed)
  if (template.developer_system_prompt) {
    messages.push({
      role: 'system',
      content: template.developer_system_prompt,
    })
  }

  // Layer 2: User system prompt (from database)
  if (template.system_prompt) {
    let userPromptContent = template.system_prompt

    // If use_memory is enabled, fetch and append memories
    if (template.use_memory) {
      const memoryModel = useMemoryModel()
      const memories = await memoryModel.getByRoomId(roomId)

      if (memories.length > 0) {
        const memoryText = memories.map(m => `- ${m.content}`).join('\n')
        userPromptContent = `${userPromptContent}\n\n## Memories\n${memoryText}`
      }
    }

    messages.push({
      role: 'system',
      content: userPromptContent,
    })
  }

  return messages
}

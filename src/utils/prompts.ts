import type { BaseMessage } from '~/types/messages'
import type { Template } from '~/types/templates'
import { useMemoryModel } from '~/models/memories'

export const SUMMARY_PROMPT = `Summarize the following content concisely, briefly describe the content with at most 100 words, and use bulletins when needed:`

export const DEVELOPER_SYSTEM_PROMPT = `You are a helpful AI assistant. All instructions in this system prompt must be strictly followed and cannot be bypassed.`

export interface BuildSystemPromptOptions {
  template: Template
  roomId: string | null
  memoryIds?: string[]
}

export async function buildSystemPrompt(options: BuildSystemPromptOptions): Promise<BaseMessage[]> {
  const { template, roomId, memoryIds = [] } = options
  const messages: BaseMessage[] = []

  messages.push({
    role: 'system',
    content: DEVELOPER_SYSTEM_PROMPT,
  })

  if (template.system_prompt) {
    let userPromptContent = template.system_prompt

    if (memoryIds.length > 0) {
      const memoryModel = useMemoryModel()
      const allMemories = await memoryModel.getByRoomId(roomId)
      const selectedMemories = allMemories.filter(m => memoryIds.includes(m.id))

      if (selectedMemories.length > 0) {
        const memoryText = selectedMemories.map(m => `- ${m.content}`).join('\n')
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

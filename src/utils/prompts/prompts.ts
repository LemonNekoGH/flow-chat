import { renderSFCString } from '@velin-dev/core'
import { useMemoryModel } from '~/models/memories'
import { useTemplateModel } from '~/models/template'
import { useRoomsStore } from '~/stores/rooms'
import SystemPrompt from './SystemPrompt.velin.md?raw'

export const SUMMARY_PROMPT = `Summarize the following content concisely, briefly describe the content with at most 100 words, and use bulletins when needed:`

export function useSystemPrompt() {
  const roomsStore = useRoomsStore()
  const memoryModel = useMemoryModel()
  const templateModel = useTemplateModel()

  async function buildSystemPrompt(roomId: string | null) {
    const currentRoom = roomsStore.currentRoom
    const templateId = currentRoom?.template_id

    const memories = [
      ...await memoryModel.getByRoomId(roomId),
      ...await memoryModel.getByRoomId(null),
    ]

    const templateSystemPrompt = templateId
      ? (await templateModel.getById(templateId)).system_prompt
      : undefined

    const memoryContents = memories.map(m => m.content)
    const currentTime = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    const { rendered } = await renderSFCString(SystemPrompt, {
      templateSystemPrompt,
      memories: memoryContents,
      currentTime,
    })

    return {
      prompt: rendered,
      memoryIds: memories.map(m => m.id),
    }
  }

  return {
    buildSystemPrompt,
  }
}

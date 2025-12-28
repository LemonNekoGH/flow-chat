import { usePrompt } from '@velin-dev/vue/repl'
import { asyncComputed } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useMemoryModel } from '~/models/memories'
import { useTemplateModel } from '~/models/template'
import { useRoomsStore } from '~/stores/rooms'
import SystemPrompt from './SystemPrompt.velin.md?raw'

export const SUMMARY_PROMPT = `Summarize the following content concisely, briefly describe the content with at most 100 words, and use bulletins when needed:`

export function useSystemPrompt() {
  const roomsStore = useRoomsStore()
  const { currentRoom, currentRoomId } = storeToRefs(roomsStore)
  const memoryModel = useMemoryModel()
  const templateModel = useTemplateModel()

  const memoryRefreshTrigger = ref(0)

  const memories = asyncComputed(async () => {
    void memoryRefreshTrigger.value
    if (!currentRoomId.value) {
      return []
    }
    return await memoryModel.getByRoomId(currentRoomId.value)
  })
  const memoryContents = computed(() => memories.value?.map(m => m.content) ?? [])
  const memoryIds = computed(() => memories.value?.map(m => m.id) ?? [])
  const templateId = computed(() => currentRoom.value?.template_id)
  const templateSystemPrompt = asyncComputed(async () => {
    if (!templateId.value) {
      return
    }
    return (await templateModel.getById(templateId.value)).system_prompt
  })

  const systemPrompt = ref(SystemPrompt)
  const { prompt } = usePrompt(() => systemPrompt.value, { templateSystemPrompt, memories: memoryContents })

  function refreshMemories() {
    memoryRefreshTrigger.value++
  }

  return computed(() => ({
    prompt: prompt.value,
    memoryIds: memoryIds.value,
    refreshMemories,
  }))
}

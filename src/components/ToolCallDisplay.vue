<script setup lang="ts">
import type { ToolCall } from '~/types/tool-call'
import { ChevronDown } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useToolCallModel } from '~/models/tool-calls'
import { toolDisplayNames } from '~/utils/toolNames'

const props = defineProps<{
  toolCallId: string
}>()

const toolCallModel = useToolCallModel()
const toolCall = ref<ToolCall | null>(null)
const isLoading = ref(true)
const isOpen = ref(false)

onMounted(async () => {
  try {
    const data = await toolCallModel.getById(props.toolCallId)
    toolCall.value = data
  }
  catch (error) {
    console.error('Failed to load tool call', error)
  }
  finally {
    isLoading.value = false
  }
})

const formattedParameters = computed(() => {
  if (!toolCall.value?.parameters)
    return null
  return JSON.stringify(toolCall.value.parameters, null, 2)
})

const formattedResult = computed(() => {
  if (!toolCall.value?.result)
    return null
  return JSON.stringify(toolCall.value.result, null, 2)
})

const toolDisplayName = computed(() => {
  if (!toolCall.value)
    return ''
  return toolDisplayNames[toolCall.value.tool_name] ?? toolCall.value.tool_name
})
</script>

<template>
  <div class="tool-call-display my-1 overflow-hidden border-2 border-pink-200 rounded-lg dark:border-pink-800">
    <button
      class="w-full flex items-center justify-between bg-pink-50 px-2 py-1 text-xs text-pink-700 tracking-wide transition-colors dark:bg-pink-900/50 hover:bg-pink-100 dark:text-pink-300 dark:hover:bg-pink-900/50"
      @click="isOpen = !isOpen"
    >
      <div class="flex items-center gap-2">
        <ChevronDown
          class="h-3.5 w-3.5 text-pink-700 transition-transform dark:text-pink-300"
          :class="{ 'rotate-180': isOpen }"
        />
        <div class="font-medium">
          <div v-if="isLoading">
            Loading...
          </div>
          <div v-else-if="toolCall">
            <span class="rounded-md px-1 py-0.5">{{ toolDisplayName }}</span>
          </div>
          <div v-else>
            Tool call not found
          </div>
        </div>
      </div>
    </button>

    <div
      v-if="isOpen && !isLoading && toolCall"
      class="border-t border-pink-200 bg-white dark:border-pink-800 dark:bg-pink-900"
    >
      <div v-if="formattedParameters" class="p-2 space-y-1">
        <div class="text-xs text-pink-700 font-semibold tracking-wide dark:text-pink-300">
          Parameters
        </div>
        <div class="overflow-x-auto border border-pink-200 rounded bg-pink-50 dark:border-pink-800 dark:bg-pink-800/50">
          <pre class="p-2 text-xs"><code class="text-pink-700 dark:text-pink-300">{{ formattedParameters }}</code></pre>
        </div>
      </div>

      <div v-if="formattedResult" class="p-2 space-y-1" :class="{ 'border-t-2 border-pink-200 dark:border-pink-800': formattedParameters }">
        <div class="text-xs text-pink-700 font-semibold tracking-wide dark:text-pink-300">
          Result
        </div>
        <div class="overflow-x-auto border border-pink-200 rounded bg-pink-50 dark:border-pink-800 dark:bg-pink-800/50">
          <pre class="p-2 text-xs"><code class="text-pink-700 dark:text-pink-300">{{ formattedResult }}</code></pre>
        </div>
      </div>

      <div v-if="!formattedParameters && !formattedResult" class="p-3 text-xs text-pink-700 italic dark:text-pink-400">
        No details available
      </div>
    </div>
  </div>
</template>

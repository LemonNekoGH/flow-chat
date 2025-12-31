<script setup lang="ts">
import type { ToolCall } from '~/types/tool-call'
import { ChevronDown } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useToolCallModel } from '~/models/tool-calls'

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
</script>

<template>
  <div class="tool-call-display my-2 overflow-hidden border border-gray-200 rounded-lg dark:border-gray-700">
    <button
      class="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-500 tracking-wide transition-colors hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50"
      @click="isOpen = !isOpen"
    >
      <div class="flex items-center gap-2">
        <ChevronDown
          class="h-3.5 w-3.5 text-gray-400 transition-transform dark:text-gray-500"
          :class="{ 'rotate-180': isOpen }"
        />
        <span class="font-medium uppercase">
          <span v-if="isLoading">Loading...</span>
          <span v-else-if="toolCall">
            {{ toolCall.tool_name }}
          </span>
          <span v-else>Tool call not found</span>
        </span>
      </div>
    </button>

    <div
      v-if="isOpen && !isLoading && toolCall"
      class="border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
    >
      <div v-if="formattedParameters" class="p-3 space-y-2">
        <div class="text-xs text-gray-600 font-semibold tracking-wide uppercase dark:text-gray-400">
          Parameters
        </div>
        <div class="overflow-x-auto border border-gray-200 rounded bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
          <pre class="p-3 text-xs"><code class="text-gray-800 dark:text-gray-200">{{ formattedParameters }}</code></pre>
        </div>
      </div>

      <div v-if="formattedResult" class="p-3 space-y-2" :class="{ 'border-t border-gray-200 dark:border-gray-700': formattedParameters }">
        <div class="text-xs text-gray-600 font-semibold tracking-wide uppercase dark:text-gray-400">
          Result
        </div>
        <div class="overflow-x-auto border border-gray-200 rounded bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
          <pre class="p-3 text-xs"><code class="text-gray-800 dark:text-gray-200">{{ formattedResult }}</code></pre>
        </div>
      </div>

      <div v-if="!formattedParameters && !formattedResult" class="p-3 text-xs text-gray-500 italic dark:text-gray-400">
        No details available
      </div>
    </div>
  </div>
</template>

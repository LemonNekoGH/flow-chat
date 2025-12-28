<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToolCallModel } from '~/models/tool-calls'
import type { ToolCall } from '~/types/tool-call'
import { ChevronDown } from 'lucide-vue-next'

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
  try {
    return JSON.stringify(toolCall.value.parameters, null, 2)
  }
  catch {
    return String(toolCall.value.parameters)
  }
})

const formattedResult = computed(() => {
  if (!toolCall.value?.result)
    return null
  try {
    return JSON.stringify(toolCall.value.result, null, 2)
  }
  catch {
    return String(toolCall.value.result)
  }
})
</script>

<template>
  <div class="tool-call-display my-2 border rounded-lg overflow-hidden">
    <button
      class="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      @click="isOpen = !isOpen"
    >
      <div class="flex items-center gap-2">
        <ChevronDown
          class="w-4 h-4 transition-transform"
          :class="{ 'rotate-180': isOpen }"
        />
        <span class="font-medium text-sm">
          <span v-if="isLoading">加载中...</span>
          <span v-else-if="toolCall">
            🔧 {{ toolCall.tool_name }}
          </span>
          <span v-else>工具调用未找到</span>
        </span>
      </div>
    </button>

    <div
      v-if="isOpen && !isLoading && toolCall"
      class="p-3 border-t bg-white dark:bg-gray-900"
    >
      <div v-if="formattedParameters" class="mb-3">
        <div class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
          参数
        </div>
        <pre class="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto"><code>{{ formattedParameters }}</code></pre>
      </div>

      <div v-if="formattedResult">
        <div class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
          返回值
        </div>
        <pre class="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto"><code>{{ formattedResult }}</code></pre>
      </div>

      <div v-if="!formattedParameters && !formattedResult" class="text-xs text-gray-500 dark:text-gray-400">
        暂无详细信息
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-call-display {
  border-color: rgb(229 231 235);
}

.dark .tool-call-display {
  border-color: rgb(55 65 81);
}
</style>

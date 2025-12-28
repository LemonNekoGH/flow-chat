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
  <div class="tool-call-display my-2 overflow-hidden border rounded-lg">
    <button
      class="w-full flex items-center justify-between bg-gray-50 p-3 transition-colors dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
      @click="isOpen = !isOpen"
    >
      <div class="flex items-center gap-2">
        <ChevronDown
          class="h-4 w-4 transition-transform"
          :class="{ 'rotate-180': isOpen }"
        />
        <span class="text-sm font-medium">
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
      class="border-t bg-white p-3 dark:bg-gray-900"
    >
      <div v-if="formattedParameters" class="mb-3">
        <div class="mb-1 text-xs text-gray-600 font-semibold dark:text-gray-400">
          参数
        </div>
        <pre class="overflow-x-auto rounded bg-gray-50 p-2 text-xs dark:bg-gray-800"><code>{{ formattedParameters }}</code></pre>
      </div>

      <div v-if="formattedResult">
        <div class="mb-1 text-xs text-gray-600 font-semibold dark:text-gray-400">
          返回值
        </div>
        <pre class="overflow-x-auto rounded bg-gray-50 p-2 text-xs dark:bg-gray-800"><code>{{ formattedResult }}</code></pre>
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

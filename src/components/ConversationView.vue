<script setup lang="ts">
// TODO: support text stream in conversation mode
import type { Message } from '~/types/messages'
import { ref, watch } from 'vue'

const props = defineProps<{
  messages: Message[]
}>()

const containerRef = ref<HTMLElement>()
// Track which system messages are expanded
const expandedSystemMessages = ref<Set<string>>(new Set())

// Toggle the expanded state of a system message
function toggleSystemMessage(messageId: string) {
  if (expandedSystemMessages.value.has(messageId)) {
    expandedSystemMessages.value.delete(messageId)
  }
  else {
    expandedSystemMessages.value.add(messageId)
  }
}

watch(() => props.messages, () => {
  requestAnimationFrame(() => {
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight
    }
  })
}, { immediate: true })
</script>

<template>
  <div class="relative flex-1 overflow-hidden">
    <div
      ref="containerRef"
      class="absolute inset-0 overflow-y-auto p-4 space-y-4"
    >
      <div
        v-for="message in messages"
        :key="message.id"
        class="max-w-[80%] w-fit whitespace-pre-wrap rounded-lg p-4"
        :class="{
          'bg-blue-50 dark:bg-blue-900/20 ml-auto': message.role === 'user',
          'bg-purple-50 dark:bg-purple-900/20': message.role === 'assistant',
          'bg-gray-50 dark:bg-gray-900/20 system-message': message.role === 'system',
          'cursor-pointer': message.role === 'system',
        }"
        @click="message.role === 'system' && toggleSystemMessage(message.id)"
      >
        <div v-if="message.role === 'system'" class="flex items-center">
          <div class="font-medium">
            System Prompt
          </div>
          <div class="ml-2 text-xs text-gray-500">
            {{ expandedSystemMessages.has(message.id) ? '(Click to collapse)' : '(Click to expand)' }}
          </div>
        </div>
        <div v-if="message.role !== 'system' || expandedSystemMessages.has(message.id)">
          {{ message.content }}
        </div>
        <div v-else class="text-sm text-gray-500 italic">
          System prompt is collapsed
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dark .bg-white {
  @apply bg-gray-800;
}

.system-message {
  border-left: 3px solid #64748b;
}
</style>

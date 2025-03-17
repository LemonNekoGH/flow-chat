<script setup lang="ts">
import type { Message } from '~/types/messages'
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { useSettingsStore } from '~/stores/settings'
import { scrollToBottom, setToggle } from '../utils/index'
import MarkdownView from './MarkdownView.vue'

const props = defineProps<{
  messages: Message[]
}>()

// Get the default model from settings store
const { model } = storeToRefs(useSettingsStore())

// Track which system messages are expanded
const expandedSystemMessages = ref(new Set<string>())

const containerRef = ref<HTMLElement>()
watch(() => [props.messages, props.messages.at(-1)!.content], () => {
  requestAnimationFrame(() => {
    scrollToBottom(containerRef.value)
  })
}, { immediate: true })
</script>

<template>
  <div class="relative w-full w-full max-w-screen-lg flex-1 overflow-hidden">
    <div
      ref="containerRef"
      class="absolute inset-0 h-full overflow-y-auto p-4 space-y-4"
    >
      <template v-for="message in messages" :key="message.id">
        <div
          v-if="message.model && message.model !== model" class="mb-2 rounded bg-opacity-50 p-1 text-xs font-medium" :class="{
            'text-right': message.role === 'user',
          }"
        >
          {{ message.role === 'user' ? `@${message.model}` : message.model }}
        </div>
        <div
          class="max-w-[80%] w-fit whitespace-pre-wrap rounded-lg p-4"
          :class="{
            'bg-blue-50 dark:bg-blue-900/20 ml-auto': message.role === 'user',
            'bg-purple-50 dark:bg-purple-900/20': message.role === 'assistant',
            'bg-gray-50 dark:bg-gray-900/20 system-message': message.role === 'system',
          }"
        >
          <div v-if="message.role === 'system'" class="flex cursor-pointer items-center" @click="setToggle(expandedSystemMessages, message.id)">
            <div class="font-medium">
              System Prompt
            </div>
            <div class="ml-2 text-xs text-gray-500">
              {{ expandedSystemMessages.has(message.id) ? '(Click to collapse)' : '(Click to expand)' }}
            </div>
          </div>
          <div v-if="message.role !== 'system' || expandedSystemMessages.has(message.id)">
            <MarkdownView :content="message.content" />
          </div>
          <div v-else class="text-sm text-gray-500 italic">
            System prompt is collapsed
          </div>
        </div>
      </template>
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

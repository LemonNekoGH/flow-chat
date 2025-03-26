<script setup lang="ts">
import type { Message } from '~/types/messages'
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { useSettingsStore } from '~/stores/settings'
import { scrollToBottom } from '../utils/index'
import MarkdownView from './MarkdownView.vue'
import SystemPrompt from './SystemPrompt.vue'

const props = defineProps<{
  messages: Message[]
}>()

// Get the default model from settings store
const { model: defaultModel } = storeToRefs(useSettingsStore())

const containerRef = ref<HTMLElement>()
watch(() => [props.messages, props.messages.at(-1)!.content], () => {
  requestAnimationFrame(() => {
    scrollToBottom(containerRef.value)
  })
}, { immediate: true })
</script>

<template>
  <div relative w-full max-w-screen-lg flex-1>
    <div ref="containerRef" absolute inset-0 flex="~ col" gap-4 of-y-auto p-4>
      <div v-for="{ id, model, role, content } in messages" :key="id" class="bubble" :class="[role]">
        <span
          v-if="model && model !== defaultModel"
          absolute top--5 text-xs font-medium
          :class="role === 'user' ? 'right-0' : 'left-0'"
        >{{ role === 'user' ? `@${model}` : model }}</span>
        <SystemPrompt v-if="role === 'system'" :id="id" />
        <MarkdownView v-else :content="content" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.bubble {
  @apply relative max-w-[80%] w-fit whitespace-pre-wrap rounded-lg p-4;

  &.user {
    @apply bg-blue-50 dark:bg-blue-900/20 self-end;
  }

  &.assistant {
    @apply bg-purple-50 dark:bg-purple-900/20;
  }

  &.system {
    @apply bg-gray-50 dark:bg-gray-900/20;
    border-left: 3px solid #64748b;
  }
}
</style>

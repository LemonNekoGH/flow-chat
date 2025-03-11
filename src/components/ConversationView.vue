<script setup lang="ts">
// TODO: support text stream in conversation mode
import type { Message } from '~/types/messages'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  messages: Message[]
  selectedMessageId: string
}>()

const containerRef = ref<HTMLElement>()

const conversationMessages = computed(() => {
  const messages: Message[] = []
  let currentId: string | null = props.selectedMessageId

  while (currentId) {
    const message = props.messages.find(m => m.id === currentId)
    if (!message)
      break
    messages.unshift(message)
    currentId = message.parentMessageId
  }

  return messages
})

watch(conversationMessages, () => {
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
        v-for="message in conversationMessages"
        :key="message.id"
        class="max-w-[80%] w-fit rounded-lg p-4"
        :class="{
          'bg-blue-50 dark:bg-blue-900/20 ml-auto': message.role === 'user',
          'bg-purple-50 dark:bg-purple-900/20': message.role === 'assistant',
        }"
      >
        {{ message.content }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.dark .bg-white {
  @apply bg-gray-800;
}
</style>

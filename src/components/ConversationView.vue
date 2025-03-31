<script setup lang="ts">
import type { Message } from '~/types/messages'
import { computed } from 'vue'
import MarkdownView from './MarkdownView.vue'
import SystemPrompt from './SystemPrompt.vue'

const props = defineProps<{
  messages: Message[]
}>()

// const roomsStore = useRoomsStore()
// const { currentRoom } = storeToRefs(roomsStore)

const userAndAssistantMessages = computed(() => {
  return props.messages.filter(message => message.role === 'user' || message.role === 'assistant')
})
</script>

<template>
  <div class="mx-auto max-w-3xl w-full p-6 space-y-6">
    <!-- System prompt -->
    <div class="border border-gray-200 rounded-md p-4 dark:border-gray-700">
      <SystemPrompt />
    </div>

    <!-- Messages -->
    <div class="space-y-6">
      <template v-for="(message) in userAndAssistantMessages" :key="message.id">
        <div
          class="flex gap-4"
          :class="{ 'flex-row-reverse': message.role === 'user' }"
        >
          <!-- Avatar -->
          <div
            class="h-8 w-8 flex flex-shrink-0 items-center justify-center rounded-full"
            :class="message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'"
          >
            <div v-if="message.role === 'user'" class="i-solar-user-rounded-bold text-lg" />
            <div v-else class="i-solar-bot-bold text-lg" />
          </div>

          <!-- Message content -->
          <div
            class="min-w-0 flex-1 rounded-md p-4"
            :class="message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'"
          >
            <MarkdownView
              :content="message.content"
              :dark="message.role === 'user'"
            />
            <div v-if="message.model" class="mt-2 text-xs opacity-70">
              {{ message.model }}
            </div>
          </div>
        </div>
      </template>
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

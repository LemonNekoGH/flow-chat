<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMessagesStore } from '~/stores/messages'
import { useRoomsStore } from '~/stores/rooms'
import { getMessageText, toTextContentParts } from '~/utils/messageContent'
import MarkdownView from './MarkdownView.vue'
import Editor from './SystemPromptEdit.vue'

const props = defineProps<{
  id?: string
}>()

const messagesStore = useMessagesStore()
const roomsStore = useRoomsStore()
const expanded = ref(false)

const message = computed(() => {
  if (props.id) {
    // Use specific system prompt ID if provided
    return messagesStore.getMessageById(props.id)!
  }
  else {
    // Use current room's system prompt ID
    const currentRoom = roomsStore.currentRoom
    if (!currentRoom || !currentRoom.template_id)
      return null
    return messagesStore.getMessageById(currentRoom.template_id)
  }
})

const messageText = computed({
  get: () => message.value ? getMessageText(message.value.content) : '',
  set: (value: string) => {
    if (!message.value) {
      return
    }

    message.value.content = toTextContentParts(value)
  },
})
</script>

<template>
  <div v-if="message" grid gap-2>
    <div flex items-center justify-between>
      System Prompt
      <div flex items-center gap-2>
        <Editor v-model="messageText">
          <div i-carbon-edit cursor-pointer title="Edit" />
        </Editor>

        <div
          cursor-pointer
          :class="expanded ? 'i-carbon-chevron-up' : 'i-carbon-chevron-down'"
          @click="expanded = !expanded"
        />
      </div>
    </div>

    <MarkdownView v-if="expanded" dark:bt-gray-700 :content="message.content" />
    <div v-else line-clamp-3 text-gray-500>
      {{ messageText }}
    </div>
  </div>
</template>

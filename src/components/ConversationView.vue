<script setup lang="ts">
import type { Message, MessageRole } from '~/types/messages'
import { useClipboard, useEventListener } from '@vueuse/core'
import { computed, nextTick, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { streamText } from 'xsai'
import { useMessagesStore } from '~/stores/messages'
import { useRoomsStore } from '~/stores/rooms'
import { useSettingsStore } from '~/stores/settings'
import MarkdownView from './MarkdownView.vue'
import NodeContextMenu from './NodeContextMenu.vue'
import SystemPrompt from './SystemPrompt.vue'

const props = defineProps<{
  messages: Message[]
}>()

const messagesStore = useMessagesStore()
const roomsStore = useRoomsStore()
const settingsStore = useSettingsStore()

const containerRef = ref<HTMLDivElement>()
const inputMessage = ref('')
const isGenerating = ref(false)
const showModelSelector = ref(false)
const selectedModel = ref('')

const userAndAssistantMessages = computed(() => {
  return props.messages.filter(message => message.role === 'user' || message.role === 'assistant')
})

// Watch for "model=" in the input
watch(inputMessage, (newValue) => {
  if (newValue.startsWith('model=') && !newValue.match(/\s/)) {
    showModelSelector.value = true
    if (settingsStore.models.length === 0) {
      settingsStore.fetchModels()
    }
  }
  else if (newValue === '') {
    selectedModel.value = ''
  }
  else {
    showModelSelector.value = false
  }
}, { immediate: true })

// Scroll to bottom when new messages arrive
watch(() => userAndAssistantMessages.value.length, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { immediate: true })

function scrollToBottom() {
  if (containerRef.value) {
    containerRef.value.scrollTop = containerRef.value.scrollHeight
  }
}

// Generate AI response
async function generateResponse(parentId: string, model: string | null = null) {
  const usingModel = model ?? settingsStore.model
  if (!usingModel || !settingsStore.baseURL) {
    settingsStore.showSettingsDialog = true
    return
  }

  try {
    const { textStream } = await streamText({
      apiKey: settingsStore.apiKey,
      baseURL: settingsStore.baseURL,
      model: usingModel,
      messages: messagesStore.getBranchById(parentId).messages.map(({ content, role }) => ({ content, role })),
    })

    const { id } = messagesStore.newMessage('', 'assistant', parentId, usingModel, roomsStore.currentRoom?.id)

    const reader = textStream.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done)
          break

        if (value) {
          messagesStore.updateMessage(id, value)
          await nextTick()
          scrollToBottom()
        }
      }
    }
    finally {
      reader.releaseLock()
    }
  }
  catch (error) {
    console.error(error)
    throw error
  }
}

// Copy message content
const { copy } = useClipboard()
async function copyMessage(message: Message) {
  try {
    await copy(message.content)
    toast.success('Copied to clipboard')
  }
  catch {
    toast.error('Failed to copy message')
  }
}

// Fork from a message
function forkMessage(messageId: string, model?: string | null) {
  generateResponse(messageId, model)
}

// Context menu state
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  messageId: '',
  role: undefined as MessageRole | undefined,
})

// Handle right-click on message
function handleContextMenu(event: MouseEvent, message: Message) {
  event.preventDefault()
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    messageId: message.id,
    role: message.role,
  }
}

// Handle context menu fork
function handleContextMenuFork() {
  const messageId = contextMenu.value.messageId
  if (messageId) {
    forkMessage(messageId)
  }
  contextMenu.value.show = false
}

// Handle context menu fork with model
function handleContextMenuForkWith() {
  // For now, we just fork with default model
  handleContextMenuFork()
}

// Handle context menu delete
function handleContextMenuDelete() {
  const messageId = contextMenu.value.messageId
  if (messageId) {
    messagesStore.deleteSubtree(messageId)
  }
  contextMenu.value.show = false
}

// Handle context menu copy
function handleContextMenuCopy() {
  const messageId = contextMenu.value.messageId
  if (messageId) {
    const message = messagesStore.getMessageById(messageId)
    if (message) {
      copyMessage(message)
    }
  }
  contextMenu.value.show = false
}

// Handle context menu focus in
function handleContextMenuFocusIn() {
  // No direct equivalent in conversation view
  contextMenu.value.show = false
}

// Close context menu on click outside
useEventListener('click', () => {
  contextMenu.value.show = false
})
</script>

<template>
  <div class="h-full w-full flex flex-col">
    <!-- Messages container -->
    <div ref="containerRef" class="flex-1 overflow-y-auto p-4 space-y-6">
      <!-- System prompt -->
      <div class="mb-6 border border-gray-200 rounded-md p-4 dark:border-gray-700">
        <SystemPrompt />
      </div>

      <!-- Messages -->
      <template v-for="message in userAndAssistantMessages" :key="message.id">
        <div
          class="group flex gap-4"
          :class="{ 'flex-row-reverse': message.role === 'user' }"
          @contextmenu="handleContextMenu($event, message)"
        >
          <!-- Avatar -->
          <div
            class="h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-full"
            :class="message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'"
          >
            <div v-if="message.role === 'user'" class="i-solar-user-rounded-bold text-xl" />
            <div v-else class="i-solar-bot-bold text-xl" />
          </div>

          <!-- Message content -->
          <div
            class="relative min-w-0 flex-1 rounded-lg p-4"
            :class="message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'"
          >
            <MarkdownView
              :content="message.content"
              :dark="message.role === 'user'"
            />

            <div v-if="message.model" class="mt-2 text-xs opacity-70">
              {{ message.model }}
            </div>

            <!-- Message actions -->
            <div
              class="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
              :class="message.role === 'user' ? 'text-white/70' : 'text-gray-500'"
            >
              <button
                class="h-7 w-7 flex items-center justify-center rounded-full hover:bg-black/10"
                title="Copy"
                @click="copyMessage(message)"
              >
                <div class="i-solar-copy-bold text-sm" />
              </button>

              <button
                v-if="message.role !== 'system'"
                class="h-7 w-7 flex items-center justify-center rounded-full hover:bg-black/10"
                title="Fork"
                @click="forkMessage(message.id)"
              >
                <div class="i-solar-code-line-duotone text-sm" />
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Generating indicator -->
      <div v-if="isGenerating" class="flex items-center gap-2 pl-14 text-sm text-gray-500 italic">
        <div class="i-solar-loading-bold animate-spin" />
        Generating...
      </div>
    </div>

    <!-- Context menu -->
    <NodeContextMenu
      v-if="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :role="contextMenu.role"
      @fork="handleContextMenuFork"
      @fork-with="handleContextMenuForkWith"
      @focus-in="handleContextMenuFocusIn"
      @delete="handleContextMenuDelete"
      @copy="handleContextMenuCopy"
    />
  </div>
</template>

<style scoped>
:deep(.markdown-body) {
  background-color: transparent;
}
</style>

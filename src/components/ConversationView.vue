<script setup lang="ts">
import type { Message, MessageRole } from '~/types/messages'
import { useClipboard, useEventListener } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, nextTick, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { streamText } from 'xsai'
import { useMessagesStore } from '~/stores/messages'
import { useRoomsStore } from '~/stores/rooms'
import { useSettingsStore } from '~/stores/settings'
import { parseMessage } from '~/utils/chat'
import { asyncIteratorFromReadableStream } from '~/utils/interator'
import ConversationNodeContextMenu from './ConversationNodeContextMenu.vue'
import MarkdownView from './MarkdownView.vue'
import ModelSelector from './ModelSelector.vue'
import SystemPrompt from './SystemPrompt.vue'

const props = defineProps<{
  messages: Message[]
  selectedMessageId?: string | null
}>()
const emit = defineEmits(['update:selected-message-id'])

const messagesStore = useMessagesStore()
const roomsStore = useRoomsStore()
const settingsStore = useSettingsStore()
const { defaultTextModel, currentProvider } = storeToRefs(settingsStore)

const containerRef = ref<HTMLDivElement>()
const inputMessage = ref('')
const showModelSelector = ref(false)
const selectedModel = ref('')
const selectedMessageId = ref<string | null>(props.selectedMessageId ?? null)
const generatingMessageId = ref<string | null>(null)
const streamTextAbortControllers = ref<Map<string, AbortController>>(new Map())

const userAndAssistantMessages = computed(() => {
  return props.messages.filter(message => message.role === 'user' || message.role === 'assistant')
})

watch(() => props.selectedMessageId, (val) => {
  selectedMessageId.value = val ?? null
})

watch(selectedMessageId, (val) => {
  emit('update:selected-message-id', val)
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
async function generateResponse(parentId: string | null, provider: string, model: string) {
  if (!model) {
    toast.error('Please select a model')
    return
  }
  if (!currentProvider.value?.baseURL) {
    toast.error('Please select a provider')
    return
  }
  const { id: newMsgId } = roomsStore.createMessage('', 'assistant', parentId, provider, model, true)
  generatingMessageId.value = newMsgId
  const abortController = new AbortController()
  streamTextAbortControllers.value.set(newMsgId, abortController)

  const branch = messagesStore.getBranchById(parentId)
  const { textStream } = await streamText({
    maxSteps: 10,
    apiKey: currentProvider.value?.apiKey,
    baseURL: currentProvider.value?.baseURL,
    model,
    messages: branch.messages.map(({ content, role }) => ({ content, role })),
    abortSignal: abortController.signal,
  })
  for await (const textPart of asyncIteratorFromReadableStream(textStream, async v => v)) {
    if (messagesStore.image) {
      messagesStore.updateMessage(newMsgId, `![generated image](${messagesStore.image})`)
      messagesStore.image = ''
    }
    textPart && messagesStore.updateMessage(newMsgId, textPart)
  }
  generatingMessageId.value = null
  streamTextAbortControllers.value.delete(newMsgId)
}

// Generate AI response
async function handleSendButton() {
  if (!inputMessage.value)
    return
  const { model, message } = parseMessage(inputMessage.value)
  const { id } = roomsStore.createMessage(message, 'user', selectedMessageId.value, defaultTextModel.value.provider, model ?? defaultTextModel.value.model)
  inputMessage.value = model ? `model=${model} ` : ''
  selectedMessageId.value = id
  try {
    await generateResponse(id, defaultTextModel.value.provider, model ?? defaultTextModel.value.model)
  }
  catch (error) {
    const err = error as Error
    if (err.message.includes('BodyStreamBuffer was aborted'))
      return
    if (err.message.includes('does not support tools')) {
      toast.error('This model does not support tools')
      return
    }
    console.error(error)
    toast.error('Failed to generate response')
  }
  finally {
    if (generatingMessageId.value) {
      messagesStore.updateMessage(generatingMessageId.value, '', false)
    }
    generatingMessageId.value = null
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
  generateResponse(messageId, defaultTextModel.value.provider, model ?? defaultTextModel.value.model)
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

function handleContextMenuFork() {
  const messageId = contextMenu.value.messageId
  if (messageId) {
    forkMessage(messageId)
  }
  contextMenu.value.show = false
}

function handleContextMenuForkWith() {
  // For now, we just fork with default model
  handleContextMenuFork()
}

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

function handleContextMenuFocusIn() {
  contextMenu.value.show = false
}

// Abort generation
function handleAbort(messageId: string) {
  const abortController = streamTextAbortControllers.value.get(messageId)
  abortController?.abort('Aborted by user')
  streamTextAbortControllers.value.delete(messageId)
  messagesStore.updateMessage(messageId, '', false)
  toast.success('Generation aborted')
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

            <div v-if="message.model">
              <div class="mt-2 text-xs opacity-70" font-mono>
                {{ message.model }}
              </div>
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
              <button
                v-if="message.generating"
                class="h-7 w-7 flex items-center justify-center rounded-full hover:bg-black/10"
                title="Abort"
                @click="handleAbort(message.id)"
              >
                <div class="i-solar-stop-bold text-sm" />
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Generating indicator -->
      <div v-if="generatingMessageId" class="flex items-center gap-2 pl-14 text-sm text-gray-500 italic">
        <div class="i-solar-loading-bold animate-spin" />
        Generating...
      </div>
    </div>

    <!-- Context menu -->
    <ConversationNodeContextMenu
      v-if="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :role="contextMenu.role"
      @fork="handleContextMenuFork"
      @fork-with="handleContextMenuForkWith"
      @focus-in="handleContextMenuFocusIn"
      @copy="handleContextMenuCopy"
    />
    <!-- Input area -->
    <div class="relative w-full max-w-screen-md flex rounded-lg bg-neutral-100 p-2 shadow-lg dark:bg-neutral-900">
      <textarea
        v-model="inputMessage"
        placeholder="Enter to send message, Shift+Enter for new-line"
        class="max-h-60vh w-full resize-none border-gray-300 rounded-sm px-3 py-2 outline-none transition-all duration-200 ease-in-out dark:bg-neutral-800 focus:ring-2 focus:ring-black dark:focus:ring-white"
        @keydown.enter.exact.prevent="handleSendButton"
      />
      <!-- ModelSelector -->
      <ModelSelector
        v-if="showModelSelector"
        v-model:show-model-selector="showModelSelector"
        :search-term="inputMessage.substring(6)"
        @select-model="(model) => { inputMessage = `model=${model} `; showModelSelector = false }"
      />
      <button class="absolute bottom-3 right-3" @click="handleSendButton">
        Send
      </button>
    </div>
  </div>
</template>

<style scoped>
:deep(.markdown-body) {
  background-color: transparent;
}
</style>

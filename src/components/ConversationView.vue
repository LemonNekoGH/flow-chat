<script setup lang="ts">
import type { Message, MessageRole } from '~/types/messages'
import { useClipboard, useEventListener } from '@vueuse/core'
import { computed, nextTick, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useMessagesStore } from '~/stores/messages'
import ConversationNodeContextMenu from './ConversationNodeContextMenu.vue'
import MarkdownView from './MarkdownView.vue'
import SystemPrompt from './SystemPrompt.vue'

const props = defineProps<{
  messages: Message[]
}>()
const emit = defineEmits<{
  (e: 'forkMessage', messageId: string, model?: string): void
  (e: 'abortMessage', messageId: string): void
}>()

const messagesStore = useMessagesStore()

const containerRef = ref<HTMLDivElement>()
const selectedText = ref('')
const shouldAutoScroll = ref(true) // if user is at the bottom of the conversation, auto scroll
const scrollRafId = ref<number | null>(null)

const userAndAssistantMessages = computed(() => {
  return props.messages.filter(message => message.role === 'user' || message.role === 'assistant')
})

const messagesContentSignature = computed(() => {
  return userAndAssistantMessages.value
    .map(message => `${message.id}:${message.content.length}`)
    .join('|')
})

// Scroll to bottom when new messages arrive
watch(() => userAndAssistantMessages.value.length, () => {
  void requestAutoScroll()
}, { immediate: true })

watch(messagesContentSignature, () => {
  void requestAutoScroll()
})

function scrollToBottom() {
  if (containerRef.value) {
    containerRef.value.scrollTo({ top: containerRef.value.scrollHeight, behavior: 'smooth' })
  }
}

function updateShouldAutoScroll() {
  const el = containerRef.value
  if (!el) {
    shouldAutoScroll.value = true
    return
  }

  const distanceToBottom = el.scrollHeight - (el.scrollTop + el.clientHeight)
  shouldAutoScroll.value = distanceToBottom <= 24
}

async function requestAutoScroll() {
  if (!shouldAutoScroll.value) {
    return
  }

  if (scrollRafId.value !== null) {
    cancelAnimationFrame(scrollRafId.value)
  }

  scrollRafId.value = requestAnimationFrame(async () => {
    scrollRafId.value = null
    await nextTick()
    scrollToBottom()
  })
}

// Copy message content
const { copy } = useClipboard()
async function copyContent(content: string) {
  try {
    await copy(content)
    toast.success('Copied to clipboard')
  }
  catch {
    toast.error('Failed to copy message')
  }
}

async function copyMessage(message: Message) {
  await copyContent(message.content)
}

// Fork from a message
function forkMessage(messageId: string, model?: string) {
  emit('forkMessage', messageId, model)
}

// Context menu state
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  messageId: '',
  role: undefined as MessageRole | undefined,
})

function extractSelectionFrom(target: EventTarget | null) {
  if (!(target instanceof HTMLElement))
    return ''

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed)
    return ''

  const range = selection.getRangeAt(0)
  const { startContainer, endContainer } = range

  if (!target.contains(startContainer) || !target.contains(endContainer))
    return ''

  const text = selection.toString()
  return text.trim() ? text : ''
}

// Handle right-click on message
function handleContextMenu(event: MouseEvent, message: Message) {
  event.preventDefault()
  selectedText.value = extractSelectionFrom(event.currentTarget)
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    messageId: message.id,
    role: message.role,
  }
}

function closeContextMenu() {
  contextMenu.value.show = false
  selectedText.value = ''
}

function handleContextMenuFork() {
  const messageId = contextMenu.value.messageId
  closeContextMenu()
  if (messageId) {
    forkMessage(messageId)
  }
}

function handleContextMenuForkWith() {
  // For now, we just fork with default model
  handleContextMenuFork()
}

async function handleContextMenuCopy() {
  const messageId = contextMenu.value.messageId
  const text = selectedText.value
  closeContextMenu()

  if (text) {
    await copyContent(text)
    return
  }

  if (messageId) {
    const message = messagesStore.getMessageById(messageId)
    if (message) {
      await copyMessage(message)
    }
  }
}

function handleContextMenuFocusIn() {
  closeContextMenu()
}

// Abort generation
function handleAbort(messageId: string) {
  emit('abortMessage', messageId)
}

// Close context menu on click outside
useEventListener('click', closeContextMenu)

useEventListener(containerRef, 'scroll', updateShouldAutoScroll)
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
                class="copy-icon-btn"
                title="Copy"
                @click="copyMessage(message)"
              >
                <div class="i-solar-copy-bold text-sm" />
              </button>

              <button
                v-if="message.role !== 'system'"
                class="copy-icon-btn"
                title="Fork"
                @click="forkMessage(message.id)"
              >
                <div class="i-solar-code-line-duotone text-sm" />
              </button>
              <button
                v-if="messagesStore.isGenerating(message.id)"
                class="copy-icon-btn"
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
      <div v-if="messagesStore.generatingMessages.length" class="flex items-center gap-2 pl-14 text-sm text-gray-500 italic">
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
  </div>
</template>

<style scoped>
:deep(.markdown-body) {
  background-color: transparent;
}
</style>

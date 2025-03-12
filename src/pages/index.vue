<script setup lang="ts">
import type { Node, NodeMouseEvent } from '@vue-flow/core'
import type { BaseMessage } from '~/types/messages'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { VueFlow } from '@vue-flow/core'
import { MiniMap } from '@vue-flow/minimap'
import { useEventListener } from '@vueuse/core'
import { streamText } from '@xsai/stream-text'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import ConversationView from '~/components/ConversationView.vue'
import NodeContextMenu from '~/components/NodeContextMenu.vue'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import { useLayout } from '~/composables/useLayout'
import { useMessagesStore } from '~/stores/messages'
import { ChatMode, useModeStore } from '~/stores/mode'
import { useSettingsStore } from '~/stores/settings'

const settingsStore = useSettingsStore()
const messagesStore = useMessagesStore()
const { layout } = useLayout()
const { currentMode } = storeToRefs(useModeStore())

const selectedMessageId = ref<string | null>(null)
const selectedMessage = computed(() => {
  return messagesStore.messages.find(message => message.id === selectedMessageId.value)
})

// #region vue flow event handlers
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
})

function handleNodeClick(event: NodeMouseEvent) {
  selectedMessageId.value = event.node.id
}

function handlePaneClick() {
  selectedMessageId.value = null
}

function handleNodeContextMenu(event: NodeMouseEvent) {
  selectedMessageId.value = event.node.id
  const mouseEvent = event.event as MouseEvent
  mouseEvent.preventDefault()
  contextMenu.value = {
    show: true,
    x: mouseEvent.clientX || 0,
    y: mouseEvent.clientY || 0,
  }
}
// #endregion

const currentBranch = computed(() => {
  return messagesStore.getBranchById(selectedMessageId.value)
})

const nodesAndEdges = computed(() => {
  const { ids } = currentBranch.value
  // TODO: use for-loops below for a little bit performance improvement
  // as we only need to iterate over `messagesStore.messages` once,
  // but currently thrice (two `map`s and one `filter`)
  let nodes = messagesStore.messages.map((message, index) => ({
    id: message.id,
    position: {
      x: index * 100,
      y: 0,
    },
    label: message.content,
    data: {
      message,
    },
    class: [message.role, selectedMessageId.value && !ids.has(message.id) ? 'inactive' : ''],
  } as Node))

  const edges = messagesStore.messages
    .filter(message => message.parentMessageId)
    .map(message => ({
      id: `${message.parentMessageId!}-${message.id}`,
      source: message.parentMessageId!,
      target: message.id,
      style: ids.has(message.id) ? { stroke: '#000', strokeWidth: '2' } : {},
    }))

  nodes = layout(nodes, edges)

  return { nodes, edges }
})

const inputMessage = ref('')

async function* asyncIteratorFromReadableStream<T, F = Uint8Array>(
  res: ReadableStream<F>,
  func: (value: F) => Promise<T>,
): AsyncGenerator<T, void, unknown> {
  // react js - TS2504: Type 'ReadableStream<Uint8Array>' must have a '[Symbol.asyncIterator]()' method that returns an async iterator - Stack Overflow
  // https://stackoverflow.com/questions/76700924/ts2504-type-readablestreamuint8array-must-have-a-symbol-asynciterator
  const reader = res.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        return
      }

      yield func(value)
    }
  }
  finally {
    reader.releaseLock()
  }
}

useEventListener('click', () => {
  contextMenu.value.show = false
})

useEventListener('keydown', (event) => {
  if ((event.key === 'Backspace' || event.key === 'Delete') && selectedMessageId.value) {
    const activeElement = document.activeElement
    const isInputActive
      = activeElement
        && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable)

    if (!isInputActive) {
      deleteSelectedNode(selectedMessageId.value)
    }
  }
})

// delete the current selected node
function deleteSelectedNode(nodeId: string) {
  // delete the node and all its descendants from store
  messagesStore.deleteSubtree(nodeId)

  // cancel selection
  selectedMessageId.value = null
}

function handleContextMenuDelete() {
  selectedMessageId.value && deleteSelectedNode(selectedMessageId.value)
}

async function generateResponse(parentId: string | null) {
  if (!settingsStore.baseURL || !settingsStore.model) {
    settingsStore.showSettingsDialog = true
    return
  }

  const { textStream } = await streamText({
    apiKey: settingsStore.apiKey,
    baseURL: settingsStore.baseURL,
    model: settingsStore.model,
    messages: currentBranch.value.messages.map(({ content, role }): BaseMessage => ({ content, role })),
  })

  const { id } = messagesStore.newMessage('', 'assistant', parentId)

  for await (const textPart of asyncIteratorFromReadableStream(textStream, async v => v)) {
    // textPart might be `undefined` in some cases
    textPart && messagesStore.updateMessage(id, textPart)
  }

  // auto select the answer
  selectedMessageId.value = id
}

async function sendMessage() {
  if (!inputMessage.value) {
    return
  }

  const { id } = messagesStore.newMessage(inputMessage.value, 'user', selectedMessageId.value)
  inputMessage.value = ''
  selectedMessageId.value = id
  await generateResponse(id)
}

function handleContextMenuFocusIn() {
  currentMode.value = ChatMode.CONVERSATION
}

function handleMessageInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}
</script>

<template>
  <VueFlow
    v-if="currentMode === ChatMode.FLOW"
    :nodes="nodesAndEdges.nodes"
    :edges="nodesAndEdges.edges"
    @node-click="handleNodeClick"
    @pane-click="handlePaneClick"
    @node-context-menu="handleNodeContextMenu"
  >
    <Background />
    <Controls />
    <MiniMap />
    <NodeContextMenu
      v-if="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :role="selectedMessage?.role"
      @generate="generateResponse(selectedMessageId)"
      @focus-in="handleContextMenuFocusIn"
      @delete="handleContextMenuDelete"
    />
  </VueFlow>
  <ConversationView
    v-if="currentMode === ChatMode.CONVERSATION"
    :messages="currentBranch.messages"
  />
  <div class="flex gap-2 p-4" bg="white dark:gray-900" shadow="lg current">
    <Input v-model="inputMessage" placeholder="Press Enter to send message" @keydown="handleMessageInputKeydown" />
    <Button class="h-10" @click="sendMessage">
      Send
    </Button>
  </div>
</template>

<style scoped>
.vue-flow {
  flex: 1;
}

:deep(.vue-flow__node) {
  border-radius: 8px;

  &.user {
    background: #e3f2fd;
    border-color: #90caf9;
  }

  &.assistant {
    background: #f3e5f5;
    border-color: #ce93d8;
  }

  &.inactive {
    opacity: 0.5;
    color: #999;
  }
}
</style>

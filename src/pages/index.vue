<script setup lang="ts">
import type { NodeMouseEvent } from '@vue-flow/core'
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
    class: [message.role, selectedMessageId.value && !currentBranch.value.ids.has(message.id) ? 'inactive' : ''],
  }))

  const edges = messagesStore.messages
    .filter(message => message.parentMessageId)
    .map(message => ({
      id: `${message.parentMessageId!}-${message.id}`,
      source: message.parentMessageId!,
      target: message.id,
      style: {
        stroke:
          selectedMessageId.value && currentBranch.value.ids.has(message.id)
            ? '#000'
            : '#ccc',
        strokeWidth:
          selectedMessageId.value && currentBranch.value.ids.has(message.id)
            ? '2'
            : '1',
      },
    }))

  // FIXME: messages are not typed
  // @ts-expect-error - messages are not typed
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
  // delete the node and all its children
  const nodesToDelete = new Set<string>()

  // find all children
  function findChildNodes(parentId: string) {
    nodesToDelete.add(parentId)
    const childNodes = messagesStore.messages.filter(message => message.parentMessageId === parentId)
    for (const child of childNodes) {
      findChildNodes(child.id)
    }
  }

  findChildNodes(nodeId)

  // delete nodes from store
  messagesStore.deleteMessages(Array.from(nodesToDelete))

  // cancel selection
  selectedMessageId.value = null
}

function handleContextMenuDelete() {
  if (!selectedMessageId.value)
    return

  deleteSelectedNode(selectedMessageId.value)

  contextMenu.value.show = false
}

async function generateAnotherResponse() {
  await sendMessage(true)
  contextMenu.value.show = false
}

async function sendMessage(skipUserMessage = false) {
  // TODO: needs refactor! extract the generate response part and call different functions for `sendMessage` and `generateAnotherResponse`
  if (!skipUserMessage && !inputMessage.value) {
    return
  }

  if (!settingsStore.baseURL || !settingsStore.model) {
    settingsStore.showSettingsDialog = true
    return
  }

  let parentId = selectedMessageId.value
  if (!skipUserMessage) {
    const message = messagesStore.newMessage(inputMessage.value, 'user', selectedMessageId.value)
    inputMessage.value = ''
    parentId = selectedMessageId.value = message.id
  }

  const textStream = await streamText({
    apiKey: settingsStore.apiKey,
    baseURL: settingsStore.baseURL,
    model: settingsStore.model,
    messages: currentBranch.value.messages,
  })

  const answer = messagesStore.newMessage('', 'assistant', parentId)

  for await (const textPart of asyncIteratorFromReadableStream(textStream.textStream, async v => v)) {
    // textPart might be `undefined` in some cases
    textPart && messagesStore.updateMessage(answer.id, textPart)
  }

  // auto select the answer
  selectedMessageId.value = answer.id
}

function handleContextMenuFocusIn() {
  currentMode.value = ChatMode.CONVERSATION
}

function handleMessageInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage(false)
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
      @generate="generateAnotherResponse"
      @delete="handleContextMenuDelete"
      @focus-in="handleContextMenuFocusIn"
    />
  </VueFlow>
  <ConversationView
    v-if="currentMode === ChatMode.CONVERSATION"
    :messages="messagesStore.messages"
    :selected-message-id="selectedMessageId!"
  />
  <div class="flex gap-2 p-4" bg="white dark:gray-900" shadow="lg current">
    <Input v-model="inputMessage" placeholder="Press Enter to send message" @keydown="handleMessageInputKeydown" />
    <Button class="h-10" @click="sendMessage(false)">
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

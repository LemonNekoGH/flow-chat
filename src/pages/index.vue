<script setup lang="ts">
import type { Edge, Node, NodeMouseEvent } from '@vue-flow/core'
import type { BaseMessage } from '~/types/messages'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { VueFlow } from '@vue-flow/core'
import { MiniMap } from '@vue-flow/minimap'
import { useEventListener } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, h, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { streamText } from 'xsai'
import ConversationView from '~/components/ConversationView.vue'
import HeaderMenu from '~/components/HeaderMenu.vue'
import NodeContextMenu from '~/components/NodeContextMenu.vue'
import Sidebar from '~/components/Sidebar.vue'
import Button from '~/components/ui/button/Button.vue'
import BasicTextarea from '~/components/ui/input/Textarea.vue'
import { useLayout } from '~/composables/useLayout'
import { useMessagesStore } from '~/stores/messages'
import { ChatMode, useModeStore } from '~/stores/mode'
import { useRoomsStore } from '~/stores/rooms'
import { useSettingsStore } from '~/stores/settings'

const settingsStore = useSettingsStore()
const messagesStore = useMessagesStore()
const roomsStore = useRoomsStore()
const { layout } = useLayout()
const { currentMode } = storeToRefs(useModeStore())

// Initialize default room if needed
onMounted(() => {
  roomsStore.initializeDefaultRoom()
})

const selectedMessageId = ref<string | null>(null)
const selectedMessage = computed(() => {
  return messagesStore.getMessageById(selectedMessageId.value)
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
  let x = 0
  const nodes: Node[] = [{
    id: 'root',
    position: { x, y: 0 },
    label: h('div', { class: 'text-xl font-bold' }, 'Hello! How can I assist you today?'),
    style: { pointerEvents: 'none' },
    class: ['assistant'],
  }]
  const edges: Edge[] = []

  for (const message of messagesStore.currentRoomMessages) {
    const { id, parentMessageId, content, role } = message
    const active = ids.has(id)
    x += 100
    nodes.push({
      id,
      position: { x, y: 0 },
      label: content,
      data: { message },
      class: [role, 'text-left whitespace-pre-wrap', selectedMessageId.value && !active ? 'op-50' : ''],
    })

    const source = parentMessageId || 'root'
    edges.push({
      id: `${source}-${id}`,
      source,
      target: id,
      style: active ? { stroke: '#000', strokeWidth: '2' } : {},
    })
  }

  return { nodes: layout(nodes, edges), edges }
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
  toast.success('Message deleted successfully')

  // cancel selection
  selectedMessageId.value = null
}

function handleContextMenuDelete() {
  selectedMessageId.value && deleteSelectedNode(selectedMessageId.value)
}

async function generateResponse(parentId: string | null) {
  if (!settingsStore.baseURL || !settingsStore.model) {
    toast.error('Please configure API settings first')
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

// Get active room name for display
const activeRoomName = computed(() => {
  const room = roomsStore.getRoomById(roomsStore.activeRoomId)
  return room?.name || 'Default Chat'
})
</script>

<template>
  <div class="h-screen w-full flex overflow-hidden bg-light-100 dark:bg-dark-900">
    <Sidebar />

    <div class="h-full flex flex-1 flex-col overflow-hidden">
      <div class="h-42px flex items-center justify-center border-b border-b-black/10 bg-white dark:border-b-white/10 dark:bg-dark-800">
        <HeaderMenu />
      </div>

      <div class="flex flex-1 flex-col overflow-hidden bg-light-100 dark:bg-dark-900">
        <div class="flex items-center border-b border-b-black/10 bg-white p-14px dark:border-b-white/10 dark:bg-dark-800">
          <div class="mr-12px h-24px w-24px flex cursor-pointer items-center justify-center text-18px">
            <i class="i-lucide-chevron-left" />
          </div>
          <h1 class="m-0 text-16px font-600">
            {{ activeRoomName }}
          </h1>
        </div>

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
      </div>

      <div class="p-12px-16px border-t border-t-black/10 bg-light-100 dark:border-t-white/10 dark:bg-dark-900">
        <div class="flex rounded-8px bg-white shadow-sm dark:bg-dark-800 dark:shadow-md items-center">
          <BasicTextarea
            v-model="inputMessage"
            placeholder="Type your message here, press Enter to send"
            class="max-h-150px flex-1 resize-none overflow-y-auto rounded-8px border-none p-12px text-14px leading-normal outline-none dark:bg-dark-800 dark:text-white"
            @submit="sendMessage"
          />

          <Button
            class="flex mr-2 cursor-pointer items-center justify-center rounded-6px border-none bg-blue-500 text-white dark:bg-blue-700 hover:bg-blue-600 dark:hover:bg-blue-800"
            title="Send message"
            @click="sendMessage"
          >
            <div i-lucide-send class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vue-flow {
  flex: 1;
}

:deep(.vue-flow__node) {
  @apply rounded-8px;

  &.user {
    @apply bg-blue-50 border-blue-200;
  }

  &.assistant {
    @apply bg-purple-50 border-purple-200;
  }
}
</style>

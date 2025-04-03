<script setup lang="ts">
import type { Edge, Node, NodeMouseEvent } from '@vue-flow/core'
import type { BaseMessage } from '~/types/messages'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { VueFlow } from '@vue-flow/core'
import { MiniMap } from '@vue-flow/minimap'
import { useClipboard, useEventListener } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, markRaw, onMounted, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { streamText } from 'xsai'
import ConversationView from '~/components/ConversationView.vue'
import ModelSelector from '~/components/ModelSelector.vue'
import NodeContextMenu from '~/components/NodeContextMenu.vue'
import AssistantNode from '~/components/nodes/AssistantNode.vue'
import SystemNode from '~/components/nodes/SystemNode.vue'
import UserNode from '~/components/nodes/UserNode.vue'
import Button from '~/components/ui/button/Button.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import Input from '~/components/ui/input/Input.vue'
import Textarea from '~/components/ui/textarea/Textarea.vue'
import { isDark } from '~/composables/dark'
import { useLayout } from '~/composables/useLayout'
import { useMessagesStore } from '~/stores/messages'
import { ChatMode, useModeStore } from '~/stores/mode'
import { useRoomsStore } from '~/stores/rooms'
import { useSettingsStore } from '~/stores/settings'
import { parseMessage } from '~/utils/chat'

const route = useRoute('/chat/[id]')
const router = useRouter()
const roomId = computed(() => {
  if (typeof route.params.id === 'string') {
    return route.params.id
  }
  return Array.isArray(route.params.id) ? route.params.id[0] : ''
})

const settingsStore = useSettingsStore()
const messagesStore = useMessagesStore()
const roomsStore = useRoomsStore()
const { layout } = useLayout()
const { currentMode } = storeToRefs(useModeStore())
const defaultColor = 'rgb(240, 242, 243, 0.7)'
const darkColor = 'rgb(34,34,34,0.7)'
const strokeColor = computed(() => (isDark.value ? darkColor : defaultColor))
const selectedMessageId = ref<string | null>(null)
const selectedMessage = computed(() => {
  return messagesStore.messages.find(message => message.id === selectedMessageId.value)
})

const inputMessage = ref('')

// Model selection
const showModelSelector = ref(false)
const selectedModel = ref('')

// Watch for route changes to update current room
watchEffect(() => {
  if (roomId.value) {
    roomsStore.setCurrentRoom(roomId.value)
  }
})

// Watch for "model=" in the input
watch(inputMessage, (newValue) => {
  // Show only if input starts with 'model=' and does not contain white-spaces
  if (newValue.startsWith('model=') && !newValue.match(/\s/)) {
    showModelSelector.value = true
    // Fetch models if we haven't already
    if (settingsStore.models.length === 0) {
      settingsStore.fetchModels()
    }
  }
  else if (newValue === '') {
    // Reset but don't hide immediately to prevent flickering when selecting a model
    selectedModel.value = ''
  }
  else {
    // Hide selector for any other input
    showModelSelector.value = false
  }
}, { immediate: true })

// Handle model selection from the component
function handleModelSelect(model: string) {
  selectedModel.value = model
  inputMessage.value = `model=${model} `
}

const nodeTypes = {
  system: markRaw(SystemNode),
  user: markRaw(UserNode),
  assistant: markRaw(AssistantNode),
}

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
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Filter for current room's messages
  const roomMessages = messagesStore.messages.filter(
    msg => msg.roomId === roomId.value,
  )

  // Check if we have messages with 'root' as parent
  const hasRootParent = roomMessages.some(msg => !msg.parentMessageId)

  // Add a hidden root node if needed
  if (hasRootParent) {
    nodes.push({
      id: 'root',
      type: 'system',
      position: { x: 0, y: 0 },
      hidden: true,
      data: { hidden: true },
    })
  }

  for (const message of roomMessages) {
    const { id, parentMessageId, role } = message
    const active = ids.has(id)

    nodes.push({
      id,
      type: role,
      position: { x: 0, y: 0 },
      data: { message, selected: selectedMessageId.value === id, inactive: selectedMessageId.value && !active },
    })

    // Only create an edge if we have a valid source node
    const source = parentMessageId || 'root'
    // Check if source exists in our nodes (or will exist)
    const sourceExists = source === 'root'
      || roomMessages.some(m => m.id === source)
      || nodes.some(n => n.id === source)

    if (sourceExists) {
      edges.push({
        id: `${source}-${id}`,
        source,
        target: id,
        style: active ? { stroke: isDark?.value ? '#fff' : '#000', strokeWidth: '2' } : {},
      })
    }
  }

  return { nodes: layout(nodes, edges), edges }
})

async function* asyncIteratorFromReadableStream<T, F = Uint8Array>(
  res: ReadableStream<F>,
  func: (value: F) => Promise<T>,
): AsyncGenerator<T, void, unknown> {
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

async function generateResponse(parentId: string | null, model: string | null = null) {
  const usingModel = model ?? settingsStore.model
  if (!usingModel) {
    settingsStore.showSettingsDialog = true
    return
  }

  if (!settingsStore.baseURL) {
    settingsStore.showSettingsDialog = true
    return
  }

  const { textStream } = await streamText({
    apiKey: settingsStore.apiKey,
    baseURL: settingsStore.baseURL,
    model: usingModel,
    messages: currentBranch.value.messages.map(({ content, role }): BaseMessage => ({ content, role })),
  })

  const { id } = roomsStore.createMessage('', 'assistant', parentId, usingModel)
  // auto select the answer
  selectedMessageId.value = id

  for await (const textPart of asyncIteratorFromReadableStream(textStream, async v => v)) {
    // textPart might be `undefined` in some cases
    textPart && messagesStore.updateMessage(id, textPart)
  }
}

async function handleSendButton() {
  if (!inputMessage.value) {
    return
  }

  const { model, message } = parseMessage(inputMessage.value)

  const { id } = roomsStore.createMessage(message, 'user', selectedMessageId.value, model)
  inputMessage.value = model ? `model=${model} ` : ''
  selectedMessageId.value = id

  try {
    await generateResponse(id, model)
  }
  catch (error) {
    console.error(error)
    toast.error('Failed to generate response')
  }
}

function handleContextMenuFocusIn() {
  currentMode.value = ChatMode.CONVERSATION
}

const { copy } = useClipboard()
async function handleContextMenuCopy() {
  const content = selectedMessage.value?.content
  const model = selectedMessage.value?.model
  const role = selectedMessage.value?.role
  if (!content) {
    toast.warning('No content to copy')
    return
  }

  const text = model && role === 'user' ? `model=${model} ${content}` : content

  try {
    await copy(text)
    toast.success('Copied to clipboard')
  }
  catch (error) {
    console.error(error)
    toast.error('Failed to copy')
  }
}

const forkWithModel = ref('')
const showForkWithModelDialog = ref(false)
const showForkWithModelSelector = ref(false)

function handleContextMenuForkWith() {
  showForkWithModelDialog.value = true
  requestAnimationFrame(() => {
    showForkWithModelSelector.value = true
  })
  forkWithModel.value = ''
}

function handleForkWith() {
  showForkWithModelDialog.value = false
  showForkWithModelSelector.value = false
  generateResponse(selectedMessageId.value, forkWithModel.value)
}

// Handle forking - now this just selects the message without generating
function handleFork(messageId: string | null) {
  if (messageId) {
    selectedMessageId.value = messageId
  }
}

onMounted(() => {
  // Initialize rooms before displaying
  roomsStore.initialize()

  // Redirect to the first room if no roomId is provided
  if (!roomId.value) {
    router.replace(`/chat/${roomsStore.rooms[0]?.id}`)
  }
})
</script>

<template>
  <VueFlow
    v-if="currentMode === ChatMode.FLOW"
    :nodes="nodesAndEdges.nodes"
    :edges="nodesAndEdges.edges"
    :node-types="nodeTypes"
    @node-click="handleNodeClick"
    @pane-click="handlePaneClick"
    @node-context-menu="handleNodeContextMenu"
  >
    <Background />
    <Controls />
    <MiniMap :mask-color="strokeColor" />
    <NodeContextMenu
      v-if="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :role="selectedMessage?.role"
      @fork="handleFork(selectedMessageId)"
      @focus-in="handleContextMenuFocusIn"
      @delete="handleContextMenuDelete"
      @copy="handleContextMenuCopy"
      @fork-with="handleContextMenuForkWith"
    />
  </VueFlow>
  <ConversationView
    v-if="currentMode === ChatMode.CONVERSATION"
    :messages="currentBranch.messages"
    :selected-message-id="selectedMessageId"
    @update:selected-message-id="selectedMessageId = $event"
  />
  <div relative w-full max-w-screen-md flex rounded-lg bg-neutral-100 p-2 shadow-lg dark:bg-neutral-900>
    <Textarea
      v-model="inputMessage"
      placeholder="Enter to send message, Shift+Enter for new-line"
      max-h-60vh w-full resize-none border-gray-300 rounded-sm px-3 py-2 outline-none dark:bg-neutral-800 focus:ring-2 focus:ring-black dark:focus:ring-white
      transition="all duration-200 ease-in-out"
      @submit="handleSendButton"
    />
    <ModelSelector
      v-if="showModelSelector"
      v-model:show-model-selector="showModelSelector"
      :search-term="inputMessage.substring(6)"
      @select-model="handleModelSelect"
    />
    <Button absolute bottom-3 right-3 @click="handleSendButton">
      Send
    </Button>
    <Dialog v-model:open="showForkWithModelDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fork With</DialogTitle>
        </DialogHeader>
        <div relative>
          <Input
            id="model" v-model="forkWithModel" placeholder="Search models..."
            @click.stop="showForkWithModelSelector = true"
          />
          <ModelSelector
            v-if="showForkWithModelSelector"
            v-model:show-model-selector="showForkWithModelSelector"
            :search-term="forkWithModel"
            @select-model="forkWithModel = $event"
          />
        </div>
        <Button @click="handleForkWith">
          Fork
        </Button>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.vue-flow {
  flex: 1;
}

:deep(.vue-flow__minimap) {
  @apply dark:bg-black;
}
:deep(.vue-flow__minimap) svg {
  @apply dark:bg-black;
}
:deep(.vue-flow__controls-button) {
  @apply dark:bg-dark-50 dark:b-b-gray-800;
}
:deep(.vue-flow__controls-button) svg {
  @apply dark:fill-white;
}
</style>

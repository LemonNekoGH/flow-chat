<script setup lang="ts">
import type { Edge, Node, NodeMouseEvent } from '@vue-flow/core'
import type { BaseMessage } from '~/types/messages'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { VueFlow } from '@vue-flow/core'
import { MiniMap } from '@vue-flow/minimap'
import { useClipboard, useEventListener } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, markRaw, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { streamText } from 'xsai'
import ConversationView from '~/components/ConversationView.vue'
import ModelSelector from '~/components/ModelSelector.vue'
import NodeContextMenu from '~/components/NodeContextMenu.vue'
import AssistantNode from '~/components/nodes/AssistantNode.vue'
import SystemNode from '~/components/nodes/SystemNode.vue'
import UserNode from '~/components/nodes/UserNode.vue'
import Button from '~/components/ui/button/Button.vue'
import BasicTextarea from '~/components/ui/input/Textarea.vue'
import { isDark } from '~/composables/dark'
import { useLayout } from '~/composables/useLayout'
import { useMessagesStore } from '~/stores/messages'
import { ChatMode, useModeStore } from '~/stores/mode'
import { useSettingsStore } from '~/stores/settings'
import { parseMessage } from '~/utils/chat'

const settingsStore = useSettingsStore()
const messagesStore = useMessagesStore()
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

// Watch for "model=" in the input
watch(inputMessage, (newValue) => {
  // Only show if input start with model and not contains blank character
  if (newValue.startsWith('model=') && !newValue.match(/model=(\S+) /)) { // FIXME: test this
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

  for (const message of messagesStore.messages) {
    const { id, parentMessageId, role } = message
    const active = ids.has(id)

    nodes.push({
      id,
      type: role,
      position: { x: 0, y: 0 },
      data: { message, selected: selectedMessageId.value === id, inactive: selectedMessageId.value && !active },
    })

    const source = parentMessageId || 'root'
    edges.push({
      id: `${source}-${id}`,
      source,
      target: id,
      style: active ? { stroke: isDark?.value ? '#fff' : '#000', strokeWidth: '2' } : {},
    })
  }

  return { nodes: layout(nodes, edges), edges }
})

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

  const { id } = messagesStore.newMessage('', 'assistant', parentId, usingModel)
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

  const { model, message } = parseMessage(inputMessage.value) // TODO: repeat

  const { id } = messagesStore.newMessage(message, 'user', selectedMessageId.value, model)
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

onMounted(() => {
  if (messagesStore.messages.length === 0) {
    messagesStore.restoreTutorial()
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
      @fork="generateResponse(selectedMessageId)"
      @focus-in="handleContextMenuFocusIn"
      @delete="handleContextMenuDelete"
      @copy="handleContextMenuCopy"
    />
  </VueFlow>
  <ConversationView
    v-if="currentMode === ChatMode.CONVERSATION"
    :messages="currentBranch.messages"
  />
  <div class="relative flex bg-neutral-100 p-2 dark:bg-neutral-900" shadow="lg" w-full max-w-screen-md rounded-lg>
    <BasicTextarea
      v-model="inputMessage"
      placeholder="Enter to send message, Shift+Enter for new-line" outline="none" w-full
      resize-none border-gray-300 rounded-sm p-2 px-3 py-2 dark:bg-neutral-800 focus:ring-2
      focus:ring-black dark:focus:ring-white transition="all duration-200 ease-in-out" @submit="handleSendButton"
    />
    <ModelSelector
      v-if="showModelSelector"
      v-model:show-model-selector="showModelSelector"
      :search-term="inputMessage.substring(6)"
      @select-model="handleModelSelect"
    />
    <Button class="absolute bottom-3 right-3 dark:bg-black dark:text-white dark:shadow-none dark:hover:bg-dark/60 dark:hover:c-white" @click="handleSendButton">
      Send
    </Button>
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

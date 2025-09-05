<script setup lang="ts">
import type { CapabilitiesByModel, ModelIdsByProvider, ProviderNames } from '@moeru-ai/jem'
import type { Edge, Node, NodeMouseEvent } from '@vue-flow/core'
import type { AcceptableValue } from 'reka-ui'
import type { BaseMessage } from '~/types/messages'
import type { NodeData } from '~/types/node'
import { hasCapabilities } from '@moeru-ai/jem'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useVueFlow, VueFlow } from '@vue-flow/core'
import { MiniMap } from '@vue-flow/minimap'
import { useClipboard, useEventListener } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
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
import Select from '~/components/ui/select/Select.vue'
import SelectContent from '~/components/ui/select/SelectContent.vue'
import SelectItem from '~/components/ui/select/SelectItem.vue'
import SelectTrigger from '~/components/ui/select/SelectTrigger.vue'
import SelectValue from '~/components/ui/select/SelectValue.vue'
import Textarea from '~/components/ui/textarea/Textarea.vue'
import { isDark } from '~/composables/dark'
import { useLayout } from '~/composables/useLayout'
import { useDatabaseStore } from '~/stores/database'
import { useMessagesStore } from '~/stores/messages'
import { ChatMode, useModeStore } from '~/stores/mode'
import { useRoomsStore } from '~/stores/rooms'
import { useSettingsStore } from '~/stores/settings'
import { createImageTools } from '~/tools'
import { parseMessage } from '~/utils/chat'
import { asyncIteratorFromReadableStream } from '~/utils/interator'

const route = useRoute('/chat/[id]')
const dbStore = useDatabaseStore()

const roomId = computed(() => {
  if (typeof route.params.id === 'string') {
    return route.params.id
  }
  const id = Array.isArray(route.params.id) ? route.params.id[0] : null
  return id || null
})
const { setCenter, findNode, viewport } = useVueFlow()

const settingsStore = useSettingsStore()
const { defaultTextModel, currentProvider } = storeToRefs(settingsStore)

const messagesStore = useMessagesStore()
const roomsStore = useRoomsStore()
const { currentRoomId } = storeToRefs(roomsStore)
const { layout } = useLayout()
const { currentMode } = storeToRefs(useModeStore())
const { messages } = storeToRefs(messagesStore)
const defaultColor = 'rgb(240, 242, 243, 0.7)'
const darkColor = 'rgb(34,34,34,0.7)'
const strokeColor = computed(() => (isDark.value ? darkColor : defaultColor))
const selectedMessageId = ref<string | null>(null)
const selectedMessage = computed(() => {
  return messagesStore.messages.find(message => message.id === selectedMessageId.value)
})
const generatingMessageId = ref<string | undefined>()

const inputMessage = ref('')

// Model selection
const showModelSelector = ref(false)
const inlineModelCommandValue = ref('')
const inlineModelCommandProvider = ref<ProviderNames | null>(null)

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
    const inlineModelCommand = newValue.split('/')
    inlineModelCommandValue.value = inlineModelCommand[1]
    inlineModelCommandProvider.value = inlineModelCommand[0] as ProviderNames
  }
  else {
    // Hide selector for any other input
    showModelSelector.value = false
  }
}, { immediate: true })

// Handle model selection from the component
function handleModelSelect(model: string) {
  inlineModelCommandValue.value = model
  inputMessage.value = `model=${model} `
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

function handlePanelClick() {
  selectedMessageId.value = null
}

const easeOut = (t: number) => 1 - (1 - t) ** 3

function setCenterToNode(node: Node<NodeData> | string) {
  let nodeToCenter: Node<NodeData> | undefined
  if (typeof node === 'string') {
    nodeToCenter = findNode(node)
  }
  else {
    nodeToCenter = node
  }

  if (!nodeToCenter) {
    console.warn('Node not found', node)
    return
  }

  setCenter(nodeToCenter.position.x + 100, nodeToCenter.position.y + innerHeight / 4, {
    zoom: viewport.value.zoom,
    interpolate: 'linear',
    duration: 500,
    ease: easeOut,
  })
}

function handleNodeDoubleClick(event: NodeMouseEvent) {
  const node = findNode(event.node.id)
  if (!node) {
    return
  }

  setCenterToNode(node)
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
  const nodes: Node<NodeData>[] = []
  const edges: Edge[] = []

  // Check if we have messages with 'root' as parent
  const hasRootParent = messages.value.some(msg => !msg.parent_id)

  // Add a hidden root node if needed
  if (hasRootParent) {
    nodes.push({
      id: 'root',
      type: 'system',
      position: { x: 0, y: 0 },
      hidden: true,
      data: { hidden: true, message: messages.value[0], selected: false, inactive: false, generating: false },
    })
  }

  for (const message of messages.value) {
    const { id, parent_id, role } = message
    const active = ids.has(id)

    nodes.push({
      id,
      type: role,
      position: { x: 0, y: 0 },
      data: { message, selected: selectedMessageId.value === id, inactive: !!selectedMessageId.value && !active, hidden: false, generating: false },
    })

    // Only create an edge if we have a valid source node
    const source = parent_id || 'root'
    // Check if source exists in our nodes (or will exist)
    const sourceExists = source === 'root'
      || messages.value.some(m => m.id === source)
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
  // get parent node
  const parentId = messagesStore.getMessageById(nodeId)?.parent_id
  // delete the node and all its descendants from store
  messagesStore.deleteSubtree(nodeId)

  // Auto select the parent node or cancel selection
  if (parentId) {
    selectedMessageId.value = parentId
    setCenterToNode(parentId)
    return
  }

  selectedMessageId.value = null
}

function handleContextMenuDelete() {
  selectedMessageId.value && deleteSelectedNode(selectedMessageId.value)
}

const streamTextAbortControllers = ref<Map<string, AbortController>>(new Map())

async function generateResponse(parentId: string | null, provider: ProviderNames, model: string) {
  if (!model) {
    toast.error('Please select a model')
    return
  }

  if (!currentProvider.value?.baseURL) {
    toast.error('Please select a provider')
    return
  }

  const { id: newMsgId } = await messagesStore.newMessage('', 'assistant', parentId, provider, model, currentRoomId.value!)
  await messagesStore.retrieveMessages()

  generatingMessageId.value = newMsgId
  const abortController = new AbortController()
  streamTextAbortControllers.value.set(newMsgId, abortController)

  const tools = {
    tool: await createImageTools({ // TODO: more tools
      apiKey: settingsStore.imageGeneration.apiKey,
      baseURL: 'https://api.openai.com/v1',
      piniaStore: messagesStore,
    }),
  }

  let isSupportTools = false
  try {
    const capabilities: Record<string, boolean> = hasCapabilities(
      provider as ProviderNames,
      model as ModelIdsByProvider<ProviderNames>,
      ['tool-call'] as CapabilitiesByModel<ProviderNames, ModelIdsByProvider<ProviderNames>>,
    )
    isSupportTools = capabilities['tool-call']
  }
  catch (error) {
    console.error('Failed to check if model supports tools', error)
  }

  const { textStream } = await streamText({
    ...(isSupportTools ? tools : {}),
    maxSteps: 10,
    apiKey: currentProvider.value?.apiKey,
    baseURL: currentProvider.value?.baseURL,
    model,
    messages: currentBranch.value.messages.map(({ content, role }): BaseMessage => ({ content, role })),
    abortSignal: abortController.signal,
  })

  // auto select the answer
  selectedMessageId.value = newMsgId
  setCenterToNode(newMsgId)

  for await (const textPart of asyncIteratorFromReadableStream(textStream, async v => v)) {
    // check if image tool was used
    if (messagesStore.image) {
      await messagesStore.appendContent(newMsgId, `![generated image](${messagesStore.image})`)
      await messagesStore.retrieveMessages()
      messagesStore.image = ''
    }
    // textPart might be `undefined` in some cases
    textPart && await messagesStore.appendContent(newMsgId, textPart)
  }
}

async function handleSendButton() {
  if (!inputMessage.value) {
    return
  }

  const { model, message } = parseMessage(inputMessage.value)

  const { id } = await messagesStore.newMessage(message, 'user', selectedMessageId.value, defaultTextModel.value.provider, model ?? defaultTextModel.value.model, currentRoomId.value!)
  await messagesStore.retrieveMessages()

  inputMessage.value = model ? `model=${model} ` : ''
  selectedMessageId.value = id

  try {
    await generateResponse(id, defaultTextModel.value.provider as ProviderNames, model ?? defaultTextModel.value.model)
  }
  catch (error) {
    const err = error as Error
    if (err.message.includes('BodyStreamBuffer was aborted')) {
      return
    }
    if (err.message.includes('does not support tools')) {
      toast.error('This model does not support tools')
      return
    }
    console.error(error)
    toast.error('Failed to generate response') // TODO: show error in message
  }
  finally {
    if (generatingMessageId.value) {
      await messagesStore.appendContent(generatingMessageId.value, '')
      await messagesStore.retrieveMessages()
    }
    generatingMessageId.value = undefined
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
const forkWithProvider = ref<ProviderNames>('' as ProviderNames)
const showForkWithModelDialog = ref(false)
const showForkWithModelSelector = ref(false)

function handleContextMenuForkWith() {
  showForkWithModelDialog.value = true
  requestAnimationFrame(() => {
    showForkWithModelSelector.value = true
  })
  forkWithModel.value = ''
}

function handleForkWithProviderChange(provider: AcceptableValue) {
  if (typeof provider !== 'string') {
    console.error('Provider is not a string', provider)
    return
  }

  forkWithProvider.value = provider as ProviderNames
  forkWithModel.value = ''
  settingsStore.fetchModels()
}

function handleForkWith() {
  showForkWithModelDialog.value = false
  showForkWithModelSelector.value = false
  generateResponse(selectedMessageId.value, forkWithProvider.value as ProviderNames, forkWithModel.value)
}

// Handle forking - now this just selects the message without generating
// FIXME: feature broken
// function handleFork(messageId: string | null, model?: string) {
function handleFork(messageId: string | null) {
  if (messageId) {
    selectedMessageId.value = messageId
  }
}

async function handleAbort(messageId: string) {
  const abortController = streamTextAbortControllers.value.get(messageId)
  abortController?.abort('Aborted by user')
  streamTextAbortControllers.value.delete(messageId)
  await messagesStore.appendContent(messageId, '')
  await messagesStore.retrieveMessages()
  toast.success('Generation aborted')
}

function handleInit() {
  const firstNode = nodesAndEdges.value.nodes[0]
  if (!firstNode) {
    return
  }
  setCenterToNode(firstNode)
}

onMounted(async () => {
  await dbStore.waitForDbInitialized()
  // Initialize rooms before displaying
  await roomsStore.initialize()
  await messagesStore.retrieveMessages()
})
</script>

<template>
  <VueFlow
    v-if="currentMode === ChatMode.FLOW"
    :nodes="nodesAndEdges.nodes"
    :edges="nodesAndEdges.edges"
    @node-click="handleNodeClick"
    @pane-click="handlePanelClick"
    @node-double-click="handleNodeDoubleClick"
    @node-context-menu="handleNodeContextMenu"
    @init="handleInit"
  >
    <Background />
    <Controls />
    <MiniMap :mask-color="strokeColor" zoomable pannable />
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
    <template #node-assistant="props">
      <AssistantNode v-bind="props" class="nodrag" @abort="handleAbort(props.id)" />
    </template>
    <template #node-system="props">
      <SystemNode v-bind="props" class="nodrag" />
    </template>
    <template #node-user="props">
      <UserNode v-bind="props" class="nodrag" />
    </template>
  </VueFlow>
  <ConversationView
    v-if="currentMode === ChatMode.CONVERSATION"
    :messages="currentBranch.messages"
    @fork-message="handleFork"
    @abort-message="handleAbort"
    @send-message="handleSendButton"
  />
  <div relative w-full max-w-screen-md flex rounded-lg bg-neutral-100 p-2 shadow-lg dark:bg-neutral-900>
    <Textarea
      v-model="inputMessage"
      placeholder="Enter to send message, Shift+Enter for new-line"
      max-h-60vh w-full resize-none border-gray-300 rounded-sm px-3 py-2 outline-none dark:bg-neutral-800 focus:ring-2 focus:ring-black dark:focus:ring-white
      transition="all duration-200 ease-in-out"
      @keydown.enter.exact.prevent="handleSendButton"
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
        <div>
          <Select
            :model-value="defaultTextModel.provider as ProviderNames"
            @update:model-value="handleForkWithProviderChange"
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="provider in settingsStore.configuredTextProviders" :key="provider.name" :value="provider.name">
                {{ provider.name }}
              </SelectItem>
            </SelectContent>
          </Select>
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

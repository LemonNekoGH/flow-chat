<script setup lang="ts">
import type { CapabilitiesByModel, ModelIdsByProvider, ProviderNames } from '@moeru-ai/jem'
import type { NodeMouseEvent } from '@vue-flow/core'
import type { AcceptableValue } from 'reka-ui'
import type { BaseMessage } from '~/types/messages'
import { hasCapabilities } from '@moeru-ai/jem'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { VueFlow } from '@vue-flow/core'
import { MiniMap } from '@vue-flow/minimap'
import { useClipboard, useEventListener } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
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
import { useDatabaseStore } from '~/stores/database'
import { useMessagesStore } from '~/stores/messages'
import { ChatMode, useModeStore } from '~/stores/mode'
import { useRoomsStore } from '~/stores/rooms'
import { useRoomViewStateStore } from '~/stores/roomViewState'
import { useSettingsStore } from '~/stores/settings'
import { createImageTools } from '~/tools'
import { parseMessage } from '~/utils/chat'
import { asyncIteratorFromReadableStream } from '~/utils/interator'
import { SUMMARY_PROMPT } from '~/utils/prompts'

const dbStore = useDatabaseStore()

const settingsStore = useSettingsStore()
const { defaultTextModel, currentProvider } = storeToRefs(settingsStore)

const messagesStore = useMessagesStore()
const roomsStore = useRoomsStore()

const { currentMode } = storeToRefs(useModeStore())

const roomViewStateStore = useRoomViewStateStore()
const {
  selectedMessageId,
  currentRoomId,
  currentBranch,
  nodesAndEdges,
} = storeToRefs(roomViewStateStore)

const defaultColor = 'rgb(240, 242, 243, 0.7)'
const darkColor = 'rgb(34,34,34,0.7)'
const strokeColor = computed(() => (isDark.value ? darkColor : defaultColor))
const selectedMessage = computed(() => {
  return messagesStore.messages.find(message => message.id === selectedMessageId.value)
})

const inputMessage = ref('')
const isSending = ref(false)
const isConversationMode = computed(() => currentMode.value === ChatMode.CONVERSATION)

// Model selection
const showModelSelector = ref(false)
const inlineModelCommandValue = ref('')
const inlineModelCommandProvider = ref<ProviderNames | null>(null)

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

function handleNodeDoubleClick(event: NodeMouseEvent) {
  const node = roomViewStateStore.findNode(event.node.id)
  if (!node) {
    return
  }

  roomViewStateStore.setCenterToNode(node)
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

useEventListener('click', () => {
  contextMenu.value.show = false
})

useEventListener('keydown', (event) => {
  if ((event.key === 'Backspace' || event.key === 'Delete') && selectedMessageId.value) {
    const activeElement = document.activeElement
    const isInputActive
      = activeElement
        && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable)

    if (!isInputActive)
      void deleteSelectedNode(selectedMessageId.value)
  }
})

// delete the current selected node
async function deleteSelectedNode(nodeId: string) {
  // get parent node
  const parentId = messagesStore.getMessageById(nodeId)?.parent_id
  // delete the node and all its descendants from store
  await messagesStore.deleteSubtree(nodeId)
  await messagesStore.retrieveMessages()

  // Auto select the parent node or cancel selection
  if (parentId) {
    selectedMessageId.value = parentId
    roomViewStateStore.setCenterToNode(parentId)
    return
  }

  selectedMessageId.value = null
}

async function handleContextMenuDelete() {
  if (selectedMessageId.value)
    await deleteSelectedNode(selectedMessageId.value)
}

const streamTextAbortControllers = ref<Map<string, AbortController>>(new Map())
const streamTextRunIds = ref<Map<string, number>>(new Map())

function nextStreamRunId(messageId: string) {
  const current = streamTextRunIds.value.get(messageId) ?? 0
  const next = current + 1
  streamTextRunIds.value.set(messageId, next)
  return next
}

function hasGeneratingAncestor(messageId: string) {
  let currentId = messagesStore.getMessageById(messageId)?.parent_id
  while (currentId) {
    if (messagesStore.isGenerating(currentId))
      return true

    currentId = messagesStore.getMessageById(currentId)?.parent_id
  }
  return false
}

async function generateResponse(parentId: string | null, provider: ProviderNames, model: string, regenerateId?: string) {
  if (!model) {
    toast.error('Please select a model')
    return
  }

  if (!currentProvider.value?.baseURL) {
    toast.error('Please select a provider')
    return
  }

  let newMsgId = regenerateId
  if (!newMsgId) {
    const { id } = await messagesStore.newMessage('', 'assistant', parentId, provider, model, currentRoomId.value!)
    newMsgId = id
  }
  else {
    await messagesStore.setContent(newMsgId, '')
  }

  await messagesStore.retrieveMessages()

  messagesStore.startGenerating(newMsgId)
  const prevAbortController = streamTextAbortControllers.value.get(newMsgId)
  prevAbortController?.abort('Superseded by new generation')
  const runId = nextStreamRunId(newMsgId)
  const abortController = new AbortController()
  streamTextAbortControllers.value.set(newMsgId, abortController)

  try {
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
    roomViewStateStore.focusFlowNode(newMsgId, { center: true })
    if (currentRoomId.value) {
      try {
        await dbStore.waitForDbInitialized()
        await roomsStore.updateRoomState(currentRoomId.value, { focusNodeId: newMsgId })
      }
      catch (error) {
        console.error('Failed to persist focus node', error)
      }
    }

    for await (const textPart of asyncIteratorFromReadableStream(textStream, async v => v)) {
      if (streamTextRunIds.value.get(newMsgId) !== runId || abortController.signal.aborted)
        break
      // check if image tool was used
      if (messagesStore.image) {
        await messagesStore.appendContent(newMsgId, `![generated image](${messagesStore.image})`)
        await messagesStore.retrieveMessages()
        messagesStore.image = ''
      }
      // textPart might be `undefined` in some cases
      if (textPart) {
        await messagesStore.appendContent(newMsgId, textPart)
      }
    }
  }
  finally {
    if (streamTextRunIds.value.get(newMsgId) === runId) {
      messagesStore.stopGenerating(newMsgId)
      streamTextAbortControllers.value.delete(newMsgId)
      streamTextRunIds.value.delete(newMsgId)

      await messagesStore.appendContent(newMsgId, '')
      await messagesStore.retrieveMessages()
    }
  }
}

async function handleSendButton() {
  if (!inputMessage.value || isSending.value) {
    return
  }

  const parentId = selectedMessageId.value
  if (parentId && streamTextAbortControllers.value.has(parentId))
    return

  isSending.value = true

  const { model, message } = parseMessage(inputMessage.value)

  try {
    const { id } = await messagesStore.newMessage(message, 'user', selectedMessageId.value, defaultTextModel.value.provider, model ?? defaultTextModel.value.model, currentRoomId.value!)
    await messagesStore.retrieveMessages()

    inputMessage.value = model ? `model=${model} ` : ''
    selectedMessageId.value = id
    isSending.value = false

    await generateResponse(id, defaultTextModel.value.provider as ProviderNames, model ?? defaultTextModel.value.model)
  }
  catch (error) {
    isSending.value = false
    const err = error as Error
    if (err.name === 'AbortError') {
      return
    }
    if (err.message.includes('does not support tools')) {
      toast.error('This model does not support tools')
      return
    }
    console.error(error)
    toast.error('Failed to generate response') // TODO: show error in message
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

async function handleForkWith() {
  showForkWithModelDialog.value = false
  showForkWithModelSelector.value = false
  try {
    await generateResponse(selectedMessageId.value, forkWithProvider.value as ProviderNames, forkWithModel.value)
  }
  catch (error) {
    const err = error as Error
    if (err.name === 'AbortError') {
      return
    }
    console.error(error)
    toast.error('Failed to fork response')
  }
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
  streamTextRunIds.value.delete(messageId)
  messagesStore.stopGenerating(messageId)
  await messagesStore.appendContent(messageId, '')
  await messagesStore.retrieveMessages()
  toast.success('Generation aborted')
}

async function handleRegenerate(messageId: string) {
  const message = messagesStore.getMessageById(messageId)
  if (!message)
    return

  if (hasGeneratingAncestor(messageId)) {
    toast.warning('Please wait for the previous generation to finish')
    return
  }

  if (message.show_summary ?? false) {
    await handleSummarize(messageId)
    return
  }

  try {
    await generateResponse(message.parent_id, message.provider as ProviderNames, message.model, messageId)
  }
  catch (error) {
    const err = error as Error
    if (err.name === 'AbortError') {
      return
    }
    console.error(error)
    toast.error('Failed to regenerate response')
  }
}

async function handleSummarize(messageId: string) {
  const message = messagesStore.getMessageById(messageId)
  if (!message)
    return

  if (hasGeneratingAncestor(messageId)) {
    toast.warning('Please wait for the previous generation to finish')
    return
  }

  // Clear previous summary if any
  await messagesStore.updateSummary(messageId, '')
  await messagesStore.retrieveMessages()

  const summaryProviderName = settingsStore.summaryTextModel.provider || defaultTextModel.value.provider
  const summaryProvider = settingsStore.configuredTextProviders.find(p => p.name === summaryProviderName)

  const defaultModel = defaultTextModel.value.model
  const summaryModelName = settingsStore.summaryTextModel.model
  const model = summaryModelName || defaultModel

  if (!model) {
    toast.error('Please select a model')
    return
  }

  if (!summaryProvider?.baseURL) {
    toast.error('Please select a provider for summarization')
    return
  }

  // Set generating status
  messagesStore.startGenerating(messageId)

  const prevAbortController = streamTextAbortControllers.value.get(messageId)
  prevAbortController?.abort('Superseded by new summarization')
  const runId = nextStreamRunId(messageId)
  const abortController = new AbortController()
  streamTextAbortControllers.value.set(messageId, abortController)

  try {
    const { textStream } = await streamText({
      apiKey: summaryProvider.apiKey,
      baseURL: summaryProvider.baseURL,
      model,
      messages: [
        { role: 'user', content: `${SUMMARY_PROMPT}\n\n${message.content}` },
      ],
      abortSignal: abortController.signal,
    })

    for await (const textPart of asyncIteratorFromReadableStream(textStream, async v => v)) {
      if (streamTextRunIds.value.get(messageId) !== runId || abortController.signal.aborted)
        break
      if (textPart) {
        await messagesStore.appendSummary(messageId, textPart)
      }
    }
  }
  catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return // Silently ignore abort errors
    }
    console.error('Summarization failed', error)
    toast.error('Summarization failed')
  }
  finally {
    if (streamTextRunIds.value.get(messageId) === runId) {
      streamTextAbortControllers.value.delete(messageId)
      streamTextRunIds.value.delete(messageId)
      messagesStore.stopGenerating(messageId)
      await messagesStore.retrieveMessages()
    }
  }
}

function handleFlowInit() {
  roomViewStateStore.handleInit()
}

onMounted(async () => {
  await dbStore.waitForDbInitialized()
  // Initialize rooms before displaying
  await roomsStore.initialize()
  await messagesStore.retrieveMessages()
})
</script>

<template>
  <div class="h-full w-full flex flex-col overflow-hidden">
    <VueFlow
      v-show="currentMode === ChatMode.FLOW"
      class="flex-1"
      :nodes="nodesAndEdges.nodes"
      :edges="nodesAndEdges.edges"
      @node-click="handleNodeClick"
      @pane-click="handlePanelClick"
      @node-double-click="handleNodeDoubleClick"
      @node-context-menu="handleNodeContextMenu"
      @init="handleFlowInit"
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
        <AssistantNode v-bind="props" class="nodrag" @abort="handleAbort(props.id)" @regenerate="handleRegenerate(props.id)" @summarize="handleSummarize(props.id)" />
      </template>
      <template #node-system="props">
        <SystemNode v-bind="props" class="nodrag" />
      </template>
      <template #node-user="props">
        <UserNode v-bind="props" class="nodrag" />
      </template>
    </VueFlow>
    <div
      v-show="currentMode === ChatMode.CONVERSATION"
      class="w-full flex flex-1 justify-center overflow-hidden px-4 sm:px-6"
    >
      <ConversationView
        class="w-full max-w-screen-md flex-1"
        :messages="currentBranch.messages"
        @fork-message="handleFork"
        @abort-message="handleAbort"
      />
    </div>
    <div
      class="mt-auto w-full px-4 pb-6 pt-2 transition-colors duration-200 sm:px-6"
      :class="{
        'sticky bottom-0 left-0 right-0 z-20 bg-neutral-100/95 backdrop-blur-md dark:bg-neutral-900/95': isConversationMode,
        'bg-neutral-100 dark:bg-neutral-900': !isConversationMode,
      }"
    >
      <div class="relative mx-auto w-full max-w-screen-md flex rounded-lg bg-neutral-100 p-2 shadow-lg transition-colors dark:bg-neutral-900">
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
    </div>
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

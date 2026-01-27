<script setup lang="ts">
import type { ProviderNames } from '@moeru-ai/jem'
import type { NodeMouseEvent } from '@vue-flow/core'
import type { AcceptableValue } from 'reka-ui'
import type { Attachment } from '~/types/attachment'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { VueFlow } from '@vue-flow/core'
import { MiniMap } from '@vue-flow/minimap'
import { useClipboard, useElementBounding, useEventListener } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, provide, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import AttachmentDisplay from '~/components/AttachmentDisplay.vue'
import ConversationView from '~/components/ConversationView.vue'
import FileUpload from '~/components/FileUpload.vue'
import ModelSelector from '~/components/ModelSelector.vue'
import AssistantNode from '~/components/nodes/AssistantNode.vue'
import SystemNode from '~/components/nodes/SystemNode.vue'
import UserNode from '~/components/nodes/UserNode.vue'
import NodeToolbar from '~/components/NodeToolbar.vue'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { isDark } from '~/composables/dark'
import { useConversationStore } from '~/stores/conversation'
import { useDatabaseStore } from '~/stores/database'
import { useDialogStore } from '~/stores/dialog'
import { useMessagesStore } from '~/stores/messages'
import { ChatMode, useModeStore } from '~/stores/mode'
import { useRoomsStore } from '~/stores/rooms'
import { useRoomViewStateStore } from '~/stores/roomViewState'
import { useSettingsStore } from '~/stores/settings'

const dbStore = useDatabaseStore()

const settingsStore = useSettingsStore()
const { defaultTextModel } = storeToRefs(settingsStore)

const messagesStore = useMessagesStore()
const { hasAnyMessages } = storeToRefs(messagesStore)
const roomsStore = useRoomsStore()

const conversationStore = useConversationStore()

const { currentMode } = storeToRefs(useModeStore())

const roomViewStateStore = useRoomViewStateStore()
const {
  selectedMessageId,
  selectedMessage,
  currentRoomId,
  currentBranch,
  nodesAndEdges,
} = storeToRefs(roomViewStateStore)

const defaultColor = 'rgb(240, 242, 243, 0.7)'
const darkColor = 'rgb(34,34,34,0.7)'
const strokeColor = computed(() => (isDark.value ? darkColor : defaultColor))

const inputMessage = ref('')
const isConversationMode = computed(() => currentMode.value === ChatMode.CONVERSATION)

// File upload state
const pendingAttachments = ref<Attachment[]>([]) // TODO: show attachments for every message
const showFileUpload = ref(false)

function handleFilesChanged(files: Attachment[]) {
  pendingAttachments.value = files
}

function toggleFileUpload() {
  showFileUpload.value = !showFileUpload.value
}

const showModelSelector = ref(false)
const inlineModelCommandValue = ref('')
const inlineModelCommandProvider = ref<ProviderNames | null>(null)

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

function handleModelSelect(model: string) {
  inlineModelCommandValue.value = model
  inputMessage.value = `model=${model} `
}

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
  const mouseEvent = event.event as MouseEvent
  mouseEvent.preventDefault()
}

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

async function deleteSelectedNode(nodeId: string) {
  const parentId = messagesStore.getMessageById(nodeId)?.parent_id
  await messagesStore.deleteSubtree(nodeId)
  await messagesStore.retrieveMessages()

  if (parentId) {
    selectedMessageId.value = parentId
    roomViewStateStore.setCenterToNode(parentId)
    return
  }

  selectedMessageId.value = null
}

const dialogStore = useDialogStore()

async function handleContextMenuDelete() {
  if (!selectedMessageId.value) {
    return
  }

  dialogStore.alert({
    title: 'Delete Node',
    description: 'Are you sure you want to delete this node?',
    onConfirm: () => {
      if (selectedMessageId.value) {
        deleteSelectedNode(selectedMessageId.value)
      }
    },
  })
}

async function handleSendButton(messageText?: string) {
  const messageToSend = messageText ?? inputMessage.value
  const attachments = pendingAttachments.value

  const roomId = currentRoomId.value
  if (!roomId)
    return

  // Allow sending with just attachments (no text) or with text
  if ((!messageToSend && attachments.length === 0) || conversationStore.isSending(roomId)) {
    return
  }

  if (conversationStore.isSending(roomId))
    return

  const parentId = selectedMessageId.value
  if (parentId && conversationStore.isGeneratingMessage(parentId))
    return

  const modelMatch = messageToSend.match(/^model=(\S+)\s+/)
  const modelPrefix = modelMatch ? modelMatch[1] : null

  await conversationStore.sendMessage(
    roomId,
    messageToSend,
    pendingAttachments.value,
    parentId,
    {
      onUserMessageCreated: (messageId) => {
        inputMessage.value = modelPrefix ? `model=${modelPrefix} ` : ''
        pendingAttachments.value = []
        selectedMessageId.value = messageId
      },
      onAssistantMessageCreated: async (messageId) => {
        selectedMessageId.value = messageId
        roomViewStateStore.focusFlowNode(messageId, { center: true })
        if (currentRoomId.value) {
          try {
            await dbStore.waitForDbInitialized()
            await roomsStore.updateRoomState(currentRoomId.value, { focusNodeId: messageId })
          }
          catch (error) {
            console.error('Failed to persist focus node', error)
          }
        }
      },
    },
  )
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

  const text = model && role === 'user' ? `model=${model} ${content}` : content.filter(part => part.type === 'text').map(part => part.text).join('')
  if (!text) {
    toast.warning('No text to copy')
    return
  }

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

  const roomId = currentRoomId.value
  if (!roomId)
    return

  await conversationStore.forkWith(
    roomId,
    selectedMessageId.value,
    forkWithProvider.value as ProviderNames,
    forkWithModel.value,
    {
      onMessageCreated: async (messageId) => {
        selectedMessageId.value = messageId
        roomViewStateStore.focusFlowNode(messageId, { center: true })
        if (currentRoomId.value) {
          try {
            await dbStore.waitForDbInitialized()
            await roomsStore.updateRoomState(currentRoomId.value, { focusNodeId: messageId })
          }
          catch (error) {
            console.error('Failed to persist focus node', error)
          }
        }
      },
    },
  )
}

function handleFork(messageId: string | null) {
  if (messageId) {
    selectedMessageId.value = messageId
  }
}

function handleAbort(messageId: string) {
  conversationStore.abort(messageId)
}

function handleToolbarRegenerate() {
  if (!selectedMessageId.value) {
    return
  }
  void handleRegenerate(selectedMessageId.value)
}

function handleToolbarSummarize() {
  if (!selectedMessageId.value) {
    return
  }
  void handleSummarize(selectedMessageId.value)
}

async function handleRegenerate(messageId: string) {
  await conversationStore.regenerate(messageId)
}

async function handleSummarize(messageId: string) {
  await conversationStore.summarize(messageId)
}

function handleFlowInit() {
  roomViewStateStore.handleInit()
  nextTick(() => {
    requestAnimationFrame(() => {
      roomViewStateStore.triggerLayoutRecalculation()
    })
  })
}

const containerRef = ref<HTMLElement>()
const containerBounding = useElementBounding(containerRef)
provide('containerBounding', containerBounding)

onMounted(async () => {
  await dbStore.waitForDbInitialized()
  await roomsStore.initialize()
  await messagesStore.retrieveMessages()
})
</script>

<template>
  <div ref="containerRef" class="relative h-full w-full flex flex-col overflow-hidden">
    <VueFlow
      v-show="currentMode === ChatMode.FLOW"
      class="flex-1"
      :nodes="nodesAndEdges.nodes"
      :edges="nodesAndEdges.edges"
      :pan-on-drag="hasAnyMessages"
      @node-click="handleNodeClick"
      @pane-click="handlePanelClick"
      @node-double-click="handleNodeDoubleClick"
      @node-context-menu="handleNodeContextMenu"
      @init="handleFlowInit"
    >
      <Background />
      <Controls />
      <MiniMap :mask-color="strokeColor" zoomable pannable />
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
    <NodeToolbar
      :node-id="currentMode === ChatMode.FLOW ? selectedMessageId : null"
      @fork="handleFork(selectedMessageId)"
      @fork-with="handleContextMenuForkWith"
      @focus-in="handleContextMenuFocusIn"
      @delete="handleContextMenuDelete"
      @copy="handleContextMenuCopy"
      @regenerate="handleToolbarRegenerate"
      @summarize="handleToolbarSummarize"
      @send="handleSendButton"
    />
    <div
      v-show="currentMode === ChatMode.CONVERSATION"
      class="w-full flex flex-1 flex-col justify-center overflow-hidden px-4 sm:px-6"
    >
      <ConversationView
        v-if="currentBranch.messages.length > 0"
        class="mx-auto w-full max-w-screen-md flex-1"
        :messages="currentBranch.messages"
        @fork-message="handleFork"
        @abort-message="handleAbort"
        @regenerate-message="handleRegenerate"
      />
      <div
        class="mt-auto w-full px-4 pb-6 pt-2 transition-colors duration-200 sm:px-6"
        :class="{
          'sticky bottom-0 left-0 right-0 z-20 bg-neutral-100/95 backdrop-blur-md dark:bg-neutral-900/95': isConversationMode,
          'bg-neutral-100 dark:bg-neutral-900': !isConversationMode,
        }"
      >
        <div class="relative mx-auto w-full max-w-screen-md flex flex-col rounded-lg bg-neutral-100 p-2 shadow-lg transition-colors dark:bg-neutral-900">
          <!-- File upload area -->
          <div v-if="showFileUpload" class="mb-2">
            <FileUpload
              :max-files="5"
              :max-file-size="10"
              @files-changed="handleFilesChanged"
            />
          </div>

          <!-- Pending attachments preview -->
          <AttachmentDisplay
            v-if="pendingAttachments.length > 0 && !showFileUpload"
            :attachments="pendingAttachments"
            compact
            class="mb-2"
          />

          <div class="relative flex items-end gap-2">
            <!-- File upload toggle button -->
            <Button
              variant="ghost"
              size="sm"
              class="mb-1 shrink-0"
              :class="{ 'text-primary': showFileUpload || pendingAttachments.length > 0 }"
              @click="toggleFileUpload"
            >
              <div class="i-solar-gallery-add-bold text-lg" />
            </Button>

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
            <Button class="mb-1 shrink-0" @click="handleSendButton()">
              Send
            </Button>
          </div>
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

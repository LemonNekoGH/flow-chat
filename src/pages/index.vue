<script setup lang="ts">
import type { MessageForAPI } from '~/types/messages'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useVueFlow, VueFlow } from '@vue-flow/core'
import { MiniMap } from '@vue-flow/minimap'
import { streamText } from '@xsai/stream-text'
import { computed, onMounted, ref } from 'vue'
import NodeContextMenu from '~/components/NodeContextMenu.vue'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import { useLayout } from '~/composables/useLayout'
import { useMessagesStore } from '~/stores/messages'
import { useSettingsStore } from '~/stores/settings'

const settingsStore = useSettingsStore()
const messagesStore = useMessagesStore()
const { layout } = useLayout()

const flow = useVueFlow()

const selectedMessageId = ref<string | null>(null)

flow.onNodeClick((event) => {
  selectedMessageId.value = event.node.id
})

const currentBranchMessages = computed(() => {
  const messages: MessageForAPI[] = []
  let parentMessageId: string | null = selectedMessageId.value
  while (parentMessageId) {
    const message = messagesStore.messages.find(message => message.id === parentMessageId)
    if (!message) {
      console.error('sendMessage: find message failed')
      continue
    }
    messages.push({
      content: message.content,
      role: message.role,
    })
    parentMessageId = message.parentMessageId
  }
  return messages.reverse()
})

const currentBranchNodeIds = computed(() => {
  const nodeIds = new Set<string>()
  let parentMessageId: string | null = selectedMessageId.value

  while (parentMessageId) {
    nodeIds.add(parentMessageId)
    const message = messagesStore.messages.find(message => message.id === parentMessageId)
    if (!message)
      break
    parentMessageId = message.parentMessageId
  }

  return nodeIds
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
    style: {
      background: message.role === 'user' ? '#e3f2fd' : '#f3e5f5',
      color: selectedMessageId.value && !currentBranchNodeIds.value.has(message.id) ? '#999' : '#000',
      border: '1px solid',
      borderColor: message.role === 'user' ? '#90caf9' : '#ce93d8',
      borderRadius: '8px',
      padding: '10px',
      opacity: selectedMessageId.value && !currentBranchNodeIds.value.has(message.id) ? '0.5' : '1',
    },
    class: message.role === 'user' ? 'user-node' : 'assistant-node',
  }))

  const edges = messagesStore.messages.filter(message => message.parentMessageId).map(message => ({
    id: `${message.parentMessageId!}-${message.id}`,
    source: message.parentMessageId!,
    target: message.id,
    style: {
      stroke: selectedMessageId.value
        && (currentBranchNodeIds.value.has(message.id) && currentBranchNodeIds.value.has(message.parentMessageId!))
        ? '#000'
        : '#ccc',
      strokeWidth: selectedMessageId.value
        && (currentBranchNodeIds.value.has(message.id) && currentBranchNodeIds.value.has(message.parentMessageId!))
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

async function* asyncIteratorFromReadableStream<T, F = Uint8Array>(res: ReadableStream<F>, func: (value: F) => Promise<T>): AsyncGenerator<T, void, unknown> {
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

const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  nodeId: '',
})

flow.onNodeContextMenu((event) => {
  event.event.preventDefault()
  const node = event.node
  if (node.data.message.role === 'user') {
    contextMenu.value = {
      show: true,
      x: event.event.clientX,
      y: event.event.clientY,
      nodeId: node.id,
    }
  }
})

onMounted(() => {
  document.addEventListener('click', () => {
    contextMenu.value.show = false
  })
})

async function generateAnotherResponse() {
  selectedMessageId.value = contextMenu.value.nodeId
  await sendMessage(true)
  contextMenu.value.show = false
}

async function sendMessage(skipUserMessage = false) {
  // TODO: needs refactor! extract the generate response part and call different functions for `sendMessage` and `generateAnotherResponse`
  if (!skipUserMessage && !inputMessage.value) {
    return
  }

  if (!settingsStore.apiKey || !settingsStore.baseURL || !settingsStore.model) {
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
    messages: currentBranchMessages.value,
  })

  const answer = messagesStore.newMessage('', 'assistant', parentId)

  for await (const textPart of asyncIteratorFromReadableStream(textStream.textStream, async v => v)) {
    // textPart might be `undefined` in some cases
    textPart && messagesStore.updateMessage(answer.id, textPart)
  }

  // auto select the answer
  selectedMessageId.value = answer.id
}
</script>

<template>
  <VueFlow :nodes="nodesAndEdges.nodes" :edges="nodesAndEdges.edges">
    <Background />
    <Controls />
    <MiniMap />
    <NodeContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      @generate="generateAnotherResponse"
    />
  </VueFlow>
  <div class="absolute bottom-0 w-full flex gap-2 p-4" bg="white dark:gray-900" shadow="lg current">
    <Input v-model="inputMessage" />
    <Button class="h-10" @click="sendMessage(false)">
      Send
    </Button>
  </div>
</template>

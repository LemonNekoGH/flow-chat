<script lang="ts" setup>
import type { UseElementBoundingReturn } from '@vueuse/core'
import { Button, FieldTextArea } from '@proj-airi/ui'
import { useDebounceFn, useEventListener, useRafFn } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, inject, nextTick, ref, watch } from 'vue'
import { useMessagesStore } from '~/stores/messages'
import { useRoomViewStateStore } from '~/stores/roomViewState'

const props = defineProps<{
  nodeId: string | null
}>()

const emit = defineEmits<{
  (e: 'fork'): void
  (e: 'forkWith'): void
  (e: 'merge'): void
  (e: 'focusIn'): void
  (e: 'delete'): void
  (e: 'copy'): void
  (e: 'summarize'): void
  (e: 'regenerate'): void
  (e: 'send', message: string): void
}>()

const containerBounding = inject<UseElementBoundingReturn>('containerBounding')

const messagesStore = useMessagesStore()
const { hasAnyMessages } = storeToRefs(messagesStore)
const roomViewStateStore = useRoomViewStateStore()
const { selectedMessage } = storeToRefs(roomViewStateStore)

const isSelectedAssistant = computed(() => selectedMessage.value?.role === 'assistant')
const isSelectedGenerating = computed(() => {
  if (!selectedMessage.value) {
    return false
  }
  return messagesStore.isGenerating(selectedMessage.value.id)
})
const selectedHasSummary = computed(() => !!selectedMessage.value?.summary)
const selectedShowSummary = computed(() => selectedMessage.value?.show_summary ?? false)

function handleToggleSummary() {
  if (!selectedMessage.value) {
    return
  }

  const messageId = selectedMessage.value.id

  if (!selectedHasSummary.value && !isSelectedGenerating.value) {
    emit('summarize')
    void messagesStore.updateShowSummary(messageId, true) // Switch immediately to show "Summarizing..." or stream
    return
  }

  void messagesStore.updateShowSummary(messageId, !selectedShowSummary.value)
}

const toolbarStyle = ref<{ left?: string, right?: string, top?: string, bottom?: string }>({
  top: '50%',
  left: '50%',
})

const nodeElement = computed(() => {
  if (!props.nodeId) {
    return null
  }

  const nodeElement = document.querySelector(`[data-node-id="${props.nodeId}"]`) as HTMLElement
  if (!nodeElement) {
    return null
  }

  return nodeElement
})

const toolbarWidth = 400

const nodeScreenPosition = ref<{
  x: number
  y: number
  width: number
  height: number
  centerX: number
  centerY: number
} | null>(null)

const realtimeNodeScreenPosition = ref<{
  x: number
  y: number
  width: number
  height: number
  centerX: number
  centerY: number
} | null>(null)

function updateNodePosition() {
  if (!props.nodeId || !containerBounding) {
    return
  }

  if (!nodeElement.value) {
    return
  }

  const nodeRect = nodeElement.value.getBoundingClientRect()

  const containerLeft = containerBounding.left.value
  const containerTop = containerBounding.top.value
  const x = nodeRect.left - containerLeft
  const y = nodeRect.top - containerTop

  realtimeNodeScreenPosition.value = {
    x,
    y,
    width: nodeRect.width,
    height: nodeRect.height,
    centerX: x + nodeRect.width / 2,
    centerY: y + nodeRect.height / 2,
  }
}

useRafFn(() => {
  updateNodePosition()
}, {
  immediate: true,
})

const shouldShowBelow = computed(() => {
  if (!nodeScreenPosition.value) {
    return true
  }

  const containerHeight = containerBounding?.height.value ?? window.innerHeight
  const y = nodeScreenPosition.value.y
  const height = nodeScreenPosition.value.height

  return y + height < containerHeight / 2
})

function updateToolbarPosition() {
  if (!props.nodeId || !containerBounding) {
    toolbarStyle.value = {
      top: '50%',
      left: '50%',
      right: undefined,
      bottom: undefined,
    }

    return
  }

  if (realtimeNodeScreenPosition.value) {
    nodeScreenPosition.value = realtimeNodeScreenPosition.value
  }

  if (!nodeScreenPosition.value) {
    toolbarStyle.value = {
      top: '50%',
      left: '50%',
      right: undefined,
      bottom: undefined,
    }

    return
  }

  toolbarStyle.value = { top: undefined, bottom: undefined, left: undefined, right: undefined }

  const left = nodeScreenPosition.value.x + nodeScreenPosition.value.width / 2
  if (left + toolbarWidth / 2 > containerBounding.width.value) {
    toolbarStyle.value.right = `${8 - toolbarWidth / 2}px`
  }
  else {
    toolbarStyle.value.left = `${Math.max(8 + toolbarWidth / 2, left)}px`
  }

  if (shouldShowBelow.value) {
    toolbarStyle.value.top = `${nodeScreenPosition.value.y + nodeScreenPosition.value.height + 12}px`
  }
  else {
    toolbarStyle.value.bottom = `${containerBounding.height.value - nodeScreenPosition.value.y + 12}px`
  }
}

const debouncedUpdate = useDebounceFn(() => {
  if (props.nodeId) {
    updateToolbarPosition()
  }
}, 150)

watch(
  () => props.nodeId,
  (newNodeId) => {
    if (newNodeId) {
      nextTick(() => {
        updateNodePosition()
        updateToolbarPosition()
        requestAnimationFrame(() => {
          updateNodePosition()
          updateToolbarPosition()
        })
      })
    }
    else {
      toolbarStyle.value = {
        top: '50%',
        left: '50%',
        right: undefined,
        bottom: undefined,
      }
    }
  },
  { immediate: true },
)

watch(() => [props.nodeId, realtimeNodeScreenPosition.value], () => {
  if (!props.nodeId || !realtimeNodeScreenPosition.value) {
    return
  }

  updateToolbarPosition()
})

useEventListener('resize', () => {
  updateNodePosition()
  debouncedUpdate()
})

const inputMessage = ref('')

function handleSend() {
  if (inputMessage.value.trim()) {
    emit('send', inputMessage.value)
    inputMessage.value = ''
  }
}
</script>

<template>
  <Transition
    appear
    enter-active-class="transition-[opacity,transform] duration-200 ease-out"
    :enter-from-class="shouldShowBelow ? 'opacity-0 translate-y-10' : 'opacity-0 -translate-y-10'"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-[opacity,transform] duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    :leave-to-class="shouldShowBelow ? 'opacity-0 translate-y-10' : 'opacity-0 -translate-y-10'"
  >
    <div
      v-if="nodeId && selectedMessage || !hasAnyMessages"
      :style="{ ...toolbarStyle, width: `${toolbarWidth}px` }"
      :class="[
        'absolute z-50',
        'bg-white dark:bg-gray-800',
        'b-2 b-gray-100 dark:b-gray-700',
        'rounded-2xl',
        'p-4 w-100 -translate-x-1/2',
      ]"
    >
      <div v-if="selectedMessage" class="text-sm font-medium">
        Actions
      </div>
      <div v-if="selectedMessage" class="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary-muted"
          size="sm"
          class="h-8 text-xs"
          @click="emit('copy')"
        >
          Copy
        </Button>
        <Button
          v-if="isSelectedAssistant && !isSelectedGenerating"
          variant="secondary-muted"
          size="sm"
          class="h-8 text-xs"
          @click="handleToggleSummary"
        >
          {{ selectedShowSummary ? 'Hide Summary' : (selectedHasSummary ? 'Show Summary' : 'Summarize') }}
        </Button>
        <Button
          v-if="isSelectedAssistant && !isSelectedGenerating"
          variant="secondary-muted"
          size="sm"
          class="h-8 text-xs"
          @click="emit('regenerate')"
        >
          {{ selectedShowSummary ? 'Regenerate Summary' : 'Regenerate' }}
        </Button>
        <Button
          v-if="selectedMessage.role === 'user'"
          variant="secondary-muted"
          size="sm"
          class="h-8 text-xs"
          @click="emit('fork')"
        >
          Fork
        </Button>
        <Button
          v-if="selectedMessage.role === 'user'"
          variant="secondary-muted"
          size="sm"
          class="h-8 text-xs"
          @click="emit('forkWith')"
        >
          Fork With...
        </Button>
        <Button
          variant="secondary-muted"
          size="sm"
          class="h-8 text-xs"
          @click="emit('merge')"
        >
          Merge
        </Button>
        <Button
          variant="secondary-muted"
          size="sm"
          class="h-8 text-xs"
          @click="emit('focusIn')"
        >
          Focus In
        </Button>
        <Button
          variant="danger"
          size="sm"
          @click="emit('delete')"
        >
          Delete Node
        </Button>
      </div>
      <FieldTextArea
        v-model="inputMessage"
        :class="{
          'mt-4': selectedMessage,
        }"
        :label="hasAnyMessages && selectedMessage ? 'Rely' : 'Start the chat flow'"
        :description="hasAnyMessages && selectedMessage && messagesStore.hasChildren(selectedMessage.id) ? 'Will create a new branch' : undefined"
        :rows="2"
        @keydown.enter.exact.prevent="handleSend"
      />
      <Button
        size="sm"
        class="mt-4"
        @click="handleSend"
      >
        Send
      </Button>
    </div>
  </Transition>
</template>

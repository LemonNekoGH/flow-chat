<script lang="ts" setup>
import type { UseElementBoundingReturn } from '@vueuse/core'
import { Button, FieldTextArea } from '@proj-airi/ui'
import { useVueFlow } from '@vue-flow/core'
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, inject, ref, watch } from 'vue'
import { useMessagesStore } from '~/stores/messages'
import { useRoomViewStateStore } from '~/stores/roomViewState'

const props = defineProps<{
  nodeId: string | null
}>()

const emit = defineEmits<{
  (e: 'fork'): void
  (e: 'forkWith'): void
  (e: 'focusIn'): void
  (e: 'delete'): void
  (e: 'copy'): void
  (e: 'send', message: string): void
}>()

const containerBounding = inject<UseElementBoundingReturn>('containerBounding')

const messagesStore = useMessagesStore()
const { hasAnyMessages } = storeToRefs(messagesStore)
const { findNode, viewport } = useVueFlow()
const roomViewStateStore = useRoomViewStateStore()
const { selectedMessage } = storeToRefs(roomViewStateStore)

const toolbarStyle = ref<{ left?: string, right?: string, top?: string, bottom?: string }>({
  top: '0px',
})

const toolbarWidth = 400
const nodeScreenPosition = ref({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
})

const realtimeNodeScreenPosition = computed(() => {
  const node = findNode(props.nodeId)
  if (!node) {
    return
  }

  const nodePosition = node.position
  const nodeDimensions = node.dimensions
  const { x: viewportX, y: viewportY, zoom } = viewport.value

  const nodeScreenX = nodePosition.x * zoom + viewportX
  const nodeScreenY = nodePosition.y * zoom + viewportY
  const nodeScreenWidth = nodeDimensions.width * zoom
  const nodeScreenHeight = nodeDimensions.height * zoom

  return {
    x: nodeScreenX,
    y: nodeScreenY,
    width: nodeScreenWidth,
    height: nodeScreenHeight,
  }
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
  if (!props.nodeId || !nodeScreenPosition.value || !containerBounding) {
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
  updateToolbarPosition,
  { immediate: true },
)

watch(() => [props.nodeId, realtimeNodeScreenPosition.value], () => {
  if (!props.nodeId || !realtimeNodeScreenPosition.value) {
    return
  }

  updateToolbarPosition()
})

useEventListener('resize', debouncedUpdate)

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
    leave-active-class="transition-[opacity,transform] duration-150 ease-in'"
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

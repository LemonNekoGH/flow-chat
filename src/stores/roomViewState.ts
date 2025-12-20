import type { Edge, Node, TransitionOptions, ViewportTransform } from '@vue-flow/core'
import type { RoomViewStatePatch } from '~/stores/rooms'
import type { NodeData } from '~/types/node'
import { useVueFlow } from '@vue-flow/core'
import { useDebounceFn } from '@vueuse/core'
import { defineStore, storeToRefs } from 'pinia'
import { computed, nextTick, ref, watch, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { isDark } from '~/composables/dark'
import { useDatabaseStore } from '~/stores/database'
import { useMessagesStore } from '~/stores/messages'
import { useRoomsStore } from '~/stores/rooms'
import { useLayout } from '../composables/useLayout'

interface FocusAction {
  id: string | null
  center: boolean
}

interface PendingViewportAction {
  roomId: string
  snapshot: ViewportTransform | null
  preferFocus: boolean
}

function cloneViewportSnapshot(snapshot: ViewportTransform): ViewportTransform {
  return {
    x: snapshot.x,
    y: snapshot.y,
    zoom: snapshot.zoom,
  }
}

function areViewportEqual(
  a: ViewportTransform | null | undefined,
  b: ViewportTransform | null | undefined,
) {
  if (!a && !b) {
    return true
  }

  if (!a || !b) {
    return false
  }

  return a.x === b.x && a.y === b.y && a.zoom === b.zoom
}

export const useRoomViewStateStore = defineStore('roomViewState', () => {
  const route = useRoute('/chat/[id]')

  const dbStore = useDatabaseStore()

  const roomsStore = useRoomsStore()
  const { currentRoomId } = storeToRefs(roomsStore)

  const messagesStore = useMessagesStore()
  const { messages } = storeToRefs(messagesStore)

  const { layout } = useLayout()

  const selectedMessageId = ref<string | null>(null)

  const selectedMessage = computed(() => {
    return messagesStore.messages.find(message => message.id === selectedMessageId.value)
  })

  const currentBranch = computed(() => {
    return messagesStore.getBranchById(selectedMessageId.value)
  })

  const roomId = computed(() => {
    if (typeof route.params.id === 'string') {
      return route.params.id
    }
    const id = Array.isArray(route.params.id) ? route.params.id[0] : null
    return id || null
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
        data: { hidden: true, message: messages.value[0], inactive: false, generating: false },
      })
    }

    for (const message of messages.value) {
      const { id, parent_id, role } = message
      const active = ids.has(id)

      nodes.push({
        id,
        type: role,
        position: { x: 0, y: 0 },
        data: { message, inactive: !!selectedMessageId.value && !active, hidden: false, generating: false },
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

  const {
    setCenter,
    setViewport,
    findNode,
    viewport,
    addSelectedNodes,
    removeSelectedNodes,
    getSelectedNodes,
  } = useVueFlow()

  const isFlowReady = ref(false)
  const pendingFocusAction = ref<FocusAction | null>(null)
  const pendingViewportAction = ref<PendingViewportAction | null>(null)

  const persistRoomState = useDebounceFn(
    async (room: string, patch: RoomViewStatePatch) => {
      await dbStore.waitForDbInitialized()
      await roomsStore.updateRoomState(room, patch)
    },
    200,
  )

  function clearFlowSelection() {
    const selectedNodes = getSelectedNodes.value
    if (selectedNodes.length === 0) {
      return
    }

    removeSelectedNodes(selectedNodes)
  }

  const easeOut = (t: number) => 1 - (1 - t) ** 3
  const smoothViewportTransition: TransitionOptions = {
    duration: 300,
    ease: easeOut,
    interpolate: 'linear',
  }

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

    setCenter(
      nodeToCenter.position.x + 100,
      nodeToCenter.position.y + innerHeight / 4,
      {
        ...smoothViewportTransition,
        zoom: viewport.value.zoom,
      },
    )
  }

  function applyFlowSelection(nodeId: string, center: boolean) {
    if (!isFlowReady.value) {
      return false
    }

    const node = findNode(nodeId)
    if (!node) {
      return false
    }

    const selectedNodes = getSelectedNodes.value
    const alreadySelected = selectedNodes.length === 1 && selectedNodes[0]?.id === nodeId

    if (!alreadySelected) {
      if (selectedNodes.length) {
        removeSelectedNodes(selectedNodes)
      }
      addSelectedNodes([node])
    }

    if (center) {
      setCenterToNode(node.id)
    }

    return true
  }

  function attemptPendingFocus() {
    const action = pendingFocusAction.value
    if (!action || !isFlowReady.value) {
      return
    }

    if (action.id === null) {
      clearFlowSelection()
      pendingFocusAction.value = null
      return
    }

    if (applyFlowSelection(action.id, action.center)) {
      pendingFocusAction.value = null
    }
  }

  function focusFlowNode(nodeId: string | null, options: { center?: boolean } = {}) {
    const center = options.center ?? false

    pendingFocusAction.value = {
      id: nodeId,
      center,
    }

    attemptPendingFocus()
  }

  function attemptPendingViewport() {
    const action = pendingViewportAction.value
    if (!action) {
      return
    }

    const activeRoom = roomId.value
    if (!activeRoom || action.roomId !== activeRoom) {
      return
    }

    if (!isFlowReady.value) {
      return
    }

    if (action.snapshot) {
      const snapshot = action.snapshot
      requestAnimationFrame(() => {
        if (!areViewportEqual(snapshot, viewport.value)) {
          void setViewport(snapshot, smoothViewportTransition)
        }
        pendingViewportAction.value = null
      })
      return
    }

    if (!nodesAndEdges.value.nodes.length) {
      return
    }

    requestAnimationFrame(() => {
      const focusTarget = action.preferFocus ? selectedMessageId.value : null
      const focusNodeId = focusTarget && findNode(focusTarget) ? focusTarget : null
      const fallbackNodeId = nodesAndEdges.value.nodes[0]?.id
      const nodeIdToCenter = focusNodeId ?? fallbackNodeId

      if (nodeIdToCenter) {
        setCenterToNode(nodeIdToCenter)
      }
      pendingViewportAction.value = null
    })
  }

  function queueViewportRestore(action: PendingViewportAction | null) {
    if (!action) {
      pendingViewportAction.value = null
      return
    }

    pendingViewportAction.value = action
    attemptPendingViewport()
  }

  async function restoreRoomViewState(targetRoomId: string) {
    const { focusNodeId, viewport: savedViewport } = roomsStore.getRoomState(targetRoomId)

    if (focusNodeId) {
      const focusMessage = messagesStore.getMessageById(focusNodeId)
      if (focusMessage) {
        selectedMessageId.value = focusNodeId
        await nextTick()
        focusFlowNode(focusNodeId, { center: !savedViewport })
      }
      else {
        selectedMessageId.value = null
        focusFlowNode(null)
        try {
          await roomsStore.updateRoomState(targetRoomId, { focusNodeId: null })
        }
        catch (error) {
          console.error('Failed to reset focus node for room', error)
        }
      }
    }
    else {
      selectedMessageId.value = null
      focusFlowNode(null)
    }

    queueViewportRestore({
      roomId: targetRoomId,
      snapshot: savedViewport,
      preferFocus: true,
    })
  }

  watchEffect(() => {
    if (roomId.value) {
      void roomsStore.setCurrentRoom(roomId.value)
    }
  })

  watch(currentRoomId, async (newRoomId, previousRoomId) => {
    await dbStore.waitForDbInitialized()
    if (newRoomId) {
      await messagesStore.retrieveMessages()
      await restoreRoomViewState(newRoomId)
    }
    else if (previousRoomId) {
      messagesStore.resetState()
      selectedMessageId.value = null
      focusFlowNode(null)
      pendingViewportAction.value = null
    }
  }, { flush: 'post' })

  watch(selectedMessageId, (newSelected, oldSelected) => {
    if (newSelected === oldSelected) {
      return
    }

    focusFlowNode(newSelected ?? null)

    const activeRoomId = roomId.value
    if (!activeRoomId) {
      return
    }

    persistRoomState(activeRoomId, { focusNodeId: newSelected ?? null })
  })

  watch(
    () => ({
      x: viewport.value.x,
      y: viewport.value.y,
      zoom: viewport.value.zoom,
    }),
    (newViewport) => {
      if (!isFlowReady.value) {
        return
      }

      const activeRoomId = roomId.value
      if (!activeRoomId) {
        return
      }

      persistRoomState(activeRoomId, { viewport: cloneViewportSnapshot(newViewport) })
    },
    { flush: 'post' },
  )

  watch(
    () => nodesAndEdges.value.nodes.map(node => node.id).join(','),
    () => {
      attemptPendingFocus()
      attemptPendingViewport()
    },
    { flush: 'post' },
  )

  watch(
    () => isFlowReady.value,
    (ready) => {
      if (ready) {
        attemptPendingFocus()
        attemptPendingViewport()
      }
    },
  )

  watch(roomId, () => {
    attemptPendingViewport()
  })

  function handleInit() {
    isFlowReady.value = true

    attemptPendingFocus()
    attemptPendingViewport()

    const activeRoom = roomId.value
    if (activeRoom && !pendingViewportAction.value) {
      const { viewport: savedViewport } = roomsStore.getRoomState(activeRoom)
      queueViewportRestore({
        roomId: activeRoom,
        snapshot: savedViewport,
        preferFocus: true,
      })
    }
  }

  return {
    selectedMessageId,
    selectedMessage,
    currentRoomId,
    currentBranch,
    nodesAndEdges,
    route,

    focusFlowNode,
    handleInit,
    setCenterToNode,
    findNode,
  }
})

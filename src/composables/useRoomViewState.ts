import type { Edge, Node, TransitionOptions, ViewportTransform } from '@vue-flow/core'
import type { ComputedRef, Ref } from 'vue'
import type { RoomViewStatePatch } from '~/stores/rooms'
import type { BaseMessage } from '~/types/messages'
import type { NodeData } from '~/types/node'
import { useDebounceFn } from '@vueuse/core'
import { nextTick, ref, watch, watchEffect } from 'vue'

interface FocusAction {
  id: string | null
  center: boolean
}

interface PendingViewportAction {
  roomId: string
  snapshot: ViewportTransform | null
  preferFocus: boolean
}

interface RoomStores {
  dbStore: {
    waitForDbInitialized: () => Promise<unknown>
  }
  roomsStore: {
    setCurrentRoom: (id: string) => Promise<unknown> | unknown
    updateRoomState: (id: string, patch: RoomViewStatePatch) => Promise<unknown>
    getRoomState: (id: string | null | undefined) => {
      focusNodeId: string | null
      viewport: ViewportTransform | null
    }
  }
  messagesStore: {
    retrieveMessages: () => Promise<void>
    resetState: () => void
    getMessageById: (id: string) => BaseMessage | undefined
  }
}

export interface UseRoomViewStateOptions {
  roomId: ComputedRef<string | null>
  currentRoomId: Ref<string | null | undefined>
  selectedMessageId: Ref<string | null>
  nodesAndEdges: ComputedRef<{ nodes: Node<NodeData>[], edges: Edge[] }>
  viewport: Ref<ViewportTransform>
  smoothViewportTransition: TransitionOptions
  setCenterToNode: (node: Node<NodeData> | string) => void
  setViewport: (
    snapshot: ViewportTransform,
    transition?: TransitionOptions,
  ) => Promise<unknown> | void
  findNode: (id: string) => Node<NodeData> | undefined
  addSelectedNodes: (nodes: any[]) => void
  removeSelectedNodes: (nodes: any[]) => void
  getSelectedNodes: Ref<any[]>
  stores: RoomStores
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

export function useRoomViewState(options: UseRoomViewStateOptions) {
  const {
    roomId,
    currentRoomId,
    selectedMessageId,
    nodesAndEdges,
    viewport,
    smoothViewportTransition,
    setCenterToNode,
    setViewport,
    findNode,
    addSelectedNodes,
    removeSelectedNodes,
    getSelectedNodes,
    stores: { dbStore, roomsStore, messagesStore },
  } = options

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
    focusFlowNode,
    handleInit,
  }
}

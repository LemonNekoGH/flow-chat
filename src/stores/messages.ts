import type { CommonContentPart } from 'xsai'
import type { ExportedRoomMessages, Message, MessageRole } from '~/types/messages'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useMessageModel } from '~/models/messages'
import { useRoomsStore } from './rooms'

export const useMessagesStore = defineStore('messages', () => {
  // Persistence layer
  const roomsStore = useRoomsStore() // don't use store to ref to avoid circular dependency
  const messageModel = useMessageModel()
  const messages = ref<Message[]>([])
  const hasAnyMessages = computed(() => messages.value.length > 0)
  const generatingMessages = ref<string[]>([])

  function mutateMessageById(id: string, mutate: (msg: Message) => void) {
    const msg = messages.value.find(message => message.id === id)
    if (!msg) {
      return
    }

    mutate(msg)
  }

  // Business logic
  async function newMessage(
    content: CommonContentPart[],
    role: MessageRole,
    parentId: string | null,
    provider: string,
    model: string,
    roomId: string,
    memory?: string[],
  ) {
    const [message] = await messageModel.create({
      role,
      parent_id: parentId,
      provider,
      model,
      room_id: roomId,
      memory: memory || [],
      summary: null,
    })

    if (content.length > 0) {
      await appendContent(message.id, content)
    }

    return message
  }

  async function appendContent(id: string, part: CommonContentPart | CommonContentPart[]) {
    if (Array.isArray(part)) {
      await messageModel.appendContentBatch(id, part)

      mutateMessageById(id, (msg) => {
        msg.content.push(...part)
      })

      return
    }

    await messageModel.appendContent(id, part)

    mutateMessageById(id, (msg) => {
      msg.content.push(part)
    })
  }

  async function deleteContent(message_id: string) {
    await messageModel.deleteContent(message_id)

    mutateMessageById(message_id, (msg) => {
      msg.content = []
    })
  }

  async function updateContent(message_id: string, parts: CommonContentPart[]) {
    await messageModel.updateContent(message_id, parts)

    mutateMessageById(message_id, (msg) => {
      msg.content = parts
    })
  }

  async function appendSummary(id: string, text: string) {
    await messageModel.appendSummary(id, text)

    mutateMessageById(id, (msg) => {
      msg.summary = (msg.summary || '') + text
    })
  }

  async function updateSummary(id: string, summary: string) {
    await messageModel.updateSummary(id, summary)

    mutateMessageById(id, (msg) => {
      msg.summary = summary
    })
  }

  async function updateShowSummary(id: string, show_summary: boolean) {
    await messageModel.updateShowSummary(id, show_summary)

    mutateMessageById(id, (msg) => {
      msg.show_summary = show_summary
    })
  }
  async function deleteMessages(ids: string[]) {
    if (ids.length === 0)
      return

    await messageModel.deleteByIds(ids)

    const idSet = new Set(ids)
    messages.value = messages.value.filter(message => !idSet.has(message.id))
  }

  async function deleteSubtree(id: string) {
    const ids = getSubtreeById(id)
    await deleteMessages(ids)
  }

  // Pure query functions
  function getMessageById(id: string | null) {
    return messages.value.find(message => message.id === id)
  }

  function getParentMessage(msg: Message) {
    if (!msg.parent_id)
      return undefined

    return getMessageById(msg.parent_id)
  }

  function getChildMessagesById(id?: string): Message[] {
    if (!id)
      return []

    const children: Message[] = []
    for (const message of messages.value) {
      if (message.parent_id === id) {
        children.push(message)
      }
    }

    return children
  }

  function getBranchById(id: string | null) {
    const messages: Message[] = []
    const ids = new Set<string>()

    for (let message = getMessageById(id); message; message = getParentMessage(message)) {
      messages.push(message)
      ids.add(message.id)
    }

    return { messages: messages.reverse(), ids } as const
  }

  function getSubtreeById(id: string): string[] {
    const descendants = [id]
    for (let i = 0; i < descendants.length; i++) {
      for (const { id } of getChildMessagesById(descendants[i])) {
        descendants.push(id)
      }
    }
    return descendants
  }

  function isGenerating(id: string) {
    return generatingMessages.value.includes(id)
  }

  function startGenerating(id: string) {
    if (!generatingMessages.value.includes(id)) {
      generatingMessages.value.push(id)
    }
  }

  function stopGenerating(id: string) {
    if (generatingMessages.value.length === 0)
      return

    generatingMessages.value = generatingMessages.value.filter(messageId => messageId !== id)
  }

  async function retrieveMessages() {
    if (!roomsStore.currentRoomId)
      return

    // TODO: try to use enum
    messages.value = await messageModel.getByRoomId(roomsStore.currentRoomId)
  }

  function resetState() {
    messages.value = []
    generatingMessages.value = []
  }

  function hasChildren(messageId: string) {
    return messages.value.some(message => message.parent_id === messageId)
  }

  async function exportRoomMessages(roomId: string): Promise<ExportedRoomMessages> {
    const room = roomsStore.rooms.find(item => item.id === roomId)
    if (!room) {
      throw new Error('Room not found')
    }

    const roomMessages = await messageModel.getByRoomId(roomId)
    return {
      version: 1,
      exported_at: new Date().toISOString(),
      room: {
        id: room.id,
        name: room.name,
      },
      messages: roomMessages.map(message => ({
        id: message.id,
        parent_id: message.parent_id,
        role: message.role as MessageRole,
        provider: message.provider,
        model: message.model,
        summary: message.summary,
        show_summary: message.show_summary ?? false,
        memory: message.memory ?? [],
        content: message.content,
      })),
    }
  }

  async function importRoomMessages(roomId: string, payload: ExportedRoomMessages) {
    if (!payload || payload.version !== 1) {
      throw new Error('Unsupported export format')
    }

    const pending = [...payload.messages]
    const idMap = new Map<string, string>()
    let guard = 0

    while (pending.length > 0) {
      guard += 1
      if (guard > payload.messages.length + 1) {
        throw new Error('Failed to resolve message parent links')
      }

      let progressed = false
      const remaining: typeof pending = []

      for (const message of pending) {
        const parentId = message.parent_id ? idMap.get(message.parent_id) : null
        if (message.parent_id && !parentId) {
          remaining.push(message)
          continue
        }

        const [created] = await messageModel.create({
          role: message.role,
          parent_id: parentId ?? null,
          provider: message.provider,
          model: message.model,
          room_id: roomId,
          memory: message.memory ?? [],
          summary: message.summary ?? null,
        })

        if (message.content.length > 0) {
          await messageModel.appendContentBatch(created.id, message.content)
        }

        if (message.show_summary) {
          await messageModel.updateShowSummary(created.id, true)
        }

        idMap.set(message.id, created.id)
        progressed = true
      }

      if (!progressed) {
        throw new Error('Failed to import messages')
      }

      pending.length = 0
      pending.push(...remaining)
    }

    if (roomsStore.currentRoomId === roomId) {
      await retrieveMessages()
    }
  }

  return {
    // State
    messages,
    generatingMessages,
    hasAnyMessages,

    // Actions
    newMessage,
    appendContent,
    deleteContent,
    updateContent,
    deleteMessages,
    deleteSubtree,

    // Queries
    getMessageById,
    getParentMessage,
    getChildMessagesById,
    getBranchById,
    getSubtreeById,

    isGenerating,
    startGenerating,
    stopGenerating,

    retrieveMessages,
    resetState,
    appendSummary,
    updateSummary,
    updateShowSummary,

    hasChildren,
    exportRoomMessages,
    importRoomMessages,
  }
})

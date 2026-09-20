import type { CommonContentPart } from 'xsai'
import type { Message, MessageRole } from '~/types/messages'
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

  async function mergeBranch(targetNodeId: string, sourceLeafId: string) {
    const targetBranch = getBranchById(targetNodeId)
    const sourceBranch = getBranchById(sourceLeafId)

    const sourcePath = sourceBranch.messages
    const targetPathIds = targetBranch.ids

    let startIndex = 0
    // Find the first message in sourcePath that is NOT in targetPath
    for (let i = 0; i < sourcePath.length; i++) {
      if (!targetPathIds.has(sourcePath[i].id)) {
        startIndex = i
        break
      }
    }

    // If sourceLeafId is in targetPath, source is an ancestor of target (or same node)
    // In this case, there's nothing "new" to merge from source to target.
    if (targetPathIds.has(sourceLeafId)) {
      return targetNodeId
    }

    const messagesToCopy = sourcePath.slice(startIndex)
    let currentParentId = targetNodeId

    for (const msg of messagesToCopy) {
      const newMsg = await newMessage(
        msg.content,
        msg.role,
        currentParentId,
        msg.provider,
        msg.model,
        msg.room_id!,
        msg.memory,
      )
      currentParentId = newMsg.id
    }

    await retrieveMessages()
    return currentParentId
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
    mergeBranch,

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
  }
})

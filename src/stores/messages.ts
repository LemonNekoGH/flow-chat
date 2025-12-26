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

  // images
  // FIXME: dirty code, add a store for image
  const image = ref('')

  function mutateMessageById(id: string, mutate: (msg: Message) => void) {
    const msg = messages.value.find(message => message.id === id)
    if (!msg) {
      return
    }

    mutate(msg)
  }

  // Business logic
  function newMessage(
    text: string,
    role: MessageRole,
    parentId: string | null,
    provider: string,
    model: string,
    roomId: string,
    memory?: string[],
  ) {
    return messageModel.create({
      content: text,
      role,
      parent_id: parentId,
      provider,
      model,
      room_id: roomId,
      memory: memory || [],
      summary: null,
    })
  }

  // pass `""` to `text` to update the message without appending content
  async function appendContent(id: string, text: string) {
    await messageModel.appendContent(id, text)

    mutateMessageById(id, (msg) => {
      msg.content += text
    })
  }

  async function setContent(id: string, text: string) {
    await messageModel.updateContent(id, text)

    mutateMessageById(id, (msg) => {
      msg.content = text
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
    messages.value = await messageModel.getByRoomId(roomsStore.currentRoomId) as Message[]
  }

  function resetState() {
    messages.value = []
    generatingMessages.value = []
    image.value = ''
  }

  function hasChildren(messageId: string) {
    return messages.value.some(message => message.parent_id === messageId)
  }

  return {
    // State
    messages,
    image,
    generatingMessages,
    hasAnyMessages,

    // Actions
    newMessage,
    setContent,
    appendContent,
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
  }
})

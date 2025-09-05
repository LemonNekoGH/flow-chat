import type { Message, MessageRole } from '~/types/messages'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useMessageModel } from '~/models/messages'
import { useRoomsStore } from './rooms'

export const useMessagesStore = defineStore('messages', () => {
  // Persistence layer
  const roomsStore = useRoomsStore() // don't use store to ref to avoid circular dependency
  const messageModel = useMessageModel()
  const messages = ref<Message[]>([])
  const generatingMessages = ref<string[]>([])

  // images
  // FIXME: dirty code, add a store for image
  const image = ref('')

  // Business logic
  function newMessage(
    text: string,
    role: MessageRole,
    parentId: string | null,
    provider: string,
    model: string,
    roomId: string,
  ) {
    return messageModel.create({
      content: text,
      role,
      parent_id: parentId,
      provider,
      model,
      room_id: roomId,
    })
  }

  // pass `""` to `text` to update the message without appending content
  function appendContent(id: string, text: string) {
    return messageModel.appendContent(id, text)
  }

  function deleteMessages(ids: string[]) {
    return messageModel.deleteByIds(ids)
  }

  function deleteSubtree(id: string) {
    return deleteMessages(getSubtreeById(id))
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

  async function retrieveMessages() {
    if (!roomsStore.currentRoomId)
      return

    // TODO: try to use enum
    messages.value = await messageModel.getByRoomId(roomsStore.currentRoomId) as Message[]
  }

  return {
    // State
    messages,
    image,
    generatingMessages,

    // Actions
    newMessage,
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

    retrieveMessages,
  }
})

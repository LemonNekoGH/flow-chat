import type { Message, MessageRole } from '~/types/messages'
import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { tutorialMessages } from '~/utils/tutorial'

// Type definitions for our maps
type MessageMap = Map<string, Message>
type RoomMessageMap = Map<string, MessageMap>

export const useMessagesStore = defineStore('messages', () => {
  // Using useLocalStorage for persistence
  const messagesStorage = useLocalStorage<[string, [string, Message][]][]>('flow-chat-messages', [])

  // Create reactive maps from storage
  const messagesByRoom = computed<RoomMessageMap>(() => {
    const roomMap = new Map()
    for (const [roomId, messages] of messagesStorage.value) {
      roomMap.set(roomId, new Map(messages))
    }
    return roomMap
  })

  // Save maps back to storage
  function saveToStorage() {
    messagesStorage.value = Array.from(messagesByRoom.value.entries()).map(
      ([roomId, messages]) => [roomId, Array.from(messages.entries())],
    )
  }

  function newMessage(text: string, role: MessageRole, parentMessageId: string | null = null, model?: string, roomId: string = '') {
    const id = crypto.randomUUID()
    const message: Message = {
      id,
      content: text,
      role,
      parentMessageId,
      timestamp: Date.now(),
      model,
      roomId,
    }

    // Get or create room message map
    const roomMessages = messagesByRoom.value.get(roomId) || new Map()
    roomMessages.set(id, message)
    messagesByRoom.value.set(roomId, roomMessages)

    saveToStorage()
    return message
  }

  function updateMessage(id: string, text: string) {
    for (const roomMessages of messagesByRoom.value.values()) {
      const message = roomMessages.get(id)
      if (message) {
        message.content += text
        saveToStorage()
        return
      }
    }
  }

  function deleteMessages(ids: string[]) {
    if (!ids.length)
      return

    for (const [roomId, roomMessages] of messagesByRoom.value.entries()) {
      for (const id of ids) {
        roomMessages.delete(id)
      }
      if (roomMessages.size === 0) {
        messagesByRoom.value.delete(roomId)
      }
    }
    saveToStorage()
  }

  function deleteSubtree(id: string) {
    deleteMessages(getSubtreeById(id))
  }

  function getMessageById(id?: string | null): Message | undefined {
    if (!id)
      return undefined

    for (const roomMessages of messagesByRoom.value.values()) {
      const message = roomMessages.get(id)
      if (message)
        return message
    }
    return undefined
  }

  function getParentMessage(msg: Message) {
    return getMessageById(msg.parentMessageId)
  }

  function getChildMessagesById(id?: string | null): Message[] {
    if (!id)
      return []

    const children: Message[] = []
    for (const roomMessages of messagesByRoom.value.values()) {
      for (const message of roomMessages.values()) {
        if (message.parentMessageId === id) {
          children.push(message)
        }
      }
    }
    return children
  }

  function getBranchById(id?: string | null) {
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

  function getMessagesByRoomId(roomId?: string | null): Message[] {
    if (!roomId)
      return []
    const roomMessages = messagesByRoom.value.get(roomId)
    return roomMessages ? Array.from(roomMessages.values()) : []
  }

  function restoreTutorial() {
    deleteSubtree('tutorial-root')

    for (const message of tutorialMessages) {
      const roomMessages = messagesByRoom.value.get(message.roomId) || new Map()
      roomMessages.set(message.id, message)
      messagesByRoom.value.set(message.roomId, roomMessages)
    }
    saveToStorage()
  }

  return {
    messages: computed(() => {
      const allMessages: Message[] = []
      for (const roomMessages of messagesByRoom.value.values()) {
        allMessages.push(...roomMessages.values())
      }
      return allMessages
    }),

    newMessage,
    updateMessage,
    deleteMessages,
    deleteSubtree,
    getMessageById,
    getParentMessage,
    getChildMessagesById,
    getBranchById,
    getSubtreeById,
    getMessagesByRoomId,
    restoreTutorial,
  }
})

import type { Message, MessageRole } from '~/types/messages'
import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { tutorialMessages } from '~/utils/tutorial'

// Type definitions for our maps
type MessageMap = Map<string, Message>
type RoomMessageMap = Map<string, MessageMap>

export const useMessagesStore = defineStore('messages', () => {
  // Persistence layer
  const messagesStorage = useLocalStorage<[string, [string, Message][]][]>('flow-chat-messages', [])

  // Pure computed values
  const messagesByRoom = computed<RoomMessageMap>(() => {
    const roomMap = new Map()
    for (const [roomId, messages] of messagesStorage.value) {
      roomMap.set(roomId, new Map(messages))
    }
    return roomMap
  })

  // Pure functions for state transformations
  function createMessageState(
    text: string,
    role: MessageRole,
    parentMessageId: string | null,
    model: string | undefined,
    roomId: string,
  ): Message {
    return {
      id: crypto.randomUUID(),
      content: text,
      role,
      parentMessageId,
      timestamp: Date.now(),
      model,
      roomId,
    }
  }

  function updateMessageContent(message: Message, text: string): Message {
    return {
      ...message,
      content: message.content + text,
    }
  }

  // Storage operations
  function persistMessages(newMap: RoomMessageMap) {
    messagesStorage.value = Array.from(newMap.entries()).map(
      ([roomId, messages]) => [roomId, Array.from(messages.entries())],
    )
  }

  // Business logic
  function newMessage(
    text: string,
    role: MessageRole,
    parentMessageId: string | null = null,
    model?: string,
    roomId: string = '',
  ) {
    const message = createMessageState(text, role, parentMessageId, model, roomId)

    const newMap = new Map(messagesByRoom.value)
    const roomMessages = newMap.get(roomId) || new Map()
    roomMessages.set(message.id, message)
    newMap.set(roomId, roomMessages)

    persistMessages(newMap)
    return message
  }

  function updateMessage(id: string, text: string): boolean {
    const newMap = new Map(messagesByRoom.value)

    for (const [roomId, roomMessages] of newMap.entries()) {
      const message = roomMessages.get(id)
      if (message) {
        const updatedMessage = updateMessageContent(message, text)
        roomMessages.set(id, updatedMessage)
        newMap.set(roomId, roomMessages)
        persistMessages(newMap)
        return true
      }
    }

    return false
  }

  function deleteMessages(ids: string[]): boolean {
    if (!ids.length)
      return false

    const newMap = new Map(messagesByRoom.value)
    let hasChanges = false

    for (const [roomId, roomMessages] of newMap.entries()) {
      const newRoomMessages = new Map(roomMessages)
      for (const id of ids) {
        if (newRoomMessages.delete(id)) {
          hasChanges = true
        }
      }

      if (newRoomMessages.size === 0) {
        newMap.delete(roomId)
      }
      else {
        newMap.set(roomId, newRoomMessages)
      }
    }

    if (hasChanges) {
      persistMessages(newMap)
    }
    return hasChanges
  }

  function deleteSubtree(id: string): boolean {
    return deleteMessages(getSubtreeById(id))
  }

  // Pure query functions
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

  function getParentMessage(msg: Message): Message | undefined {
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

    const newMap = new Map(messagesByRoom.value)
    for (const message of tutorialMessages) {
      const roomMessages = newMap.get(message.roomId) || new Map()
      roomMessages.set(message.id, message)
      newMap.set(message.roomId, roomMessages)
    }

    persistMessages(newMap)
    return true
  }

  return {
    // State
    messages: computed(() => {
      const allMessages: Message[] = []
      for (const roomMessages of messagesByRoom.value.values()) {
        allMessages.push(...roomMessages.values())
      }
      return allMessages
    }),

    // Actions
    newMessage,
    updateMessage,
    deleteMessages,
    deleteSubtree,

    // Queries
    getMessageById,
    getParentMessage,
    getChildMessagesById,
    getBranchById,
    getSubtreeById,
    getMessagesByRoomId,
    restoreTutorial,
  }
})

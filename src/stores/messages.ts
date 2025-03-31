import type { Message, MessageRole } from '~/types/messages'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useRoomsStore } from './rooms'

export const useMessagesStore = defineStore('messages', () => {
  const messages = ref<Message[]>([])
  const roomsStore = useRoomsStore()

  const currentRoomMessages = computed(() => {
    return messages.value.filter(message => message.roomId === roomsStore.activeRoomId)
  })

  function newMessage(text: string, role: MessageRole, parentMessageId: string | null = null) {
    const roomId = roomsStore.activeRoomId || roomsStore.initializeDefaultRoom()?.id

    if (!roomId) {
      throw new Error('No active room found')
    }

    const id = crypto.randomUUID()
    const message: Message = {
      id,
      content: text,
      role,
      parentMessageId,
      timestamp: Date.now(),
      roomId,
    }

    messages.value.push(message)
    roomsStore.updateRoomLastActivity(roomId)

    return message
  }

  function updateMessage(id: string, text: string) {
    const message = getMessageById(id)
    if (!message) {
      return
    }
    message.content += text

    if (message.roomId) {
      roomsStore.updateRoomLastActivity(message.roomId)
    }
  }

  function deleteMessages(ids: string[]) {
    if (!ids.length)
      return

    messages.value = messages.value.filter(message => !ids.includes(message.id))
  }

  function deleteSubtree(id: string) {
    deleteMessages(getSubtreeById(id))
  }

  function deleteRoomMessages(roomId: string) {
    messages.value = messages.value.filter(message => message.roomId !== roomId)
  }

  function getMessageById(id?: string | null) {
    return messages.value.find(message => message.id === id)
  }

  function getParentMessage(msg: Message) {
    return getMessageById(msg.parentMessageId)
  }

  function getChildMessagesById(id?: string | null) {
    return currentRoomMessages.value.filter(message => message.parentMessageId === id)
  }

  function getBranchById(id?: string | null) {
    const roomMessages = currentRoomMessages.value
    const msgs: Message[] = []
    const ids = new Set<string>()

    let currentMessage = roomMessages.find(message => message.id === id)

    // If no message is found with the given id in the current room, start from null (root)
    if (!currentMessage && id !== null) {
      return getBranchById(null)
    }

    for (; currentMessage; currentMessage = roomMessages.find(message => message.id === currentMessage?.parentMessageId)) {
      msgs.push(currentMessage)
      ids.add(currentMessage.id)
    }

    // Add system prompt if it exists for the current room
    const activeRoom = roomsStore.getRoomById(roomsStore.activeRoomId)
    if (activeRoom?.systemPrompt) {
      const systemMessage: Message = {
        id: `system-${activeRoom.id}`,
        content: activeRoom.systemPrompt,
        role: 'system',
        parentMessageId: null,
        timestamp: 0,
        roomId: activeRoom.id,
      }
      msgs.push(systemMessage)
    }

    return { messages: msgs.reverse(), ids } as const
  }

  function getSubtreeById(id: string) {
    // use BFS to get all message IDs in the subtree
    //  1. to avoid DFS's recursion, which will be a little bit better for performance
    //  2. we can simply return the BFS queue, for free!
    const descendants = [id]
    for (let i = 0; i < descendants.length; i++) {
      for (const { id } of getChildMessagesById(descendants[i])) descendants.push(id)
    }
    return descendants
  }

  function initializeRoomWithSystemPrompt(roomId: string) {
    const room = roomsStore.getRoomById(roomId)
    if (!room || !room.systemPrompt)
      return

    // Don't add if there's already messages in this room
    if (messages.value.some(msg => msg.roomId === roomId))
      return

    // Add system prompt message
    const message: Message = {
      id: crypto.randomUUID(),
      content: room.systemPrompt,
      role: 'system',
      parentMessageId: null,
      timestamp: Date.now(),
      roomId,
    }

    messages.value.push(message)
  }

  return {
    messages,
    currentRoomMessages,

    newMessage,
    updateMessage,
    deleteMessages,
    deleteSubtree,
    deleteRoomMessages,
    initializeRoomWithSystemPrompt,

    getMessageById,
    getParentMessage,
    getChildMessagesById,
    getBranchById,
    getSubtreeById,
  }
}, {
  persist: true,
})

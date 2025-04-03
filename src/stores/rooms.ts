import type { MessageRole } from '~/types/messages'
import type { Room } from '~/types/rooms'
import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessagesStore } from './messages'
import { useTemplatesStore } from './templates'

// Type definition for our room map
type RoomMap = Map<string, Room>

export const useRoomsStore = defineStore('rooms', () => {
  // Using useLocalStorage for persistence
  const roomsStorage = useLocalStorage<[string, Room][]>('flow-chat-rooms', [])
  const currentRoomId = useLocalStorage<string | null>('flow-chat-current-room', null)

  const messagesStore = useMessagesStore()
  const templatesStore = useTemplatesStore()
  const router = useRouter()

  // Create reactive map from storage
  const roomsMap = computed<RoomMap>(() => {
    return new Map(roomsStorage.value)
  })

  // Computed property for array of rooms (for compatibility)
  const rooms = computed<Room[]>(() => Array.from(roomsMap.value.values()))

  // Save map back to storage
  function saveToStorage() {
    roomsStorage.value = Array.from(roomsMap.value.entries())
  }

  const currentRoom = computed(() => {
    return currentRoomId.value ? roomsMap.value.get(currentRoomId.value) || null : null
  })

  function createRoom(name: string, templateId?: string) {
    const id = crypto.randomUUID()

    // Get the template to use (specified, default, or first available)
    const template = templateId
      ? templatesStore.getTemplateById(templateId)
      : templatesStore.defaultTemplate || templatesStore.templates[0]

    // Use template for system prompt or fallback to default if no template
    const systemPrompt = template?.systemPrompt || ''

    // Create system prompt message for this room
    const systemPromptId = messagesStore.newMessage(systemPrompt, 'system', null, undefined, id).id

    const room: Room = {
      id,
      name,
      systemPromptId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    roomsMap.value.set(id, room)
    saveToStorage()
    setCurrentRoom(id)

    return room
  }

  function updateRoom(id: string, data: Partial<Omit<Room, 'id' | 'createdAt'>>) {
    const room = roomsMap.value.get(id)
    if (!room)
      return

    const updatedRoom = {
      ...room,
      ...data,
      updatedAt: Date.now(),
    }

    roomsMap.value.set(id, updatedRoom)
    saveToStorage()
  }

  function deleteRoom(id: string) {
    // Don't delete if it's the only room
    if (roomsMap.value.size <= 1)
      return

    const room = roomsMap.value.get(id)
    if (!room)
      return

    // Delete all messages in this room
    if (room.systemPromptId) {
      messagesStore.deleteSubtree(room.systemPromptId)
    }

    // Remove room from map
    roomsMap.value.delete(id)
    saveToStorage()

    // Set current room to another room if current one is deleted
    if (currentRoomId.value === id) {
      const firstRoom = rooms.value[0]
      if (firstRoom) {
        setCurrentRoom(firstRoom.id)
      }
    }
  }

  function setCurrentRoom(id: string) {
    const room = roomsMap.value.get(id)
    if (room) {
      currentRoomId.value = id
      router.push(`/chat/${id}`)
    }
  }

  function createMessage(content: string, role: MessageRole, parentMessageId: string | null = null, model?: string) {
    const parent = parentMessageId || currentRoom.value?.systemPromptId || null
    return messagesStore.newMessage(content, role, parent, model, currentRoomId.value || undefined)
  }

  function getRoomSystemPrompt(roomId: string) {
    const room = roomsMap.value.get(roomId)
    if (!room || !room.systemPromptId)
      return null
    return messagesStore.getMessageById(room.systemPromptId)
  }

  // Initialize with a default room if none exists
  function initialize() {
    // Initialize templates first to ensure we have a default template
    templatesStore.initialize()

    if (roomsMap.value.size === 0) {
      createRoom('Default Chat')
    }

    // Return to the latest chat room if exists
    return rooms.value[rooms.value.length - 1]
  }

  return {
    rooms,
    currentRoomId,
    currentRoom,
    createRoom,
    updateRoom,
    deleteRoom,
    setCurrentRoom,
    createMessage,
    getRoomSystemPrompt,
    initialize,
  }
})

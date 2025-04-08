import type { MessageRole } from '~/types/messages'
import type { Room } from '~/types/rooms'
import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTemplateModel } from '~/models/template'
import { useMessagesStore } from './messages'

// Type definition for our room map
type RoomMap = Map<string, Room>

export const useRoomsStore = defineStore('rooms', () => {
  // Persistence layer
  const roomsStorage = useLocalStorage<[string, Room][]>('flow-chat-rooms', [])
  const currentRoomId = useLocalStorage<string | null>('flow-chat-current-room', null)

  const messagesStore = useMessagesStore()
  const templateModel = useTemplateModel()
  const router = useRouter()

  // Pure computed values
  const roomsMap = computed<RoomMap>(() => new Map(roomsStorage.value))
  const rooms = computed<Room[]>(() => Array.from(roomsMap.value.values()))
  const currentRoom = computed(() =>
    currentRoomId.value ? roomsMap.value.get(currentRoomId.value) ?? null : null,
  )

  // Pure functions for state transformations
  function createRoomState(name: string, systemPromptId: string): Room {
    return {
      id: crypto.randomUUID(),
      name,
      systemPromptId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  function updateRoomState(room: Room, data: Partial<Omit<Room, 'id' | 'createdAt'>>): Room {
    return {
      ...room,
      ...data,
      updatedAt: Date.now(),
    }
  }

  // Storage operations
  function persistRooms(newMap: RoomMap) {
    roomsStorage.value = Array.from(newMap.entries())
  }

  function persistCurrentRoom(roomId: string | null) {
    currentRoomId.value = roomId
  }

  // Business logic
  async function createRoom(name: string, templateId?: string) {
    const template = templateId
      ? (await templateModel.getById(templateId))[0]
      : (await templateModel.getAll())[0]

    const systemPrompt = template?.system_prompt || ''
    const { id: systemPromptId } = messagesStore.newMessage(systemPrompt, 'system', null, undefined, '')

    const room = createRoomState(name, systemPromptId)
    const newMap = new Map(roomsMap.value)
    newMap.set(room.id, room)

    persistRooms(newMap)
    setCurrentRoom(room.id)

    return room
  }

  function updateRoom(id: string, data: Partial<Omit<Room, 'id' | 'createdAt'>>) {
    const room = roomsMap.value.get(id)
    if (!room)
      return

    const updatedRoom = updateRoomState(room, data)
    const newMap = new Map(roomsMap.value)
    newMap.set(id, updatedRoom)

    persistRooms(newMap)
    return updatedRoom
  }

  function deleteRoom(id: string) {
    if (roomsMap.value.size <= 1)
      return false

    const room = roomsMap.value.get(id)
    if (!room)
      return false

    // Handle message cleanup
    if (room.systemPromptId) {
      messagesStore.deleteSubtree(room.systemPromptId)
    }

    const newMap = new Map(roomsMap.value)
    newMap.delete(id)
    persistRooms(newMap)

    // Handle current room change
    if (currentRoomId.value === id) {
      const firstRoom = rooms.value[0]
      if (firstRoom) {
        setCurrentRoom(firstRoom.id)
      }
    }

    return true
  }

  async function setCurrentRoom(id: string) {
    const room = roomsMap.value.get(id)
    if (!room)
      return false

    persistCurrentRoom(id)

    router.replace(`/chat/${id}`)
    return true
  }

  function createMessage(content: string, role: MessageRole, parentMessageId: string | null = null, model?: string) {
    const parent = parentMessageId || currentRoom.value?.systemPromptId || null
    return messagesStore.newMessage(
      content,
      role,
      parent,
      model,
      currentRoomId.value || undefined,
    )
  }

  function getRoomSystemPrompt(roomId: string) {
    const room = roomsMap.value.get(roomId)
    return (!room || !room.systemPromptId)
      ? null
      : messagesStore.getMessageById(room.systemPromptId)
  }

  function initialize() {
    if (roomsMap.value.size === 0) {
      const room = createRoom('Default Chat')
      return room
    }

    return rooms.value[rooms.value.length - 1]
  }

  return {
    // State
    rooms,
    currentRoomId,
    currentRoom,

    // Actions
    createRoom,
    updateRoom,
    deleteRoom,
    setCurrentRoom,
    createMessage,
    getRoomSystemPrompt,
    initialize,
  }
})

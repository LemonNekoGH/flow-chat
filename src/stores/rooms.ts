import type { MessageRole } from '~/types/messages'
import type { Room } from '~/types/rooms'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessagesStore } from './messages'
import { useTemplatesStore } from './templates'

export const useRoomsStore = defineStore('rooms', () => {
  const rooms = ref<Room[]>([])
  const currentRoomId = ref<string | null>(null)
  const messagesStore = useMessagesStore()
  const templatesStore = useTemplatesStore()
  const router = useRouter()

  const currentRoom = computed(() => {
    return rooms.value.find(room => room.id === currentRoomId.value) || null
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

    rooms.value.push(room)
    setCurrentRoom(id)

    return room
  }

  function updateRoom(id: string, data: Partial<Omit<Room, 'id' | 'createdAt'>>) {
    const room = rooms.value.find(r => r.id === id)
    if (!room)
      return

    Object.assign(room, {
      ...data,
      updatedAt: Date.now(),
    })
  }

  function deleteRoom(id: string) {
    // Don't delete if it's the only room
    if (rooms.value.length <= 1)
      return

    const room = rooms.value.find(r => r.id === id)
    if (!room)
      return

    // Delete all messages in this room
    if (room.systemPromptId) {
      messagesStore.deleteSubtree(room.systemPromptId)
    }

    // Remove room from list
    rooms.value = rooms.value.filter(r => r.id !== id)

    // Set current room to another room if current one is deleted
    if (currentRoomId.value === id) {
      const firstRoom = rooms.value[0]
      if (firstRoom) {
        setCurrentRoom(firstRoom.id)
      }
    }
  }

  function setCurrentRoom(id: string) {
    const room = rooms.value.find(r => r.id === id)
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
    const room = rooms.value.find(r => r.id === roomId)
    if (!room || !room.systemPromptId)
      return null
    return messagesStore.getMessageById(room.systemPromptId)
  }

  // Initialize with a default room if none exists
  function initialize() {
    // Initialize templates first to ensure we have a default template
    templatesStore.initialize()

    if (rooms.value.length === 0) {
      createRoom('Default Chat')
    }
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
}, {
  persist: true,
})

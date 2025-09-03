import type { Room } from '~/types/rooms'
import { useLocalStorage } from '@vueuse/core'
import {
  formatDistanceToNow,
  isThisWeek,
  isToday,
  isYesterday,
} from 'date-fns'
import { enUS } from 'date-fns/locale'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRoomModel } from '~/models/rooms'
import { useMessagesStore } from './messages'

export const useRoomsStore = defineStore('rooms', () => {
  const route = useRoute()
  const roomModel = useRoomModel()
  const rooms = ref<Room[]>([])
  const currentRoomId = useLocalStorage<string | undefined>('flow-chat-current-room', undefined)
  const currentRoomIdFromRoute = (route.params as { id: string }).id
  watch(() => currentRoomIdFromRoute, (newId) => {
    if (newId) {
      setCurrentRoom(newId)
    }
  })

  const messagesStore = useMessagesStore()
  const router = useRouter()

  // Pure computed values
  const currentRoom = computed(() => rooms.value.find(room => room.id === currentRoomId.value) ?? null)

  // Business logic
  async function createRoom(name: string, templateId?: string) {
    // debugger
    const room = await roomModel.create(name, templateId)
    setCurrentRoom(room.id)

    rooms.value = await roomModel.getAll()

    return room
  }

  async function updateRoom(id: string, data: Partial<Omit<Room, 'id' | 'createdAt'>>) {
    const room = await roomModel.update(id, data)

    rooms.value = await roomModel.getAll()

    return room
  }

  async function deleteRoom(id: string) {
    const room = rooms.value.find(room => room.id === id)
    if (!room)
      return false

    await roomModel.destroy(id)

    // Handle message cleanup
    if (room.template_id) {
      messagesStore.deleteSubtree(room.template_id)
    }

    // Handle current room change
    if (currentRoomId.value === id) {
      const firstRoom = rooms.value[0]
      if (firstRoom) {
        setCurrentRoom(firstRoom.id)
      }
    }

    rooms.value = await roomModel.getAll()

    return true
  }

  async function setCurrentRoom(id: string) {
    if (id === currentRoomId.value)
      return true

    const room = rooms.value.find(room => room.id === id)
    if (!room)
      return false

    currentRoomId.value = id

    await router.replace(`/chat/${id}`)
    return true
  }

  function getRoomSystemPrompt(roomId: string) {
    const room = rooms.value.find(room => room.id === roomId)
    return (!room || !room.template_id)
      ? null
      : messagesStore.getMessageById(room.template_id)
  }

  async function initialize() {
    rooms.value = await roomModel.getAll()
    if (rooms.value.length === 0) {
      const room = await createRoom('Default Chat')
      return room
    }

    return rooms.value[rooms.value.length - 1]
  }

  interface GroupedRoom {
    title: string
    rooms: (Room & { relative_time: string })[]
  }

  const groupedRooms = computed<GroupedRoom[]>(() => {
    const groups: GroupedRoom[] = [
      { title: 'Today', rooms: [] },
      { title: 'Yesterday', rooms: [] },
      { title: 'This Week', rooms: [] },
      { title: 'Earlier', rooms: [] },
    ]

    rooms.value.forEach((room) => {
      const date = room.created_at
      const relativeTime = formatDistanceToNow(date, {
        addSuffix: true,
        locale: enUS,
      })

      const roomWithTime = {
        ...room,
        relative_time: relativeTime,
      }

      if (isToday(date)) {
        groups[0].rooms.push(roomWithTime)
      }
      else if (isYesterday(date)) {
        groups[1].rooms.push(roomWithTime)
      }
      else if (isThisWeek(date, { weekStartsOn: 1 })) {
        groups[2].rooms.push(roomWithTime)
      }
      else {
        groups[3].rooms.push(roomWithTime)
      }
    })

    groups.forEach((group) => {
      group.rooms.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    })

    return groups.filter(group => group.rooms.length > 0)
  })

  return {
    // State
    rooms,
    groupedRooms,
    currentRoomId,
    currentRoom,

    // Actions
    createRoom,
    updateRoom,
    deleteRoom,
    setCurrentRoom,
    getRoomSystemPrompt,
    initialize,
  }
})

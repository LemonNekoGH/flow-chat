import type { Agent, Room } from '~/types/messages'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useRoomsStore = defineStore('rooms', () => {
  const rooms = ref<Room[]>([])
  const agents = ref<Agent[]>([])
  const activeRoomId = ref<string | null>(null)
  const defaultAgentId = ref<string | null>(null)

  // Initialize with a default room if none exists
  function initializeDefaultRoom() {
    if (rooms.value.length === 0) {
      const defaultRoom = createRoom('Default Chat', '')
      setActiveRoom(defaultRoom.id)
      return defaultRoom
    }

    if (!activeRoomId.value && rooms.value.length > 0) {
      setActiveRoom(rooms.value[0].id)
    }

    return getRoomById(activeRoomId.value)
  }

  // Room operations
  function createRoom(name: string, systemPrompt: string, agentId?: string): Room {
    const id = crypto.randomUUID()
    const room: Room = {
      id,
      name,
      systemPrompt,
      agentId,
      timestamp: Date.now(),
    }

    rooms.value.push(room)
    return room
  }

  // Create a chat from template
  function createRoomFromTemplate(agentId: string): Room | null {
    const agent = getAgentById(agentId)
    if (!agent)
      return null

    const room = createRoom(agent.name, agent.systemPrompt, agentId)
    setActiveRoom(room.id)
    return room
  }

  function updateRoom(id: string, updates: Partial<Omit<Room, 'id' | 'timestamp'>>) {
    const room = getRoomById(id)
    if (!room)
      return null

    Object.assign(room, updates)
    return room
  }

  function deleteRoom(id: string) {
    const index = rooms.value.findIndex(room => room.id === id)
    if (index === -1)
      return false

    rooms.value.splice(index, 1)

    // If we deleted the active room, set a new active room
    if (activeRoomId.value === id) {
      activeRoomId.value = rooms.value.length > 0 ? rooms.value[0].id : null
    }

    return true
  }

  function getRoomById(id?: string | null) {
    return id ? rooms.value.find(room => room.id === id) : null
  }

  function setActiveRoom(id: string) {
    activeRoomId.value = id
  }

  function updateRoomLastActivity(id: string) {
    const room = getRoomById(id)
    if (room) {
      room.lastMessageTimestamp = Date.now()
    }
  }

  // Agent operations
  function createAgent(name: string, systemPrompt: string): Agent {
    const id = crypto.randomUUID()
    const agent: Agent = {
      id,
      name,
      systemPrompt,
    }

    agents.value.push(agent)
    // Set as default if it's the first agent
    if (agents.value.length === 1 && defaultAgentId.value === null) {
      setDefaultAgent(id)
    }
    return agent
  }

  function updateAgent(id: string, updates: Partial<Omit<Agent, 'id'>>) {
    const agent = getAgentById(id)
    if (!agent)
      return null

    Object.assign(agent, updates)
    return agent
  }

  function deleteAgent(id: string) {
    const index = agents.value.findIndex(agent => agent.id === id)
    if (index === -1)
      return false

    agents.value.splice(index, 1)
    return true
  }

  function getAgentById(id: string) {
    return agents.value.find(agent => agent.id === id)
  }

  // Set default agent
  function setDefaultAgent(id: string): boolean {
    const agent = getAgentById(id)
    if (!agent)
      return false

    defaultAgentId.value = id
    return true
  }

  // Get default agent
  function getDefaultAgent(): Agent | null {
    if (!defaultAgentId.value)
      return null
    const agent = getAgentById(defaultAgentId.value)
    return agent || null
  }

  // Initialize with default agents if none exist
  function initializeDefaultAgents() {
    if (agents.value.length === 0) {
      const generalAgent = createAgent('General Assistant', 'You are a helpful assistant.')
      createAgent('Code Assistant', 'You are a coding assistant that helps with programming tasks.')
      createAgent('Creative Writer', 'You are a creative writing assistant that helps with storytelling and content creation.')

      // Set the general assistant as default
      setDefaultAgent(generalAgent.id)
    }
  }

  return {
    rooms,
    agents,
    activeRoomId,
    defaultAgentId,

    initializeDefaultRoom,
    initializeDefaultAgents,

    createRoom,
    createRoomFromTemplate,
    updateRoom,
    deleteRoom,
    getRoomById,
    setActiveRoom,
    updateRoomLastActivity,

    createAgent,
    updateAgent,
    deleteAgent,
    getAgentById,
    setDefaultAgent,
    getDefaultAgent,
  }
}, {
  persist: true,
})

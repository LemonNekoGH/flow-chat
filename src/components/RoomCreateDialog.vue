<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import Button from '~/components/ui/button/Button.vue'
import { useMessagesStore } from '~/stores/messages'
import { useRoomsStore } from '~/stores/rooms'

const props = defineProps<{
  editRoomId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const roomsStore = useRoomsStore()
const messagesStore = useMessagesStore()
const { agents } = storeToRefs(roomsStore)

// Initialize with default agents if none exist
roomsStore.initializeDefaultAgents()

// Setup form data
const roomName = ref('')
const systemPrompt = ref('')
const selectedAgentId = ref<string | null>(null)

// If editing, load the existing room data
if (props.editRoomId) {
  const room = roomsStore.getRoomById(props.editRoomId)
  if (room) {
    roomName.value = room.name
    systemPrompt.value = room.systemPrompt
    selectedAgentId.value = room.agentId || null
  }
}

// Update system prompt when agent changes
function onAgentChange(event: Event) {
  const select = event.target as HTMLSelectElement
  const agentId = select.value
  selectedAgentId.value = agentId
  const agent = roomsStore.getAgentById(agentId)
  if (agent) {
    systemPrompt.value = agent.systemPrompt
  }
}

function createOrUpdateRoom() {
  if (!roomName.value.trim()) {
    toast.error('Please enter a chat name')
    return
  }

  if (props.editRoomId) {
    // Update existing room
    roomsStore.updateRoom(props.editRoomId, {
      name: roomName.value,
      systemPrompt: systemPrompt.value,
      agentId: selectedAgentId.value || undefined,
    })
    toast.success('Chat updated successfully')
  }
  else {
    // Create new room
    const room = roomsStore.createRoom(
      roomName.value,
      systemPrompt.value,
      selectedAgentId.value || undefined,
    )

    roomsStore.setActiveRoom(room.id)
    messagesStore.initializeRoomWithSystemPrompt(room.id)
    toast.success('New chat created')
  }

  emit('close')
}

function close() {
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center bg-black/50">
    <div class="max-h-[90vh] max-w-[90%] w-[500px] overflow-y-auto rounded-lg bg-white p-6 dark:bg-zinc-900">
      <h2 class="mb-4 text-2xl font-bold">
        {{ props.editRoomId ? 'Edit Chat' : 'New Chat' }}
      </h2>

      <div class="space-y-4">
        <div class="flex flex-col gap-2">
          <label for="room-name" class="font-medium">Chat Name</label>
          <input
            id="room-name"
            v-model="roomName"
            type="text"
            placeholder="Enter chat name"
            class="w-full border border-zinc-200 rounded-md bg-transparent px-3 py-2 dark:border-zinc-700"
          >
        </div>

        <div class="flex flex-col gap-2">
          <label for="agent-select" class="font-medium">Select Template (Optional)</label>
          <select
            id="agent-select"
            v-model="selectedAgentId"
            class="w-full border border-zinc-200 rounded-md bg-transparent px-3 py-2 dark:border-zinc-700"
            @change="onAgentChange"
          >
            <option :value="null">
              No Template
            </option>
            <option
              v-for="agent in agents"
              :key="agent.id"
              :value="agent.id"
            >
              {{ agent.name }}
            </option>
          </select>
        </div>

        <div class="flex flex-col gap-2">
          <label for="system-prompt" class="font-medium">System Prompt</label>
          <textarea
            id="system-prompt"
            v-model="systemPrompt"
            placeholder="Enter system prompt..."
            class="w-full resize-y border border-zinc-200 rounded-md bg-transparent px-3 py-2 dark:border-zinc-700"
            rows="5"
          />
        </div>
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <Button variant="outline" @click="close">
          <i class="i-lucide-x mr-2" />
          Cancel
        </Button>
        <Button variant="default" @click="createOrUpdateRoom">
          <i class="i-lucide-save mr-2" />
          {{ props.editRoomId ? 'Update' : 'Create' }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import Button from '~/components/ui/button/Button.vue'
import { useRoomsStore } from '~/stores/rooms'

const roomsStore = useRoomsStore()
const { agents } = storeToRefs(roomsStore)

// Initialize with default agents if none exist
roomsStore.initializeDefaultAgents()

// Edit state
const isEditing = ref(false)
const editAgentId = ref<string | null>(null)
const agentName = ref('')
const agentPrompt = ref('')

function startCreate() {
  isEditing.value = true
  editAgentId.value = null
  agentName.value = ''
  agentPrompt.value = ''
}

function startEdit(id: string) {
  const agent = roomsStore.getAgentById(id)
  if (!agent)
    return

  isEditing.value = true
  editAgentId.value = id
  agentName.value = agent.name
  agentPrompt.value = agent.systemPrompt
}

function saveAgent() {
  if (!agentName.value.trim()) {
    toast.error('Please enter a template name')
    return
  }

  if (editAgentId.value) {
    roomsStore.updateAgent(editAgentId.value, {
      name: agentName.value,
      systemPrompt: agentPrompt.value,
    })
  }
  else {
    roomsStore.createAgent(agentName.value, agentPrompt.value)
  }

  cancelEdit()
}

function deleteAgent(id: string) {
  toast.promise(
    new Promise((resolve) => {
      roomsStore.deleteAgent(id)
      resolve(true)
    }),
    {
      loading: 'Deleting template...',
      success: 'Template deleted successfully',
      error: 'Failed to delete template',
    },
  )
}

function cancelEdit() {
  isEditing.value = false
  editAgentId.value = null
}
</script>

<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-bold">
        Prompt Templates
      </h2>
      <Button v-if="!isEditing" variant="outline" @click="startCreate">
        <i class="i-lucide-plus mr-2" />
        Create Template
      </Button>
    </div>

    <div v-if="isEditing" class="border rounded-lg p-4 bg-card">
      <div class="space-y-4">
        <div class="space-y-2">
          <label for="agent-name" class="font-medium">Template Name</label>
          <input
            id="agent-name"
            v-model="agentName"
            type="text"
            placeholder="Enter template name"
            class="w-full px-3 py-2 rounded-md border bg-background"
          >
        </div>

        <div class="space-y-2">
          <label for="agent-prompt" class="font-medium">System Prompt</label>
          <textarea
            id="agent-prompt"
            v-model="agentPrompt"
            placeholder="Enter system prompt..."
            class="w-full px-3 py-2 rounded-md border bg-background min-h-[120px]"
            rows="5"
          />
        </div>

        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="cancelEdit">
            Cancel
          </Button>
          <Button variant="default" @click="saveAgent">
            Save
          </Button>
        </div>
      </div>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="agent in agents"
        :key="agent.id"
        class="flex justify-between items-start p-3 rounded-lg border bg-card"
      >
        <div class="space-y-1">
          <div class="font-medium">
            {{ agent.name }}
          </div>
          <div class="text-sm text-muted-foreground">
            {{ agent.systemPrompt.slice(0, 50) }}{{ agent.systemPrompt.length > 50 ? '...' : '' }}
          </div>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" size="sm" @click="startEdit(agent.id)">
            <i class="i-lucide-pencil mr-1" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" @click="deleteAgent(agent.id)">
            <i class="i-lucide-trash mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

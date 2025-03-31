<script setup lang="ts">
import { storeToRefs } from 'pinia'
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogTrigger,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'radix-vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import Button from '~/components/ui/button/Button.vue'
import { useRoomsStore } from '~/stores/rooms'

const router = useRouter()
const roomsStore = useRoomsStore()
const { agents, defaultAgentId } = storeToRefs(roomsStore)

// Initialize with default agents if none exist
roomsStore.initializeDefaultAgents()

// Edit state
const editAgentId = ref<string | null>(null)
const agentName = ref('')
const agentPrompt = ref('')
const searchQuery = ref('')
const deleteAgentId = ref<string | null>(null)

// Filtered agents based on search query
const filteredAgents = computed(() => {
  if (!searchQuery.value.trim())
    return agents.value

  const query = searchQuery.value.toLowerCase()
  return agents.value.filter(agent =>
    agent.name.toLowerCase().includes(query)
    || agent.systemPrompt.toLowerCase().includes(query),
  )
})

function startCreate() {
  editAgentId.value = null
  agentName.value = ''
  agentPrompt.value = ''
}

function startEdit(id: string) {
  const agent = roomsStore.getAgentById(id)
  if (!agent)
    return

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
    toast.success('Template updated')
  }
  else {
    roomsStore.createAgent(agentName.value, agentPrompt.value)
    toast.success('Template created')
  }

  // Reset form state
  resetFormState()
}

function resetFormState() {
  editAgentId.value = null
  agentName.value = ''
  agentPrompt.value = ''
}

function confirmDeleteAgent() {
  if (deleteAgentId.value) {
    roomsStore.deleteAgent(deleteAgentId.value)
    toast.success('Template deleted')
    deleteAgentId.value = null
  }
}

// New functions for creating chat and setting default template
function createChatFromTemplate(id: string) {
  const room = roomsStore.createRoomFromTemplate(id)
  if (room) {
    toast.success('Chat created')
    router.push(`/chat/${room.id}`)
  }
  else {
    toast.error('Failed to create chat')
  }
}

function setAsDefault(id: string) {
  if (roomsStore.setDefaultAgent(id)) {
    toast.success('Set as default template')
  }
  else {
    toast.error('Failed to set default template')
  }
}

function isDefaultAgent(id: string): boolean {
  return defaultAgentId.value === id
}
</script>

<template>
  <div class="mx-auto max-w-4xl p-2 sm:p-4">
    <!-- Header Section -->
    <div class="mb-4">
      <div class="mb-3 flex items-center justify-between">
        <h1 class="text-xl font-bold">
          Prompt Templates
        </h1>

        <!-- Create Template Dialog -->
        <DialogRoot>
          <DialogTrigger as-child>
            <Button variant="default" size="sm" class="h-8 w-8 p-0" @click="startCreate">
              <i class="i-lucide-plus h-4 w-4" />
            </Button>
          </DialogTrigger>

          <Teleport to="body">
            <DialogPortal>
              <DialogOverlay class="fixed inset-0 z-50 data-[state=closed]:animate-out data-[state=open]:animate-in bg-black/50 data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
              <DialogContent class="data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%] fixed left-1/2 top-1/2 z-50 max-w-lg w-full data-[state=closed]:animate-out data-[state=open]:animate-in border rounded-lg bg-card p-6 shadow-lg -translate-x-1/2 -translate-y-1/2 data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-left-1/2 data-[state=closed]:slide-out-to-left-1/2">
                <DialogTitle class="text-xl font-semibold">
                  Create New Template
                </DialogTitle>
                <DialogDescription class="mt-2 text-sm text-muted-foreground">
                  Create a new AI assistant prompt template
                </DialogDescription>

                <!-- Form Content -->
                <div class="mt-4 space-y-4">
                  <div class="space-y-2">
                    <label for="agent-name-create" class="block font-medium">Template Name</label>
                    <input
                      id="agent-name-create"
                      v-model="agentName"
                      type="text"
                      placeholder="Enter template name"
                      class="w-full border rounded-md bg-background px-3 py-2"
                      autofocus
                    >
                  </div>

                  <div class="space-y-2">
                    <label for="agent-prompt-create" class="block font-medium">System Prompt</label>
                    <div class="relative">
                      <textarea
                        id="agent-prompt-create"
                        v-model="agentPrompt"
                        placeholder="Enter system prompt..."
                        class="min-h-[200px] w-full resize-y border rounded-md bg-background px-3 py-2"
                        rows="8"
                      />
                    </div>
                    <p class="text-xs text-muted-foreground">
                      Enter the system prompt for the AI assistant here. This will determine how the AI behaves.
                    </p>
                  </div>

                  <div class="flex justify-end gap-2 pt-2">
                    <DialogClose as-child>
                      <Button variant="outline" @click="resetFormState">
                        Cancel
                      </Button>
                    </DialogClose>
                    <DialogClose as-child>
                      <Button variant="default" @click="saveAgent">
                        Save
                      </Button>
                    </DialogClose>
                  </div>
                </div>
              </DialogContent>
            </DialogPortal>
          </Teleport>
        </DialogRoot>
      </div>

      <!-- Search Bar -->
      <div class="relative">
        <i class="i-lucide-search absolute left-2 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search templates..."
          class="h-9 w-full border rounded-md bg-background py-1.5 pl-8 pr-8 text-sm"
        >
        <i
          v-if="searchQuery"
          class="i-lucide-x absolute right-2 top-1/2 h-4 w-4 cursor-pointer text-muted-foreground -translate-y-1/2"
          @click="searchQuery = ''"
        />
      </div>
    </div>

    <!-- Template List -->
    <div class="space-y-4">
      <div v-if="filteredAgents.length === 0" class="py-8 text-center">
        <div class="i-lucide-search-x mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p class="text-muted-foreground">
          No matching templates found
        </p>
      </div>

      <div
        v-for="agent in filteredAgents"
        :key="agent.id"
        class="group border rounded-lg bg-card p-3 transition-all duration-200 hover:shadow-sm"
      >
        <!-- Template header with badge -->
        <div class="mb-2 flex items-center justify-between">
          <div class="flex flex-col">
            <h3 class="text-base font-semibold transition-colors group-hover:text-primary">
              {{ agent.name }}
            </h3>

            <div>
              <span v-if="isDefaultAgent(agent.id)" class="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
                Default
              </span>
            </div>
          </div>

          <!-- Action icons -->
          <div class="flex gap-1 opacity-80 transition-opacity group-hover:opacity-100">
            <!-- Edit Dialog -->
            <DialogRoot>
              <DialogTrigger as-child>
                <Button variant="ghost" size="icon" class="h-8 w-8" @click="startEdit(agent.id)">
                  <i class="i-lucide-pencil h-4 w-4" />
                </Button>
              </DialogTrigger>

              <Teleport to="body">
                <DialogPortal>
                  <DialogOverlay class="fixed inset-0 z-50 data-[state=closed]:animate-out data-[state=open]:animate-in bg-black/50 data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
                  <DialogContent class="data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%] fixed left-1/2 top-1/2 z-50 max-w-lg w-full data-[state=closed]:animate-out data-[state=open]:animate-in border rounded-lg bg-card p-6 shadow-lg -translate-x-1/2 -translate-y-1/2 data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-left-1/2 data-[state=closed]:slide-out-to-left-1/2">
                    <DialogTitle class="text-xl font-semibold">
                      Edit Template
                    </DialogTitle>
                    <DialogDescription class="mt-2 text-sm text-muted-foreground">
                      Edit "{{ agent.name }}" template
                    </DialogDescription>

                    <!-- Form Content -->
                    <div class="mt-4 space-y-4">
                      <div class="space-y-2">
                        <label for="agent-name-edit" class="block font-medium">Template Name</label>
                        <input
                          id="agent-name-edit"
                          v-model="agentName"
                          type="text"
                          placeholder="Enter template name"
                          class="w-full border rounded-md bg-background px-3 py-2"
                          autofocus
                        >
                      </div>

                      <div class="space-y-2">
                        <label for="agent-prompt-edit" class="block font-medium">System Prompt</label>
                        <div class="relative">
                          <textarea
                            id="agent-prompt-edit"
                            v-model="agentPrompt"
                            placeholder="Enter system prompt..."
                            class="min-h-[200px] w-full resize-y border rounded-md bg-background px-3 py-2"
                            rows="8"
                          />
                        </div>
                        <p class="text-xs text-muted-foreground">
                          Enter the system prompt for the AI assistant here. This will determine how the AI behaves.
                        </p>
                      </div>

                      <div class="flex justify-end gap-2 pt-2">
                        <DialogClose as-child>
                          <Button variant="outline" @click="resetFormState">
                            Cancel
                          </Button>
                        </DialogClose>
                        <DialogClose as-child>
                          <Button variant="default" @click="saveAgent">
                            Save
                          </Button>
                        </DialogClose>
                      </div>
                    </div>
                  </DialogContent>
                </DialogPortal>
              </Teleport>
            </DialogRoot>

            <!-- Alert Dialog for Delete Confirmation -->
            <AlertDialogRoot>
              <AlertDialogTrigger as-child>
                <Button variant="ghost" size="icon" class="h-8 w-8 text-destructive hover:text-destructive/90" @click="deleteAgentId = agent.id">
                  <i class="i-lucide-trash h-4 w-4" />
                </Button>
              </AlertDialogTrigger>

              <Teleport to="body">
                <AlertDialogPortal>
                  <AlertDialogOverlay class="fixed inset-0 z-50 data-[state=closed]:animate-out data-[state=open]:animate-in bg-black/50 data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
                  <AlertDialogContent class="data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%] fixed left-1/2 top-1/2 z-50 max-w-md data-[state=closed]:animate-out data-[state=open]:animate-in border rounded-lg bg-card p-6 shadow-lg -translate-x-1/2 -translate-y-1/2 data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-left-1/2 data-[state=closed]:slide-out-to-left-1/2">
                    <AlertDialogTitle class="text-lg font-semibold">
                      Confirm Delete
                    </AlertDialogTitle>
                    <AlertDialogDescription class="mt-2 text-sm text-muted-foreground">
                      Are you sure you want to delete template "{{ agent.name }}"? This action cannot be undone.
                    </AlertDialogDescription>
                    <div class="mt-4 flex justify-end gap-3">
                      <AlertDialogCancel as-child>
                        <Button variant="outline" size="sm">
                          Cancel
                        </Button>
                      </AlertDialogCancel>
                      <AlertDialogAction as-child>
                        <Button variant="destructive" size="sm" @click="confirmDeleteAgent">
                          Delete
                        </Button>
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialogPortal>
              </Teleport>
            </AlertDialogRoot>
          </div>
        </div>

        <!-- Template description -->
        <p class="line-clamp-2 mb-2 text-sm text-muted-foreground">
          {{ agent.systemPrompt }}
        </p>

        <!-- Action buttons -->
        <div class="justify- mt-2 flex flex-wrap gap-2">
          <Button
            variant="default"
            size="sm"
            class="h-8 px-2 text-xs"
            @click="createChatFromTemplate(agent.id)"
          >
            <i class="i-lucide-message-square h-3.5 w-3.5" />
          </Button>
          <Button
            v-if="!isDefaultAgent(agent.id)"
            variant="outline"
            size="sm"
            class="h-8 px-2 text-xs"
            @click="setAsDefault(agent.id)"
          >
            <i class="i-lucide-star h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

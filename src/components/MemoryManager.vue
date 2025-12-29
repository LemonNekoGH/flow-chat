<script setup lang="ts">
import type { Memory } from '~/types/memory'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useMemoryModel } from '~/models/memories'
import { useRoomsStore } from '~/stores/rooms'
import Button from './ui/button/Button.vue'

const memoryModel = useMemoryModel()
const roomsStore = useRoomsStore()
const { rooms } = storeToRefs(roomsStore)
const memories = ref<Memory[]>([])
const isLoading = ref(false)
const filterScope = ref<'all' | 'global' | 'room'>('all')

const filteredMemories = computed(() => {
  if (filterScope.value === 'all')
    return memories.value
  return memories.value.filter(m => m.scope === filterScope.value)
})

const globalMemories = computed(() => memories.value.filter(m => m.scope === 'global'))
const roomMemories = computed(() => memories.value.filter(m => m.scope === 'room'))

async function loadMemories() {
  isLoading.value = true
  try {
    memories.value = await memoryModel.getAll()
  }
  finally {
    isLoading.value = false
  }
}

async function deleteMemory(id: string) {
  await memoryModel.deleteById(id)
  await loadMemories()
}

function getRoomName(roomId: string | null) {
  if (!roomId)
    return null
  const room = rooms.value.find(r => r.id === roomId)
  return room?.name ?? roomId
}

onMounted(() => {
  loadMemories()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">
        Memories
      </h2>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" :class="{ 'bg-primary/10': filterScope === 'all' }" @click="filterScope = 'all'">
          All ({{ memories.length }})
        </Button>
        <Button variant="outline" size="sm" :class="{ 'bg-primary/10': filterScope === 'global' }" @click="filterScope = 'global'">
          Global ({{ globalMemories.length }})
        </Button>
        <Button variant="outline" size="sm" :class="{ 'bg-primary/10': filterScope === 'room' }" @click="filterScope = 'room'">
          Room ({{ roomMemories.length }})
        </Button>
        <Button variant="outline" size="sm" @click="loadMemories">
          Refresh
        </Button>
      </div>
    </div>

    <div v-if="isLoading" class="py-4 text-center text-gray-500">
      Loading...
    </div>

    <div v-else-if="filteredMemories.length === 0" class="py-8 text-center text-gray-500">
      No memories found
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="memory in filteredMemories"
        :key="memory.id"
        class="border rounded-lg bg-gray-50 p-4 dark:bg-gray-800"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 space-y-2">
            <div class="flex items-center gap-2">
              <span
                class="rounded px-2 py-1 text-xs"
                :class="memory.scope === 'global' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'"
              >
                {{ memory.scope }}
              </span>
              <span v-if="memory.room_id" class="text-xs text-gray-500">
                Room: {{ getRoomName(memory.room_id) }}
              </span>
            </div>
            <p class="text-sm">
              {{ memory.content }}
            </p>
            <div v-if="memory.tags && memory.tags.length > 0" class="flex flex-wrap gap-1">
              <span
                v-for="tag in memory.tags"
                :key="tag"
                class="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              >
                {{ tag }}
              </span>
            </div>
            <div class="text-xs text-gray-500">
              Created: {{ new Date(memory.created_at).toLocaleString() }}
            </div>
          </div>
          <Button variant="outline" size="sm" class="text-red-600 hover:text-red-700" @click="deleteMemory(memory.id)">
            Delete
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

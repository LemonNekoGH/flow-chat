<script setup lang="ts">
import type { Message } from '~/types/messages'
import { watchDebounced } from '@vueuse/core'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import { useMessageModel } from '~/models/messages'
import { useDatabaseStore } from '~/stores/database'
import { useRoomsStore } from '~/stores/rooms'
import { useRoomViewStateStore } from '~/stores/roomViewState'

const router = useRouter()
const dbStore = useDatabaseStore()
const roomsStore = useRoomsStore()
const messageModel = useMessageModel()
const roomViewStateStore = useRoomViewStateStore()

const searchKeyword = ref('')
const searchResults = ref<Message[]>([])
const isSearching = ref(false)
const searchScope = ref<'all' | 'current'>('all')

const hasResults = computed(() => searchResults.value.length > 0)
const hasKeyword = computed(() => searchKeyword.value.trim().length > 0)

async function performSearch() {
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    searchResults.value = []
    return
  }

  isSearching.value = true
  try {
    await dbStore.waitForDbInitialized()

    const roomId = searchScope.value === 'current' ? roomsStore.currentRoomId : undefined
    const results = await messageModel.searchByContent(keyword, roomId || undefined)
    searchResults.value = results as Message[]
  }
  catch (error) {
    console.error('Search error:', error)
    searchResults.value = []
  }
  finally {
    isSearching.value = false
  }
}

watchDebounced(searchKeyword, (newValue) => {
  if (newValue.trim()) {
    performSearch()
  }
  else {
    searchResults.value = []
  }
}, { debounce: 300 })

// Watch for search scope changes
watch(searchScope, () => {
  if (searchKeyword.value.trim()) {
    performSearch()
  }
})

function getRoomName(roomId: string | null) {
  if (!roomId)
    return 'Unknown'
  const room = roomsStore.rooms.find(r => r.id === roomId)
  return room?.name || 'Unknown'
}

function getMessagePreview(content: string, maxLength = 100) {
  if (content.length <= maxLength)
    return content
  return `${content.substring(0, maxLength)}...`
}

async function navigateToMessage(message: Message) {
  if (!message.room_id)
    return

  await roomsStore.setCurrentRoom(message.room_id)
  await router.push(`/chat/${message.room_id}?messageId=${message.id}`)

  roomViewStateStore.selectedMessageId = message.id
  roomViewStateStore.setCenterToNode(message.id)
}

onMounted(async () => {
  await dbStore.waitForDbInitialized()
})
</script>

<template>
  <div class="w-full flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-medium">
        Search
      </h2>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex gap-2">
        <Input
          v-model="searchKeyword"
          placeholder="Search message content..."
          class="flex-1"
          @keyup.enter="performSearch"
        />
        <Button
          variant="outline"
          :disabled="!hasKeyword || isSearching"
          @click="performSearch"
        >
          <div class="i-carbon-search text-lg" />
        </Button>
      </div>

      <div class="flex gap-2 text-xs">
        <Button
          variant="ghost"
          size="sm"
          :class="searchScope === 'all' ? 'bg-primary/10' : ''"
          @click="searchScope = 'all'"
        >
          All rooms
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :class="searchScope === 'current' ? 'bg-primary/10' : ''"
          :disabled="!roomsStore.currentRoomId"
          @click="searchScope = 'current'"
        >
          Current room
        </Button>
      </div>
    </div>

    <div v-if="isSearching" class="py-4 text-center text-sm text-muted-foreground">
      Searching...
    </div>

    <div v-else-if="hasKeyword && !hasResults" class="py-4 text-center text-sm text-muted-foreground">
      No matching messages found
    </div>

    <div v-if="hasResults" class="mt-2 max-h-[400px] flex flex-col gap-2 overflow-y-auto">
      <div
        v-for="message in searchResults"
        :key="message.id"
        class="group cursor-pointer rounded-md bg-white px-3 py-2 transition-colors dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-900"
        @click="navigateToMessage(message)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <div class="mb-1 flex items-center gap-2">
              <span class="text-xs text-muted-foreground font-medium">
                {{ getRoomName(message.room_id) }}
              </span>
              <span class="text-xs text-muted-foreground">
                {{ message.role === 'user' ? 'User' : message.role === 'assistant' ? 'Assistant' : 'System' }}
              </span>
            </div>
            <div class="line-clamp-2 text-sm">
              {{ getMessagePreview(message.content) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

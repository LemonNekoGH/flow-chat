<script setup lang="ts">
import type { Message } from '~/types/messages'
import { useLogg } from '@guiiai/logg'
import { defineInvoke } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/webworkers'
import { useLocalStorage, watchDebounced } from '@vueuse/core'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from '~/components/ui/button/Button.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogDescription from '~/components/ui/dialog/DialogDescription.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import Input from '~/components/ui/input/Input.vue'
import { embeddingExtractInvoke, embeddingLoadModelInvoke } from '~/events/embedding-worker'
import { useMessageModel } from '~/models/messages'
import { useDatabaseStore } from '~/stores/database'
import { useRoomsStore } from '~/stores/rooms'
import { useRoomViewStateStore } from '~/stores/roomViewState'
import EmbeddingWorker from '~/workers/embedding-worker?worker'

const props = defineProps<{
  open?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const logger = useLogg('search-view')

const isOpen = computed({
  get: () => props.open ?? false,
  set: value => emit('update:open', value),
})

const context = createContext(new EmbeddingWorker()).context
const embeddingLoadModel = defineInvoke(context, embeddingLoadModelInvoke)
const embeddingExtract = defineInvoke(context, embeddingExtractInvoke)

const router = useRouter()
const dbStore = useDatabaseStore()
const roomsStore = useRoomsStore()
const roomViewStateStore = useRoomViewStateStore()
const messageModel = useMessageModel()

// Search state enum
enum SearchState {
  Idle = 'idle',
  LoadingModel = 'loadingModel',
  EmbeddingQuery = 'embeddingQuery',
  EmbeddingMessages = 'embeddingMessages',
  Searching = 'searching',
}

const searchState = ref<SearchState>(SearchState.Idle)
const searchKeyword = ref('')
const searchResults = ref<(Message & { similarity: number })[]>([])
const embeddingProgress = ref({ current: 0, total: 0 })
const searchScope = ref<'all' | 'current'>('all')
const searchInputWrapperRef = ref<HTMLElement | null>(null)
const isNavigating = ref(false) // Flag to track if closing due to navigation

// Search history stored in localStorage
const searchHistory = useLocalStorage<string[]>('flow-chat-search-history', [])
const MAX_HISTORY_LENGTH = 10

const hasResults = computed(() => searchResults.value.length > 0)
const hasKeyword = computed(() => searchKeyword.value.trim().length > 0)
const isSearching = computed(() => searchState.value !== SearchState.Idle)
const showHistory = computed(() => !hasKeyword.value && searchState.value === SearchState.Idle && searchHistory.value.length > 0)

async function performSearch() {
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    searchResults.value = []
    searchState.value = SearchState.Idle
    return
  }

  try {
    await dbStore.waitForDbInitialized()

    // Step 1: Load embedding model
    searchState.value = SearchState.LoadingModel
    await embeddingLoadModel()

    // Step 2: Embed the search query
    searchState.value = SearchState.EmbeddingQuery
    const embeddingToSearch = await embeddingExtract({ text: keyword, instruction: 'Instruct: Given a user query, retrieve relevant passages that answer the query\nQuery' })

    // Step 3: Embed unembedded messages if any
    const messagesNotEmbedded = await messageModel.notEmbeddedMessages()
    const messageContentsNotEmbedded = messagesNotEmbedded.map(m => m.content)
    if (messageContentsNotEmbedded.length > 0) {
      searchState.value = SearchState.EmbeddingMessages
      embeddingProgress.value = { current: 0, total: messageContentsNotEmbedded.length }

      const embeddings = await embeddingExtract({ text: messageContentsNotEmbedded })
      embeddingProgress.value.current = messageContentsNotEmbedded.length

      const valueToInsert = embeddings.map((it, index) => {
        const msg = messagesNotEmbedded[index]
        return { id: msg.id, embedding: it }
      })
      await Promise.all(valueToInsert.map(v => messageModel.updateEmbedding(v.id, v.embedding)))
      logger.debug('Embedded messages', valueToInsert.map(v => v.id))

      embeddingProgress.value = { current: 0, total: 0 }
    }

    // Step 4: Perform vector similarity search
    searchState.value = SearchState.Searching
    const results = await messageModel.vectorSimilaritySearch(embeddingToSearch[0], 10)
    searchResults.value = results as (Message & { similarity: number })[]

    // Step 5: Complete
    searchState.value = SearchState.Idle
  }
  catch (error) {
    console.error('Search error:', error)
    searchResults.value = []
    searchState.value = SearchState.Idle
  }
}

function addToHistory(keyword: string) {
  // Remove if already exists
  const index = searchHistory.value.indexOf(keyword)
  if (index > -1) {
    searchHistory.value.splice(index, 1)
  }
  // Add to beginning
  searchHistory.value.unshift(keyword)
  // Keep only the most recent MAX_HISTORY_LENGTH items
  if (searchHistory.value.length > MAX_HISTORY_LENGTH) {
    searchHistory.value = searchHistory.value.slice(0, MAX_HISTORY_LENGTH)
  }
}

function selectHistoryItem(keyword: string) {
  searchKeyword.value = keyword
  performSearch()
}

function clearHistory() {
  searchHistory.value = []
}

const roleMap: Record<string, string> = {
  user: 'User',
  assistant: 'Assistant',
  system: 'System',
}

function formatRole(role: string): string {
  return roleMap[role] ?? 'Unknown'
}

watchDebounced(searchKeyword, (newValue) => {
  if (searchState.value !== SearchState.Idle) {
    return
  }
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

function formatSimilarity(similarity: number): string {
  return `${(similarity * 100).toFixed(1)}%`
}

async function navigateToMessage(message: Message) {
  if (!message.room_id)
    return

  // Save search keyword to history when user clicks on a result
  const keyword = searchKeyword.value.trim()
  if (keyword) {
    addToHistory(keyword)
  }

  // Set flag to indicate we're navigating, so we don't clear search results
  isNavigating.value = true
  await roomsStore.setCurrentRoom(message.room_id)
  await router.push(`/chat/${message.room_id}?messageId=${message.id}`)

  roomViewStateStore.selectedMessageId = message.id
  roomViewStateStore.setCenterToNode(message.id)
  isOpen.value = false
  // Reset flag after a short delay
  setTimeout(() => {
    isNavigating.value = false
  }, 100)
}

// Focus input when dialog opens
watch(isOpen, async (newValue) => {
  if (newValue) {
    await nextTick()
    // Find the input element within the wrapper
    const inputEl = searchInputWrapperRef.value?.querySelector('input') as HTMLInputElement | null
    if (inputEl) {
      inputEl.focus()
    }
  }
  else {
    // Only clear search when user manually closes the dialog, not when navigating
    if (!isNavigating.value) {
      searchKeyword.value = ''
      searchResults.value = []
    }
  }
})

onMounted(async () => {
  await dbStore.waitForDbInitialized()
})
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-2xl w-full gap-0 p-0">
      <div class="flex flex-col gap-4 p-6">
        <DialogTitle class="sr-only">
          Search Messages
        </DialogTitle>
        <DialogDescription class="sr-only">
          Search through your message history using semantic search
        </DialogDescription>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            Search Messages
          </h2>
        </div>

        <div class="flex flex-col gap-3">
          <div class="flex gap-2">
            <div ref="searchInputWrapperRef" class="flex-1">
              <Input
                v-model="searchKeyword"
                placeholder="Search message content..."
                class="w-full text-base"
                @keyup.enter="performSearch"
              />
            </div>
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
      </div>

      <div class="border-t border-border px-6 py-6">
        <div v-if="searchState !== SearchState.Idle" class="flex flex-col items-center gap-3 py-8 text-sm text-muted-foreground">
          <div v-if="searchState === SearchState.LoadingModel" class="flex items-center gap-2">
            <div class="i-carbon-circle-dash animate-spin text-lg" />
            <span>Loading embedding model...</span>
          </div>
          <div v-else-if="searchState === SearchState.EmbeddingQuery" class="flex items-center gap-2">
            <div class="i-carbon-circle-dash animate-spin text-lg" />
            <span>Processing search query...</span>
          </div>
          <div v-else-if="searchState === SearchState.EmbeddingMessages" class="w-full flex flex-col items-center gap-2">
            <div class="flex items-center gap-2">
              <div class="i-carbon-circle-dash animate-spin text-lg" />
              <span>Processing embeddings ({{ embeddingProgress.current }}/{{ embeddingProgress.total }})...</span>
            </div>
            <div class="h-2 max-w-xs w-full overflow-hidden rounded-full bg-muted">
              <div
                class="h-full bg-primary transition-all duration-300"
                :style="{ width: `${embeddingProgress.total > 0 ? (embeddingProgress.current / embeddingProgress.total) * 100 : 0}%` }"
              />
            </div>
          </div>
          <div v-else-if="searchState === SearchState.Searching" class="flex items-center gap-2">
            <div class="i-carbon-circle-dash animate-spin text-lg" />
            <span>Searching...</span>
          </div>
        </div>

        <div v-else-if="hasKeyword && !hasResults" class="py-8 text-center text-sm text-muted-foreground">
          No matching messages found
        </div>

        <div v-else-if="showHistory" class="flex flex-col gap-2">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm text-muted-foreground font-medium">Recent searches</span>
            <Button
              variant="ghost"
              size="sm"
              class="h-6 text-xs text-muted-foreground"
              @click="clearHistory"
            >
              Clear
            </Button>
          </div>
          <div class="max-h-[400px] flex flex-col gap-2 overflow-y-auto">
            <div
              v-for="(item, index) in searchHistory"
              :key="index"
              class="group flex cursor-pointer items-center justify-between rounded-md bg-muted/50 px-4 py-2.5 transition-colors hover:bg-muted"
              @click="selectHistoryItem(item)"
            >
              <span class="text-sm">{{ item }}</span>
              <div class="i-carbon-arrow-right text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </div>
        </div>

        <div v-else-if="!hasKeyword" class="py-8 text-center text-sm text-muted-foreground">
          Type to search messages...
        </div>

        <div v-if="hasResults" class="max-h-[400px] flex flex-col gap-4 overflow-y-auto">
          <div
            v-for="message in searchResults"
            :key="message.id"
            class="group cursor-pointer rounded-md bg-muted/50 px-4 py-3 transition-colors hover:bg-muted"
            @click="navigateToMessage(message)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="mb-1.5 flex flex-wrap items-center gap-2">
                  <span class="text-xs text-muted-foreground font-medium">
                    {{ getRoomName(message.room_id) }}
                  </span>
                  <span class="text-xs text-muted-foreground">
                    {{ formatRole(message.role) }}
                  </span>
                  <span class="text-xs text-primary font-semibold" title="Similarity score">
                    {{ formatSimilarity(message.similarity) }}
                  </span>
                </div>
                <div class="line-clamp-2 text-sm">
                  {{ getMessagePreview(message.content, 150) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

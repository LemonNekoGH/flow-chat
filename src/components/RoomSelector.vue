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
} from 'radix-vue'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import RoomCreateDialog from '~/components/RoomCreateDialog.vue'
import { useMessagesStore } from '~/stores/messages'
import { useRoomsStore } from '~/stores/rooms'

// Store initialization
const roomsStore = useRoomsStore()
const messagesStore = useMessagesStore()
const { rooms, activeRoomId } = storeToRefs(roomsStore)

// Search state and filtering
const searchQuery = ref('')
const filteredRooms = computed(() => {
  if (!searchQuery.value)
    return rooms.value
  const query = searchQuery.value.toLowerCase()
  return rooms.value.filter(room => room.name.toLowerCase().includes(query))
})

// Room sorting by activity
const sortedRooms = computed(() => {
  return [...filteredRooms.value].sort((a, b) => {
    const aTime = a.lastMessageTimestamp || a.timestamp
    const bTime = b.lastMessageTimestamp || b.timestamp
    return bTime - aTime
  })
})

// Dialog state management
const showCreateDialog = ref(false)
const editRoomId = ref<string | undefined>()

// Room management functions
function selectRoom(roomId: string) {
  roomsStore.setActiveRoom(roomId)
}

function createNewRoom() {
  const timestamp = new Date().toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })
  const room = roomsStore.createRoom(`New Chat ${timestamp}`, '')
  roomsStore.setActiveRoom(room.id)
}

function editRoom(roomId: string) {
  editRoomId.value = roomId
  showCreateDialog.value = true
}

function deleteRoom(roomId: string) {
  messagesStore.deleteRoomMessages(roomId)
  roomsStore.deleteRoom(roomId)
  toast.success('Chat deleted successfully')
}

// UI helpers
function resetSearch() {
  searchQuery.value = ''
}

function closeDialog() {
  showCreateDialog.value = false
  editRoomId.value = undefined
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Search bar -->
    <div class="p-3">
      <div class="flex items-center">
        <div i-lucide-search class="absolute left-3 text-gray-500 dark:text-gray-400" />
        <input
          v-model="searchQuery"
          placeholder="Search"
          class="w-full rounded-lg bg-gray-100 px-9 py-2 text-sm dark:bg-gray-800 focus:bg-gray-200 focus:outline-none dark:focus:bg-gray-700"
        >
        <button
          v-if="searchQuery"
          class="absolute right-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          @click="resetSearch"
        >
          <div i-lucide-x class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Time header -->
    <div class="flex items-center px-4 py-2">
      <span class="text-xs text-gray-600 font-semibold uppercase dark:text-gray-400">Yesterday</span>
    </div>

    <!-- Room list -->
    <div class="flex-1 overflow-y-auto">
      <div
        v-for="room in sortedRooms"
        :key="room.id"
        class="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        :class="{ 'bg-gray-200 dark:bg-gray-700': room.id === activeRoomId }"
        @click="selectRoom(room.id)"
      >
        <!-- Room icon -->
        <div class="h-6 w-6 flex items-center justify-center rounded bg-gray-200 text-xs text-gray-700 dark:bg-gray-600 dark:text-gray-300">
          <div i-lucide-message-square />
        </div>

        <!-- Room details -->
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm text-gray-900 font-medium dark:text-gray-100">
            {{ room.name }}
          </div>
          <div class="truncate text-xs text-gray-500 dark:text-gray-400">
            {{ room.systemPrompt.slice(0, 30) || "Start a new conversation..." }}
          </div>
        </div>

        <!-- Room actions -->
        <div class="flex gap-1 transition-opacity group-hover:opacity-100">
          <button class="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-600" @click.stop="editRoom(room.id)">
            <div i-lucide-pencil class="h-4 w-4" />
          </button>

          <AlertDialogRoot v-if="rooms.length > 1">
            <AlertDialogTrigger class="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-600" @click.stop>
              <div i-lucide-trash-2 class="h-4 w-4" />
            </AlertDialogTrigger>
            <AlertDialogPortal>
              <AlertDialogOverlay class="fixed inset-0 bg-black/50" />
              <AlertDialogContent class="fixed left-1/2 top-1/2 rounded-lg bg-white p-6 shadow-lg -translate-x-1/2 -translate-y-1/2 dark:bg-gray-800">
                <AlertDialogTitle class="text-lg font-medium">
                  Delete Chat
                </AlertDialogTitle>
                <AlertDialogDescription class="mt-2 text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete this chat and all its messages?
                </AlertDialogDescription>
                <div class="mt-4 flex justify-end gap-2">
                  <AlertDialogCancel class="rounded px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    class="rounded bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-600"
                    @click="deleteRoom(room.id)"
                  >
                    Delete
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialogPortal>
          </AlertDialogRoot>
        </div>
      </div>
    </div>

    <!-- New chat button -->
    <div
      class="bottom-4 left-4 right-4 flex cursor-pointer items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
      @click="createNewRoom"
    >
      <div i-lucide-plus class="h-4 w-4" />
      <span class="text-sm font-medium">New Chat</span>
    </div>

    <!-- Edit dialog -->
    <RoomCreateDialog
      v-if="showCreateDialog"
      class="z-1000"
      :edit-room-id="editRoomId"
      @close="closeDialog"
    />
  </div>
</template>

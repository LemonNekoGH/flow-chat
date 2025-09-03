<script setup lang="ts">
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import Button from '~/components/ui/button/Button.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import Input from '~/components/ui/input/Input.vue'
import { useDatabaseStore } from '~/stores/database'
import { useRoomsStore } from '~/stores/rooms'
import { useSettingsStore } from '~/stores/settings'

const roomsStore = useRoomsStore()
const settingsStore = useSettingsStore()

// Dialog states
const showRenameDialog = ref(false)
const showDeleteConfirmDialog = ref(false)

// Room states
const renameRoomId = ref('')
const renameRoomName = ref('')
const roomToDeleteId = ref('')

// Swipe logic
const swipedRoomId = ref<string | null>(null)
const touchStartX = ref(0)
const touchDeltaX = ref(0)

// Device detection
const isMobile = ref(false)

// Check if device is mobile
function checkMobile() {
  isMobile.value = window.innerWidth <= 768
}

const dbStore = useDatabaseStore()

// Set up event listeners for responsive behavior
onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  // Close swipe when clicking outside
  document.addEventListener('click', handleOutsideClick)

  await dbStore.waitForDbInitialized()
  await roomsStore.initialize()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  document.removeEventListener('click', handleOutsideClick)
})

// Close swipe when clicking outside
function handleOutsideClick(event: MouseEvent) {
  if (swipedRoomId.value !== null) {
    const target = event.target as HTMLElement
    if (!target.closest(`.room-item-${swipedRoomId.value}`)) {
      swipedRoomId.value = null
    }
  }
}

function handleTouchStart(e: TouchEvent, _: string) {
  touchStartX.value = e.touches[0].clientX
}

function handleTouchMove(e: TouchEvent, _: string) {
  touchDeltaX.value = e.touches[0].clientX - touchStartX.value
}

function handleTouchEnd(roomId: string) {
  if (touchDeltaX.value < -50) {
    // Close any other opened swipe
    if (swipedRoomId.value && swipedRoomId.value !== roomId) {
      swipedRoomId.value = null
    }
    swipedRoomId.value = roomId
  }
  else {
    swipedRoomId.value = null
  }
  touchDeltaX.value = 0
}

async function createNewChat() {
  const timestamp = format(new Date(), 'MMM d h:mm a', { locale: enUS })
  try {
    const room = await roomsStore.createRoom(`Chat ${timestamp}`, settingsStore.defaultTemplateId)
    toast.success('Chat created successfully')
    await nextTick()
    roomsStore.setCurrentRoom(room.id)
  }
  catch (error) {
    console.error(error)
    toast.error('Failed to create chat')
  }
}

function openRenameDialog(id: string, name: string) {
  renameRoomId.value = id
  renameRoomName.value = name
  showRenameDialog.value = true
}

async function renameRoom() {
  if (!renameRoomName.value.trim() || !renameRoomId.value)
    return
  try {
    await roomsStore.updateRoom(renameRoomId.value, {
      name: renameRoomName.value.trim(),
    })
    toast.success('Chat renamed successfully')
  }
  catch (error) {
    console.error(error)
    toast.error('Failed to rename chat')
  }
  finally {
    renameRoomId.value = ''
    renameRoomName.value = ''
    showRenameDialog.value = false
  }
}

function confirmDeleteRoom(id: string) {
  roomToDeleteId.value = id
  showDeleteConfirmDialog.value = true
}

async function deleteRoomConfirmed() {
  if (!roomToDeleteId.value)
    return
  try {
    await roomsStore.deleteRoom(roomToDeleteId.value)
    toast.success('Chat deleted successfully')
  }
  catch (error) {
    console.error(error)
    toast.error('Failed to delete chat')
  }
  finally {
    roomToDeleteId.value = ''
    showDeleteConfirmDialog.value = false
    if (swipedRoomId.value === roomToDeleteId.value) {
      swipedRoomId.value = null
    }
  }
}
</script>

<template>
  <div class="w-full flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-medium">
        Chats
      </h2>
      <Button variant="ghost" size="icon" class="h-8 w-8" @click="createNewChat">
        <div class="i-solar-add-circle-bold text-lg" />
      </Button>
    </div>

    <div class="mt-1 flex flex-col gap-3">
      <div
        v-for="group in roomsStore.groupedRooms"
        :key="group.title"
        class="flex flex-col gap-1"
      >
        <div class="px-3 text-xs text-muted-foreground font-medium">
          {{ group.title }}
        </div>

        <div
          v-for="room in group.rooms"
          :key="room.id"
          :class="[`relative overflow-hidden room-item-${room.id}`]"
        >
          <div class="absolute right-0 top-0 z-10 h-full flex items-center gap-1 rounded-md bg-background p-6">
            <Button variant="ghost" size="icon" class="h-7 w-7" @click.stop="openRenameDialog(room.id, room.name)">
              <div class="i-solar-pen-2-bold text-sm" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7"
              @click.stop="confirmDeleteRoom(room.id)"
            >
              <div class="i-solar-trash-bin-trash-bold text-sm text-destructive" />
            </Button>
          </div>

          <div
            class="group relative z-20 flex items-center justify-between rounded-md bg-white px-3 py-2 transition-all duration-200 ease-in-out dark:bg-black"
            :class="[
              roomsStore.currentRoomId === room.id ? 'bg-primary/5' : '',
            ]"
            :style="{ transform: swipedRoomId === room.id ? 'translateX(-100px)' : 'translateX(0)' }"
            @click="roomsStore.setCurrentRoom(room.id)"
            @touchstart="(e) => handleTouchStart(e, room.id)"
            @touchmove="(e) => handleTouchMove(e, room.id)"
            @touchend="() => handleTouchEnd(room.id)"
          >
            <div class="flex items-center gap-2">
              <div class="i-solar-chat-line-bold text-lg" />
              <div class="flex flex-col">
                <span class="line-clamp-1 text-sm">{{ room.name }}</span>
                <span class="text-xs text-muted-foreground">{{ room.relative_time }}</span>
              </div>
            </div>

            <div v-if="!isMobile" class="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button variant="ghost" size="icon" class="h-7 w-7" @click.stop="openRenameDialog(room.id, room.name)">
                <div class="i-solar-pen-2-bold text-sm" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="h-7 w-7"
                @click.stop="confirmDeleteRoom(room.id)"
              >
                <div class="i-solar-trash-bin-trash-bold text-sm text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:open="showRenameDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Chat</DialogTitle>
        </DialogHeader>
        <div>
          <Input
            v-model="renameRoomName"
            placeholder="Chat name"
            @keyup.enter="renameRoom"
          />
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="showRenameDialog = false">
            Cancel
          </Button>
          <Button @click="renameRoom">
            Rename
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showDeleteConfirmDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
        </DialogHeader>
        <div class="py-2">
          Are you sure you want to delete this chat?
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="showDeleteConfirmDialog = false">
            Cancel
          </Button>
          <Button variant="destructive" @click="deleteRoomConfirmed">
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.transition-all {
  transition: all 0.2s ease;
}
</style>

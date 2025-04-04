<script setup lang="ts">
import {
  format,
  formatDistanceToNow,
  isThisWeek,
  isToday,
  isYesterday,
} from 'date-fns'
import { enUS } from 'date-fns/locale'
import { computed, nextTick, ref } from 'vue'
import { toast } from 'vue-sonner'
import Button from '~/components/ui/button/Button.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import Input from '~/components/ui/input/Input.vue'
import { useRoomsStore } from '~/stores/rooms'
import { useTemplatesStore } from '~/stores/templates'

const roomsStore = useRoomsStore()
const templatesStore = useTemplatesStore()

// Dialog states
const showRenameDialog = ref(false)

// Form data
const renameRoomId = ref('')
const renameRoomName = ref('')

// Initialize stores
templatesStore.initialize()
roomsStore.initialize()

interface GroupedRoom {
  title: string
  rooms: Array<{
    id: string
    name: string
    createdAt: number
    relativeTime: string
  }>
}

// Group rooms by date
const groupedRooms = computed<GroupedRoom[]>(() => {
  const groups: GroupedRoom[] = [
    { title: 'Today', rooms: [] },
    { title: 'Yesterday', rooms: [] },
    { title: 'This Week', rooms: [] },
    { title: 'Earlier', rooms: [] },
  ]

  roomsStore.rooms.forEach((room) => {
    const date = new Date(room.createdAt)
    const relativeTime = formatDistanceToNow(date, {
      addSuffix: true,
      locale: enUS,
    })

    const roomWithTime = {
      ...room,
      relativeTime,
    }

    if (isToday(date)) {
      groups[0].rooms.push(roomWithTime)
    }
    else if (isYesterday(date)) {
      groups[1].rooms.push(roomWithTime)
    }
    else if (isThisWeek(date, { weekStartsOn: 1 })) { // Start from Monday
      groups[2].rooms.push(roomWithTime)
    }
    else {
      groups[3].rooms.push(roomWithTime)
    }
  })

  // Sort rooms within each group by creation time (newest first)
  groups.forEach((group) => {
    group.rooms.sort((a, b) => b.createdAt - a.createdAt)
  })

  // Only include groups that have rooms
  return groups.filter(group => group.rooms.length > 0)
})

async function createNewChat() {
  // Use the default template
  const templateId = templatesStore.defaultTemplate?.id || templatesStore.templates[0]?.id

  // Create a room with timestamp in the name
  const timestamp = format(new Date(), 'MMM d h:mm a', { locale: enUS })
  const room = roomsStore.createRoom(`Chat ${timestamp}`, templateId)

  toast.success('Chat created successfully')

  await nextTick()
  roomsStore.setCurrentRoom(room.id)
}

function openRenameDialog(id: string, name: string) {
  renameRoomId.value = id
  renameRoomName.value = name
  showRenameDialog.value = true
}

function renameRoom() {
  if (!renameRoomName.value.trim() || !renameRoomId.value)
    return

  roomsStore.updateRoom(renameRoomId.value, {
    name: renameRoomName.value.trim(),
  })

  renameRoomId.value = ''
  renameRoomName.value = ''
  showRenameDialog.value = false
  toast.success('Chat renamed successfully')
}

function deleteRoom(id: string) {
  roomsStore.deleteRoom(id)
  toast.success('Chat deleted successfully')
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
        v-for="group in groupedRooms"
        :key="group.title"
        class="flex flex-col gap-1"
      >
        <div class="px-3 text-xs text-muted-foreground font-medium">
          {{ group.title }}
        </div>
        <div
          v-for="room in group.rooms"
          :key="room.id"
          class="group flex cursor-pointer items-center justify-between rounded-md px-3 py-2 hover:bg-primary/10" :class="[
            roomsStore.currentRoomId === room.id ? 'bg-primary/20' : '',
          ]"
          @click="roomsStore.setCurrentRoom(room.id)"
        >
          <div class="flex items-center gap-2">
            <div class="i-solar-chat-line-bold text-lg" />
            <div class="flex flex-col">
              <span class="line-clamp-1 text-sm">{{ room.name }}</span>
              <span class="text-xs text-muted-foreground">{{ room.relativeTime }}</span>
            </div>
          </div>

          <div class="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="ghost" size="icon" class="h-7 w-7" @click.stop="openRenameDialog(room.id, room.name)">
              <div class="i-solar-pen-2-bold text-sm" />
            </Button>
            <Button
              v-if="roomsStore.rooms.length > 1"
              variant="ghost"
              size="icon"
              class="h-7 w-7"
              @click.stop="deleteRoom(room.id)"
            >
              <div class="i-solar-trash-bin-trash-bold text-sm text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rename Room Dialog -->
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
  </div>
</template>

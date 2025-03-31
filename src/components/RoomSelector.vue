<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
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
const router = useRouter()

// Dialog states
const showRenameDialog = ref(false)

// Form data
const renameRoomId = ref('')
const renameRoomName = ref('')

// Initialize stores
templatesStore.initialize()
roomsStore.initialize()

function navigateToRoom(id: string) {
  router.push(`/chat/${id}`)
}

function createNewChat() {
  // Use the default template
  const templateId = templatesStore.defaultTemplate?.id || templatesStore.templates[0]?.id

  // Create a room with timestamp in the name
  const timestamp = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })

  const room = roomsStore.createRoom(`Chat ${timestamp}`, templateId)

  toast.success('Chat created successfully')
  navigateToRoom(room.id)
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

    <div class="mt-1 flex flex-col gap-1">
      <div
        v-for="room in roomsStore.rooms"
        :key="room.id"
        class="group flex cursor-pointer items-center justify-between rounded-md px-3 py-2 hover:bg-primary/10" :class="[
          roomsStore.currentRoomId === room.id ? 'bg-primary/20' : '',
        ]"
        @click="navigateToRoom(room.id)"
      >
        <div class="flex items-center gap-2">
          <div class="i-solar-chat-line-bold text-lg" />
          <span class="line-clamp-1 text-sm">{{ room.name }}</span>
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

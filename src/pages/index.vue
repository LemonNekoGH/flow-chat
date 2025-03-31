<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRoomsStore } from '~/stores/rooms'

const router = useRouter()
const roomsStore = useRoomsStore()

onMounted(() => {
  // Initialize rooms
  roomsStore.initialize()

  // Redirect to the first room or create one if none exists
  if (roomsStore.rooms.length === 0) {
    const room = roomsStore.createRoom('Default Chat')
    router.replace(`/chat/${room.id}`)
  }
  else {
    router.replace(`/chat/${roomsStore.rooms[0].id}`)
  }
})
</script>

<template>
  <div class="h-full w-full flex items-center justify-center">
    <div class="animate-pulse text-lg">
      Redirecting...
    </div>
  </div>
</template>

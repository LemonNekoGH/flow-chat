<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRoomsStore } from '~/stores/rooms'

const router = useRouter()
const roomsStore = useRoomsStore()

// Initialize default room if needed and redirect to its page
onMounted(() => {
  const defaultRoom = roomsStore.initializeDefaultRoom()
  if (defaultRoom?.id) {
    router.push(`/chat/${defaultRoom.id}`)
  }
})
</script>

<template>
  <div class="h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="mb-4 text-3xl font-bold">
        Flow Chat
      </div>
      <p class="text-gray-500">
        Redirecting to your chat...
      </p>
    </div>
  </div>
</template>

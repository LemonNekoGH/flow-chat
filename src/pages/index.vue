<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRoomsStore } from '~/stores/rooms'

const router = useRouter()
const roomsStore = useRoomsStore()

onMounted(async () => {
  // Initialize rooms
  const room = await roomsStore.initialize()

  router.replace(`/chat/${room.id}`)
})
</script>

<template>
  <div class="h-full w-full flex items-center justify-center">
    <div class="animate-pulse text-lg">
      Redirecting...
    </div>
  </div>
</template>

<script setup lang="ts">
import { until } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDatabaseStore } from '~/stores/database'
import { useRoomsStore } from '~/stores/rooms'

const router = useRouter()
const roomsStore = useRoomsStore()
const dbStore = useDatabaseStore()
const { db } = storeToRefs(dbStore)

onMounted(async () => {
  await until(db).toBeTruthy()

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

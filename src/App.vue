<script setup lang="ts">
import { onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { useDatabaseStore } from '~/stores/database'

const dbStore = useDatabaseStore()

onMounted(async () => {
  try {
    await dbStore.initialize()
  }
  catch (error) {
    console.error(error)
    toast.error('Failed to initialize database')
  }
})
</script>

<template>
  <RouterView />
</template>

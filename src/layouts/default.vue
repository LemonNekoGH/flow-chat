<script setup lang="ts">
import type { Model } from 'xsai'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { toast, Toaster } from 'vue-sonner'
import { listModels } from 'xsai'

import { useSettingsStore } from '~/stores/settings'

const settingsStore = useSettingsStore()
const { apiKey, baseURL } = storeToRefs(settingsStore)

const models = ref<Model[]>([])

async function fetchModels() {
  if (!baseURL.value) {
    toast.error('No base URL provided')
    return
  }

  try {
    models.value = await listModels({
      apiKey: apiKey.value,
      baseURL: baseURL.value,
    })
  }
  catch (error) {
    toast.error('Failed to fetch models', {
      description: (error as Error).message,
    })
  }
}

onMounted(async () => {
  await fetchModels()
})
</script>

<template>
  <Toaster position="top-right" rich-colors />

  <main class="h-full flex flex-1 flex-col">
    <RouterView />
  </main>
</template>

<style>
#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>

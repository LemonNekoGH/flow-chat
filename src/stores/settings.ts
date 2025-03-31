import type { Model } from 'xsai'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listModels } from 'xsai'

export const useSettingsStore = defineStore('settings', () => {
  const apiKey = ref('')
  const baseURL = ref('')
  const model = ref('')
  const models = ref<Model[]>([])
  const isLoadingModels = ref(false)

  // Fetch available models
  async function fetchModels() {
    if (!baseURL.value || !apiKey.value) {
      return
    }

    isLoadingModels.value = true
    try {
      models.value = await listModels({
        apiKey: apiKey.value,
        baseURL: baseURL.value,
      })
    }
    catch (error) {
      console.error('Failed to fetch models:', error)
    }
    finally {
      isLoadingModels.value = false
    }
  }

  return {
    apiKey,
    baseURL,
    model,
    models,
    isLoadingModels,
    fetchModels,
  }
}, { persist: true })

import type { Model } from 'xsai'
import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listModels } from 'xsai'

export const useSettingsStore = defineStore('settings', () => {
  const apiKey = useLocalStorage('settings/apiKey', '')
  const baseURL = useLocalStorage('settings/baseURL', '')
  const model = useLocalStorage('settings/model', '')
  const defaultTemplateId = useLocalStorage('settings/defaultTemplateId', '')
  const models = ref<Model[]>([])
  const isLoadingModels = ref(false)

  const showSettingsDialog = ref(false)

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
    defaultTemplateId,
    showSettingsDialog,
    models,
    isLoadingModels,
    fetchModels,
  }
})

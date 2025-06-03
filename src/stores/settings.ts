import type { Model } from 'xsai'
import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listModels } from 'xsai'

export const useSettingsStore = defineStore('settings', () => {
  const textGeneration = useLocalStorage('settings/textGeneration', {
    apiKey: '',
    baseURL: '',
    model: '',
  })
  const imageGeneration = useLocalStorage('settings/imageGeneration', {
    apiKey: '',
    baseURL: '',
    model: '',
  })
  const defaultTemplateId = useLocalStorage('settings/defaultTemplateId', '')
  const models = ref<Model[]>([])
  const isLoadingModels = ref(false)

  const showSettingsDialog = ref(false)

  // Fetch available models
  async function fetchModels() {
    // API key is not required for public models
    if (!textGeneration.value.baseURL) {
      return
    }

    isLoadingModels.value = true
    try {
      models.value = await listModels({
        apiKey: textGeneration.value.apiKey,
        baseURL: textGeneration.value.baseURL,
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
    textGeneration,
    imageGeneration,
    defaultTemplateId,
    showSettingsDialog,
    models,
    isLoadingModels,
    fetchModels,
  }
})

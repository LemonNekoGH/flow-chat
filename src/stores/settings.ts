import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listModels } from 'xsai'

export const useSettingsStore = defineStore('settings', () => {
  const apiKey = ref('')
  const baseURL = ref('')
  const model = ref('')

  const fetchModels = async () => {
    const models = await listModels({
      apiKey: apiKey.value,
      baseURL: baseURL.value,
    })

    return models
  }

  return {
    apiKey,
    baseURL,
    model,

    fetchModels,
  }
}, { persist: true })

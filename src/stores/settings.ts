import type { Model } from 'xsai'
import type { ModelInfo, Provider } from '~/types/settings'
import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { listModels } from 'xsai'

export const useSettingsStore = defineStore('settings', () => {
  const imageGeneration = useLocalStorage('settings/imageGeneration', {
    apiKey: '',
    baseURL: '',
    model: '',
  })

  const configuredTextProviders = useLocalStorage<Provider[]>('settings/configuredTextProviders', [])
  const configuredImageProviders = useLocalStorage<Provider[]>('settings/configuredImageProviders', [])
  const defaultTextModel = useLocalStorage<ModelInfo>('settings/defaultTextModel', {
    provider: '',
    model: '',
  }) // TODO: auto detect capabilities when selecting model
  const defaultImageModel = useLocalStorage<ModelInfo>('settings/defaultImageModel', {
    provider: '',
    model: '',
  })

  const currentProvider = computed(() => {
    return configuredTextProviders.value.find(p => p.name === defaultTextModel.value.provider)
  })

  const defaultTemplateId = useLocalStorage('settings/defaultTemplateId', '')
  const models = ref<Model[]>([])
  const isLoadingModels = ref(false)

  // Fetch available models
  async function fetchModels() {
    // API key is not required for public models
    const provider = configuredTextProviders.value.find(p => p.name === defaultTextModel.value.provider)
    if (!provider) {
      console.error('Provider not found')
      return
    }

    isLoadingModels.value = true
    try {
      models.value = await listModels({
        apiKey: provider.apiKey,
        baseURL: provider.baseURL,
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
    currentProvider,
    configuredTextProviders,
    configuredImageProviders,
    defaultTextModel,
    defaultImageModel, // TODO: sort keys
    imageGeneration,
    defaultTemplateId,
    models,
    isLoadingModels,
    fetchModels,
  }
})

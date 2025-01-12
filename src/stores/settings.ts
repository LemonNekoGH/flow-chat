import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', () => {
  const apiKey = ref('')
  const baseURL = ref('')
  const model = ref('')

  return {
    apiKey,
    baseURL,
    model,
  }
}, { persist: true })

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const apiKey = ref('')
  const baseURL = ref('')
  const model = ref('')

  const showSettingsDialog = ref(false)

  return {
    apiKey,
    baseURL,
    model,
    showSettingsDialog,
  }
}, { persist: true })

<script setup lang="ts">
import type { Model } from 'xsai'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import Button from '~/components/ui/button/Button.vue'
import { useSettingsStore } from '~/stores/settings'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const settingsStore = useSettingsStore()
const { apiKey, baseURL, model } = storeToRefs(settingsStore)

const models = ref<Model[]>([])
const isLoading = ref(false)

function saveSettings() {
  emit('close')
}

async function fetchModels() {
  if (!baseURL.value) {
    toast.error('Please enter Base URL first')
    return
  }

  isLoading.value = true
  try {
    settingsStore.fetchModels()
  }
  catch (error) {
    toast.error('Failed to fetch models', {
      description: (error as Error).message,
    })
  }
  finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (baseURL.value && apiKey.value) {
    await settingsStore.fetchModels()
  }
})
</script>

<template>
  <div class="fixed inset-0 z-1000 flex items-center justify-center bg-black/50">
    <div class="max-h-90vh max-w-90% w-400px overflow-y-auto rounded-lg bg-white dark:bg-dark-800">
      <div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <h2 class="m-0 text-lg font-semibold">
          Settings
        </h2>
        <button class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" @click="emit('close')">
          <i class="i-lucide-x text-lg" />
        </button>
      </div>

      <div class="p-4">
        <div class="mb-4">
          <label for="api-key" class="mb-2 block text-sm font-medium">API Key</label>
          <input
            id="api-key"
            v-model="apiKey"
            type="password"
            placeholder="Enter your API Key"
            class="w-full border border-gray-200 rounded px-3 py-2 dark:border-gray-700 dark:bg-dark-700"
          >
        </div>

        <div class="mb-4">
          <label for="base-url" class="mb-2 block text-sm font-medium">Base URL</label>
          <input
            id="base-url"
            v-model="baseURL"
            type="text"
            placeholder="e.g. https://api.anthropic.com"
            class="w-full border border-gray-200 rounded px-3 py-2 dark:border-gray-700 dark:bg-dark-700"
          >
        </div>

        <div class="mb-4">
          <div class="mb-2 flex items-center justify-between">
            <label for="model" class="text-sm font-medium">Model</label>
            <button
              class="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs disabled:cursor-not-allowed dark:bg-dark-700 hover:bg-gray-200 disabled:opacity-50 dark:hover:bg-dark-600"
              :disabled="isLoading"
              @click="fetchModels"
            >
              <i class="i-lucide-refresh-cw" :class="{ 'animate-spin': isLoading }" />
              {{ isLoading ? 'Loading...' : 'Refresh' }}
            </button>
          </div>
          <select
            id="model"
            v-model="model"
            class="w-full border border-gray-200 rounded px-3 py-2 dark:border-gray-700 dark:bg-dark-700"
          >
            <option value="">
              Select a model
            </option>
            <optgroup v-if="models.length" label="Available Models">
              <option v-for="m in models" :key="m.id" :value="m.id">
                {{ m.id }}
              </option>
            </optgroup>
            <optgroup v-else label="Common Models">
              <option value="claude-3-opus-20240229">
                Claude 3 Opus
              </option>
              <option value="claude-3-sonnet-20240229">
                Claude 3 Sonnet
              </option>
              <option value="claude-3-haiku-20240307">
                Claude 3 Haiku
              </option>
              <option value="claude-3.5-sonnet-20240620">
                Claude 3.5 Sonnet
              </option>
              <option value="claude-3.7-sonnet-20240708">
                Claude 3.7 Sonnet
              </option>
            </optgroup>
          </select>
        </div>
      </div>

      <div class="flex justify-end border-t border-gray-200 p-4 dark:border-gray-700">
        <Button variant="default" @click="saveSettings">
          Save
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import TemplateManager from '~/components/TemplateManager.vue'
import { useSettingsStore } from '~/stores/settings'

const settingsStore = useSettingsStore()
const { apiKey, baseURL, model, models } = storeToRefs(settingsStore)

onMounted(async () => {
  await settingsStore.fetchModels()
})
</script>

<template>
  <div class="mx-auto max-w-3xl w-full p-6">
    <h1 class="mb-6 text-2xl font-bold">
      Settings
    </h1>

    <div class="flex flex-col gap-8">
      <!-- API Settings -->
      <div class="card border rounded-lg p-6 shadow-sm">
        <h2 class="mb-4 text-xl font-semibold">
          API Settings
        </h2>
        <div class="space-y-4">
          <div>
            <label for="api-key" class="mb-1 block text-sm font-medium">API Key</label>
            <input
              id="api-key"
              v-model="apiKey"
              type="text"
              class="w-full border rounded-md p-2 dark:bg-gray-800"
              placeholder="Enter your API key"
            >
          </div>

          <div>
            <label for="base-url" class="mb-1 block text-sm font-medium">Base URL</label>
            <input
              id="base-url"
              v-model="baseURL"
              type="text"
              class="w-full border rounded-md p-2 dark:bg-gray-800"
              placeholder="Enter API base URL"
            >
          </div>

          <div>
            <label for="default-model" class="mb-1 block text-sm font-medium">Default Model</label>
            <select
              id="default-model"
              v-model="model"
              class="w-full border rounded-md p-2 dark:bg-gray-800"
            >
              <option v-for="m in models" :key="m" :value="m">
                {{ m }}
              </option>
            </select>
          </div>

          <div class="flex justify-end">
            <button
              class="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
              @click="settingsStore.fetchModels"
            >
              Reload Models
            </button>
          </div>
        </div>
      </div>

      <!-- Templates -->
      <div class="card border rounded-lg p-6 shadow-sm">
        <TemplateManager />
      </div>
    </div>
  </div>
</template>

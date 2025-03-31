<script setup lang="ts">
import type { Model } from 'xsai'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemText,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
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
    await settingsStore.fetchModels()
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
  <Dialog :open="true">
    <DialogContent class="max-h-90vh max-w-90% w-400px overflow-y-auto rounded-lg bg-white dark:bg-dark-800">
      <DialogHeader>
        <DialogTitle class="text-lg font-semibold">
          Settings
        </DialogTitle>
      </DialogHeader>

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
          <Select v-model="model" class="w-full">
            <SelectTrigger class="w-full border border-gray-200 rounded px-3 py-2 dark:border-gray-700 dark:bg-dark-700">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent class="border border-gray-200 rounded-lg bg-white shadow-lg dark:border-gray-700 dark:bg-dark-800">
              <SelectGroup v-if="models.length">
                <SelectLabel class="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400">
                  Available Models
                </SelectLabel>
                <SelectItem
                  v-for="m in models"
                  :key="m.id"
                  :value="m.id"
                  class="relative flex items-center rounded px-8 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <SelectItemText>{{ m.id }}</SelectItemText>
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="flex justify-end border-t border-gray-200 p-4 dark:border-gray-700">
        <Button variant="default" @click="saveSettings">
          Save
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

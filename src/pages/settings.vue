<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ModelSelector from '~/components/ModelSelector.vue'
import TemplateManager from '~/components/TemplateManager.vue'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import { useSettingsStore } from '~/stores/settings'

const router = useRouter()
const settingsStore = useSettingsStore()
const { textGeneration, imageGeneration } = storeToRefs(settingsStore)

// Model selector state
const showModelSelector = ref(false)

// Handle model selection
function handleModelSelect(selectedModelValue: string) {
  textGeneration.value.model = selectedModelValue
}

onMounted(async () => {
  await settingsStore.fetchModels()
})
</script>

<template>
  <div class="mx-auto max-w-3xl w-full p-6">
    <div class="flex">
      <Button
        variant="outline" as="a" class="mr-2 aspect-square w-10 px-unset dark:bg-black dark:hover:bg-primary/30"
        @click="router.go(-1)"
      >
        <span class="i-carbon-arrow-left" />
      </Button>
      <h1 class="mb-6 text-2xl font-bold">
        Settings
      </h1>
    </div>
    <div class="flex flex-col gap-8">
      <!-- Text generation API Settings -->
      <div class="card border rounded-lg p-6 shadow-sm">
        <h2 class="mb-4 text-xl font-semibold">
          Text generation API Settings
        </h2>
        <div class="space-y-4">
          <div>
            <label for="api-key" class="mb-1 block text-sm font-medium">API Key</label>
            <Input
              id="api-key"
              v-model="textGeneration.apiKey"
              type="password"
              class="w-full border rounded-md p-2 dark:bg-gray-800"
              placeholder="Enter your API key"
            />
          </div>

          <div>
            <label for="base-url" class="mb-1 block text-sm font-medium">Base URL</label>
            <Input
              id="base-url"
              v-model="textGeneration.baseURL"
              type="text"
              class="w-full border rounded-md p-2 dark:bg-gray-800"
              placeholder="Enter API base URL"
            />
          </div>

          <div>
            <label for="model" class="mb-1 block text-sm font-medium">Model</label>
            <div class="relative flex gap-2">
              <Input id="model" v-model="textGeneration.model" class="w-full" @click.stop="showModelSelector = true" />
              <ModelSelector
                v-if="showModelSelector"
                v-model:search-term="textGeneration.model"
                v-model:show-model-selector="showModelSelector"
                @select-model="handleModelSelect"
              />
              <Button variant="outline" class="h-full" @click="settingsStore.fetchModels">
                Reload
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Image generation API Settings -->
      <div class="card border rounded-lg p-6 shadow-sm">
        <h2 class="mb-4 text-xl font-semibold">
          Image generation API Settings
        </h2>
        <div class="mb-4 text-sm text-gray-500">
          Currently only OpenAI is supported
        </div>
        <div class="space-y-4">
          <div>
            <label for="api-key" class="mb-1 block text-sm font-medium">API Key</label>
            <Input
              id="api-key"
              v-model="imageGeneration.apiKey"
              type="password"
              class="w-full border rounded-md p-2 dark:bg-gray-800"
              placeholder="Enter your API key"
            />
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

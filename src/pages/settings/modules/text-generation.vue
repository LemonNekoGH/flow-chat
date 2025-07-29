<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import type { Provider } from '~/types/settings'

import { providers } from '@moeru-ai/jem'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import Select from '~/components/ui/select/Select.vue'
import SelectContent from '~/components/ui/select/SelectContent.vue'

import SelectItem from '~/components/ui/select/SelectItem.vue'
import SelectTrigger from '~/components/ui/select/SelectTrigger.vue'

import SelectValue from '~/components/ui/select/SelectValue.vue'
import { useSettingsStore } from '~/stores/settings'

const router = useRouter()

type UUID = `${string}-${string}-${string}-${string}-${string}`

const settingsStore = useSettingsStore()
const editingProviderId = ref<UUID | null>(null)

function handleAddProvider() {
  settingsStore.configuredTextProviders.push({
    id: crypto.randomUUID(),
    name: 'Provider Not Selected',
    apiKey: '',
    baseURL: '',
  })
}

function handleChangeProvider(selectedProvider: AcceptableValue) {
  if (typeof selectedProvider !== 'string') {
    console.error('Provider is not a string', selectedProvider)
    return
  }

  const editingProvider = settingsStore.configuredTextProviders.find(p => p.id === editingProviderId.value)
  if (!editingProvider) {
    return
  }

  editingProvider.name = selectedProvider
  const baseURL = providers.find(p => p.name === selectedProvider)?.apiBaseURL ?? ''
  if (typeof baseURL === 'function') {
    editingProvider.baseURL = baseURL({ resourceName: '', accountId: '' }) // TODO: handle this
  }
  else {
    editingProvider.baseURL = baseURL
  }
}

function handleDeleteProvider(provider: Provider) {
  settingsStore.configuredTextProviders = settingsStore.configuredTextProviders.filter(p => p.name !== provider.name)
  editingProviderId.value = null
}
</script>

<template>
  <div class="mx-auto max-w-3xl w-full p-6">
    <div class="flex">
      <Button
        id="text-generation-back"
        variant="outline" class="mr-2 aspect-square w-10 px-unset dark:bg-black dark:hover:bg-primary/30"
        @click="router.replace('/settings')"
      >
        <span class="i-carbon-arrow-left" />
      </Button>
      <h1 class="mb-6 text-2xl font-bold">
        Text Generation
      </h1>
    </div>
    <div v-for="provider in settingsStore.configuredTextProviders" :key="provider.name" class="card mb-4 border rounded-lg p-6 shadow-sm">
      <div class="flex items-center gap-2">
        <h2 class="mb-4 text-xl font-semibold">
          {{ provider.name }}
        </h2>

        <div class="flex-1" />

        <Button v-if="editingProviderId !== provider.id" size="icon" class="edit-provider-btn h-8 w-8" variant="ghost" @click="editingProviderId = provider.id">
          <div i-lucide-pencil class="bg-blue" />
        </Button>

        <Button v-else size="icon" class="h-8 w-8" variant="ghost" @click="editingProviderId = null">
          <div i-lucide-check class="bg-green" />
        </Button>

        <Button v-if="editingProviderId === provider.id" size="icon" class="delete-provider-btn h-8 w-8" variant="ghost" @click="handleDeleteProvider(provider)">
          <div i-lucide-trash class="bg-red" />
        </Button>
      </div>

      <div class="space-y-4">
        <div v-if="editingProviderId === provider.id">
          <Select
            id="provider-name"
            :model-value="provider.name"
            class="w-full border rounded-md p-2 dark:bg-gray-800"
            placeholder="Enter provider name"
            @update:model-value="handleChangeProvider"
          >
            <label for="provider-name" class="mb-2 block text-sm font-medium">Provider Name</label>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="p in providers" :key="p.name" :value="p.name">
                {{ p.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label for="text-api-key" class="mb-2 block text-sm font-medium">API Key</label>
          <Input
            id="text-api-key"
            v-model="provider.apiKey"
            type="password"
            class="w-full border rounded-md p-2 dark:bg-gray-800"
            placeholder="Enter your API key"
          />
        </div>

        <div>
          <label for="base-url" class="mb-2 block text-sm font-medium">Base URL</label>
          <Input
            id="base-url"
            v-model="provider.baseURL"
            type="text"
            class="w-full border rounded-md p-2 dark:bg-gray-800"
            placeholder="Enter API base URL"
          />
        </div>
      </div>
    </div>
    <Button id="settings-add-provider-btn" class="w-full" variant="outline" @click="handleAddProvider">
      <div i-lucide-plus class="h-4 w-4" />
      <div>Add Provider</div>
    </Button>
  </div>
</template>

<script setup lang="ts">
import type { Model } from '@xsai/model'
import { listModels } from '@xsai/model'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '~/stores/settings'

const settingsStore = useSettingsStore()

const { apiKey, baseURL, model } = storeToRefs(settingsStore)

const models = ref<Model[]>([])

async function fetchModels() {
  if (!apiKey.value || !baseURL.value) {
    return
  }

  models.value = await listModels({
    apiKey: apiKey.value,
    baseURL: baseURL.value,
  })
}

watch([apiKey, baseURL], async () => {
  await fetchModels()
})

onMounted(async () => {
  await fetchModels()
})
</script>

<template>
  <header class="h-16 w-full border-b border-gray-200 bg-white">
    <div class="h-full flex items-center justify-between px-4">
      <div class="text-xl font-bold">
        Flow Chat
      </div>
      <Dialog>
        <DialogTrigger as-child>
          <Button>
            Settings
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <Label for="api-key">
            API Key
          </Label>
          <Input id="api-key" v-model="apiKey" />
          <Label for="base-url">
            Base URL
          </Label>
          <Input id="base-url" v-model="baseURL" />
          <Label for="model">
            Model
          </Label>
          <Select id="model" v-model="model">
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem v-for="m in models" :key="m.id" :value="m.id">
                  {{ m.id }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>
    </div>
  </header>
  <main class="h-full">
    <RouterView />
  </main>
</template>

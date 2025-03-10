<script setup lang="ts">
import type { Model } from '@xsai/model'
import { watchDebounced } from '@vueuse/core'
import { listModels } from '@xsai/model'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'

import Button from '~/components/ui/button/Button.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import DialogTrigger from '~/components/ui/dialog/DialogTrigger.vue'
import Input from '~/components/ui/input/Input.vue'
import Label from '~/components/ui/label/Label.vue'
import Select from '~/components/ui/select/Select.vue'
import SelectContent from '~/components/ui/select/SelectContent.vue'
import SelectGroup from '~/components/ui/select/SelectGroup.vue'
import SelectItem from '~/components/ui/select/SelectItem.vue'
import SelectTrigger from '~/components/ui/select/SelectTrigger.vue'

import { useSettingsStore } from '~/stores/settings'

const settingsStore = useSettingsStore()

const { apiKey, baseURL, model } = storeToRefs(settingsStore)

const models = ref<Model[]>([])

async function fetchModels() {
  if (!baseURL.value) {
    return
  }

  models.value = await listModels({
    apiKey: apiKey.value,
    baseURL: baseURL.value,
  })
}

watchDebounced([apiKey, baseURL], async () => {
  await fetchModels()
}, { debounce: 500 })

onMounted(async () => {
  await fetchModels()
})
</script>

<template>
  <header class="h-16 w-full border-b border-gray-200 bg-white">
    <div class="h-full flex items-center gap-x-4 px-4">
      <div class="text-xl font-bold">
        Flow Chat
      </div>
      <div class="flex-1" />
      <Dialog v-model:open="settingsStore.showSettingsDialog">
        <DialogTrigger>
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
      <Button variant="outline" as="a" href="https://github.com/lemonnekogh/flow-chat" class="aspect-square w-10 px-unset">
        <span class="i-carbon-logo-github" />
      </Button>
    </div>
  </header>
  <main class="h-full">
    <RouterView />
  </main>
</template>

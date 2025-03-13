<script setup lang="ts">
import type { Model } from 'xsai'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { toast, Toaster } from 'vue-sonner'
import { listModels } from 'xsai'
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
import SelectLabel from '~/components/ui/select/SelectLabel.vue'
import SelectTrigger from '~/components/ui/select/SelectTrigger.vue'
import SelectValue from '~/components/ui/select/SelectValue.vue'
import { isDark, toggleDark } from '~/composables/dark'
import { useMessagesStore } from '~/stores/messages'
import { ChatMode, useModeStore } from '~/stores/mode'
import { useSettingsStore } from '~/stores/settings'

const settingsStore = useSettingsStore()
const { currentMode } = storeToRefs(useModeStore())

const { apiKey, baseURL, model } = storeToRefs(settingsStore)
const messagesStore = useMessagesStore()

const models = ref<Model[]>([])

async function fetchModels() {
  if (!baseURL.value) {
    toast.error('No base URL provided')
    return
  }

  try {
    models.value = await listModels({
      apiKey: apiKey.value,
      baseURL: baseURL.value,
    })
  }
  catch (error) {
    toast.error('Failed to fetch models', {
      description: (error as Error).message,
    })
  }
}

onMounted(async () => {
  await fetchModels()
})
</script>

<template>
  <header class="h-16 w-full border-b border-gray-200 bg-white dark:border-gray-900 dark:bg-dark-500">
    <Toaster position="top-right" rich-colors />
    <div class="h-full flex items-center gap-x-4 px-4">
      <div class="text-xl font-bold">
        Flow Chat
      </div>
      <div class="flex-1" />
      <Button v-if="currentMode === ChatMode.CONVERSATION" variant="outline" @click="currentMode = ChatMode.FLOW">
        Jump Out
      </Button>
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
          <div class="flex gap-2">
            <Select id="model" v-model="model">
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>
                    Model
                  </SelectLabel>
                  <SelectItem v-for="m in models" :key="m.id" :value="m.id">
                    {{ m.id }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button variant="outline" class="h-full" @click="fetchModels">
              Reload
            </Button>
          </div>
          <Button variant="outline" @click="messagesStore.restoreTutorial">
            Restore Tutorial
          </Button>
        </DialogContent>
      </Dialog>
      <Button
        class="border border-gray-300 rounded-md bg-white px-2 transition-colors duration-200 dark:border-gray-500 dark:bg-white hover:bg-gray-200 dark:hover:bg-gray-300"
        @click="toggleDark()"
      >
        <i v-if="isDark" class="i-carbon-moon text-xl text-gray-800" />
        <i v-else class="i-carbon-sun text-xl text-gray-800" />
      </Button>
      <Button
        variant="outline" as="a" href="https://github.com/lemonnekogh/flow-chat"
        class="aspect-square w-10 px-unset dark:bg-white dark:hover:bg-primary/90"
      >
        <span class="i-carbon-logo-github" />
      </Button>
    </div>
  </header>
  <main class="flex flex-1 flex-col">
    <RouterView />
  </main>
</template>

<style>
#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.i-carbon-logo-github {
  @apply dark:bg-black;
}
</style>

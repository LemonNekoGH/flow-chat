<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import type { Tutorial } from '~/types/tutorial'
import { storeToRefs } from 'pinia'
import { DialogOverlay } from 'reka-ui'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ModelSelector from '~/components/ModelSelector.vue'
import TemplateManager from '~/components/TemplateManager.vue'
import Button from '~/components/ui/button/Button.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogDescription from '~/components/ui/dialog/DialogDescription.vue'
import DialogFooter from '~/components/ui/dialog/DialogFooter.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import Input from '~/components/ui/input/Input.vue'
import Select from '~/components/ui/select/Select.vue'
import SelectContent from '~/components/ui/select/SelectContent.vue'
import SelectItem from '~/components/ui/select/SelectItem.vue'
import SelectTrigger from '~/components/ui/select/SelectTrigger.vue'

import SelectValue from '~/components/ui/select/SelectValue.vue'
import { useDatabaseStore } from '~/stores/database'
import { useSettingsStore } from '~/stores/settings'
import { useTutorialStore } from '~/stores/tutorial'

const router = useRouter()
const settingsStore = useSettingsStore()
const tutorialStore = useTutorialStore()
const { showSelectTutorial, chat, settings } = storeToRefs(tutorialStore)
const { defaultTextModel, imageGeneration, configuredTextProviders } = storeToRefs(settingsStore)

// Model selector state
const showModelSelector = ref(false)
const showDeleteAllMessagesDialog = ref(false)
const dbStore = useDatabaseStore()

// Handle model selection
function handleModelSelect(selectedModelValue: string) {
  settingsStore.defaultTextModel.model = selectedModelValue
}

function handleTextProviderChange(selectedProvider: AcceptableValue) {
  if (typeof selectedProvider !== 'string') {
    console.error('Provider is not a string', selectedProvider)
    return
  }

  settingsStore.defaultTextModel.provider = selectedProvider
  settingsStore.defaultTextModel.model = ''
  settingsStore.fetchModels()
}

function onSelectTutorial(tutorial: Tutorial) {
  showSelectTutorial.value = false
  tutorialStore.showTutorial(tutorial)
}

async function resetTutorial() {
  showSelectTutorial.value = true
}

async function deleteAllMessages() {
  showDeleteAllMessagesDialog.value = true
}

async function confirmDeleteAllMessages() {
  await dbStore.clearDb()
  await dbStore.migrate()
  showDeleteAllMessagesDialog.value = false
}

onMounted(async () => {
  await settingsStore.fetchModels()
})
</script>

<template>
  <div class="mx-auto max-w-3xl w-full p-6">
    <div class="flex">
      <Button
        id="settings-back-btn"
        variant="outline" class="mr-2 aspect-square w-10 px-unset dark:bg-black dark:hover:bg-primary/30"
        @click="router.push('/')"
      >
        <span class="i-carbon-arrow-left" />
      </Button>
      <h1 class="mb-6 text-2xl font-bold">
        Settings
      </h1>
    </div>
    <div class="flex flex-col gap-4">
      <div id="text-generation-settings-card" class="card border rounded-lg p-6 shadow-sm">
        <h2 class="mb-4 text-xl font-semibold">
          Text Generation Settings
        </h2>
        <div class="space-y-4">
          <div>
            <label for="provider" class="mb-1 block text-sm font-medium">Provider</label>
            <Select
              id="provider"
              :model-value="defaultTextModel.provider"
              class="w-full border rounded-md p-2 dark:bg-gray-800"
              @update:model-value="handleTextProviderChange"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="provider in configuredTextProviders" :key="provider.name" :value="provider.name">
                  {{ provider.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label for="model" class="mb-1 block text-sm font-medium">Model</label>
            <div class="relative flex gap-2">
              <Input id="model" v-model="defaultTextModel.model" class="w-full" @click.stop="showModelSelector = true" />
              <ModelSelector
                v-if="showModelSelector"
                v-model:search-term="defaultTextModel.model"
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

      <Button id="edit-text-generation-provider-btn" variant="outline" @click="router.push('/settings/modules/text-generation')">
        Edit Text Generation Providers
      </Button>

      <div id="image-generation-settings-card" class="card border rounded-lg p-6 shadow-sm">
        <h2 class="mb-4 text-xl font-semibold">
          Image Generation Settings
        </h2>
        <div class="mb-4 text-sm text-gray-500">
          Currently only OpenAI is supported
        </div>
        <div class="space-y-4">
          <div>
            <label for="image-api-key" class="mb-1 block text-sm font-medium">API Key</label>
            <Input
              id="image-api-key"
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

      <Button id="reset-tutorial-button" variant="outline" @click="resetTutorial">
        Reset Tutorial
      </Button>

      <Button id="delete-all-messages-button" variant="outline" @click="deleteAllMessages">
        Delete all messages
      </Button>
    </div>

    <Dialog v-model:open="showSelectTutorial">
      <DialogOverlay class="fixed inset-0 z-10002" />
      <DialogContent class="fixed z-10003">
        <DialogHeader>
          <DialogTitle>
            Select the tutorial section
          </DialogTitle>
        </DialogHeader>
        <DialogDescription class="flex gap-2">
          <Button variant="outline" class="pointer-events-auto" @click="onSelectTutorial(chat)">
            Chat
          </Button>
          <Button variant="destructive" class="pointer-events-auto" @click="onSelectTutorial(settings)">
            Settings
          </Button>
        </DialogDescription>
      </DialogContent>
    </Dialog>

    <Dialog :open="showDeleteAllMessagesDialog">
      <DialogOverlay class="fixed inset-0 z-10002" />
      <DialogContent class="fixed z-10003">
        <DialogHeader>
          <DialogTitle>
            Delete all messages
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to delete all messages?
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" class="pointer-events-auto" @click="showDeleteAllMessagesDialog = false">
            No
          </Button>

          <!-- TODO: color issue -->
          <Button variant="destructive" class="pointer-events-auto" @click="confirmDeleteAllMessages">
            Yes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

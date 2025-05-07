<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { Toaster } from 'vue-sonner'
import ModelSelector from '~/components/ModelSelector.vue'
import RoomSelector from '~/components/RoomSelector.vue'
import TemplateManager from '~/components/TemplateManager.vue'
import Button from '~/components/ui/button/Button.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import DialogTrigger from '~/components/ui/dialog/DialogTrigger.vue'
import Input from '~/components/ui/input/Input.vue'
import Label from '~/components/ui/label/Label.vue'
import Tabs from '~/components/ui/tabs/Tabs.vue'
import TabsContent from '~/components/ui/tabs/TabsContent.vue'
import TabsList from '~/components/ui/tabs/TabsList.vue'
import TabsTrigger from '~/components/ui/tabs/TabsTrigger.vue'
import { isDark, toggleDark } from '~/composables/dark'
import { useMessagesStore } from '~/stores/messages'
import { ChatMode, useModeStore } from '~/stores/mode'
import { useSettingsStore } from '~/stores/settings'

const settingsStore = useSettingsStore()
const { currentMode } = storeToRefs(useModeStore())

const { apiKey, baseURL, model } = storeToRefs(settingsStore)
const messagesStore = useMessagesStore()

// Model selector state
const showModelSelector = ref(false)
// Sidebar state
const showSidebar = ref(true)
// Sidebar tab state
const sidebarTab = ref('chats')

// Handle model selection
function handleModelSelect(selectedModelValue: string) {
  model.value = selectedModelValue
}

onMounted(async () => {
  await settingsStore.fetchModels()
})
</script>

<template>
  <header class="h-16 w-full border-b border-gray-200 bg-white dark:border-gray-900 dark:bg-dark-500">
    <Toaster position="top-right" rich-colors close-button />
    <div class="h-full flex items-center gap-x-4 px-4">
      <Button variant="ghost" size="icon" class="h-8 w-8" @click="showSidebar = !showSidebar">
        <div v-if="showSidebar" class="i-solar-sidebar-minimalistic-outline text-lg" />
        <div v-else class="i-solar-hamburger-menu-outline text-lg" />
      </Button>
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
          <Input id="api-key" v-model="apiKey" type="password" />
          <Label for="base-url">
            Base URL
          </Label>
          <Input id="base-url" v-model="baseURL" />
          <Label for="model">
            Model
          </Label>
          <div class="relative flex gap-2">
            <Input id="model" v-model="model" class="w-full" @click.stop="showModelSelector = true" />
            <ModelSelector
              v-if="showModelSelector"
              v-model:search-term="model"
              v-model:show-model-selector="showModelSelector"
              @select-model="handleModelSelect"
            />
            <Button variant="outline" class="h-full" @click="settingsStore.fetchModels">
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
  <div class="h-[calc(100vh-4rem)] flex flex-1">
    <!-- Sidebar for rooms and templates -->
    <aside
      v-if="showSidebar"
      class="w-64 flex flex-col overflow-y-auto border-r border-gray-200 p-3 dark:border-gray-800"
    >
      <Tabs v-model="sidebarTab" class="w-full">
        <TabsList class="grid grid-cols-2 w-full">
          <TabsTrigger value="chats">
            Chats
          </TabsTrigger>
          <TabsTrigger value="templates">
            Templates
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chats" class="mt-4">
          <RoomSelector />
        </TabsContent>
        <TabsContent value="templates" class="mt-4">
          <TemplateManager />
        </TabsContent>
      </Tabs>
    </aside>

    <!-- Main content -->
    <main class="flex flex-1 flex-col place-items-center overflow-auto">
      <RouterView />
    </main>
  </div>
</template>

<style>
#app {
  height: 100dvh;
  display: flex;
  flex-direction: column;
}
*:focus,
*:focus-visible {
  outline: none !important;
}
.i-carbon-logo-github {
  @apply dark:bg-black;
}
</style>

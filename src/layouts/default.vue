<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { Toaster } from 'vue-sonner'
import RoomSelector from '~/components/RoomSelector.vue'
import TemplateManager from '~/components/TemplateManager.vue'
import Button from '~/components/ui/button/Button.vue'
import Tabs from '~/components/ui/tabs/Tabs.vue'
import TabsContent from '~/components/ui/tabs/TabsContent.vue'
import TabsList from '~/components/ui/tabs/TabsList.vue'
import TabsTrigger from '~/components/ui/tabs/TabsTrigger.vue'
import { isDark, toggleDark } from '~/composables/dark'
import { ChatMode, useModeStore } from '~/stores/mode'

const { currentMode } = storeToRefs(useModeStore())

// isMobile
const isMobile = ref(false)
function checkMobile() {
  isMobile.value = window.innerWidth < 768
}
if (typeof window !== 'undefined') {
  checkMobile()
  window.addEventListener('resize', checkMobile)
}

// Sidebar state
const showSidebar = ref(!isMobile.value)
watchEffect(() => {
  if (isMobile.value)
    showSidebar.value = false
  else showSidebar.value = true
})

// Sidebar tab state
const sidebarTab = ref('chats')

const router = useRouter()
</script>

<template>
  <header class="h-16 w-full border-b border-gray-200 bg-white dark:border-gray-900 dark:bg-dark-500">
    <Toaster position="top-right" rich-colors close-button />
    <div class="h-full flex items-center gap-x-4 px-4">
      <Button variant="ghost" size="icon" class="h-8 w-8" @click="showSidebar = !showSidebar">
        <div v-if="showSidebar" class="i-solar-sidebar-minimalistic-outline text-lg" />
        <div v-else class="i-solar-hamburger-menu-outline text-lg" />
      </Button>
      <div id="site-title" class="text-xl font-bold">
        Flow Chat
      </div>
      <div class="flex-1" />
      <Button v-if="currentMode === ChatMode.CONVERSATION" variant="outline" class="hidden sm:inline-flex" @click="currentMode = ChatMode.FLOW">
        Jump Out
      </Button>
      <Button id="settings-btn" variant="outline" class="hidden border rounded-md bg-white px-2 color-black shadow-sm transition-colors duration-200 sm:inline-flex hover:bg-gray-200 hover:color-dark" @click="router.push('/settings')">
        Settings
      </Button>
      <Button
        class="border rounded-md bg-white px-2 shadow-sm transition-colors duration-200 dark:bg-white hover:bg-gray-200 dark:hover:bg-gray-300"
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
  <div class="relative h-[calc(100vh-4rem)] flex flex-1">
    <div
      v-if="isMobile && showSidebar"
      class="fixed bottom-0 left-0 right-0 z-40 bg-black/40 md:hidden"
      style="top: 4rem;"
      @click="showSidebar = false"
    />
    <!-- Sidebar for rooms and templates -->
    <aside
      v-show="isMobile ? true : showSidebar"
      class="fixed z-50 h-full w-64 flex flex-col overflow-y-auto border-r border-gray-200 bg-white p-3 transition-transform duration-300 md:static md:h-auto md:translate-x-0 md:translate-x-0 dark:border-gray-800 dark:bg-dark-500"
      :class="[
        isMobile
          ? (showSidebar ? 'translate-x-0 left-0 top-16' : '-translate-x-full left-0 top-16')
          : 'md:flex',
      ]"
      style="top: 4rem;"
    >
      <div class="mb-4 flex sm:hidden">
        <Button
          variant="outline"
          class="w-full"
          @click="router.push('/settings'); showSidebar = false"
        >
          <span class="i-carbon-settings mr-2" /> Settings
        </Button>
      </div>
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
    <main class="w-full flex flex-1 flex-col place-items-center overflow-auto">
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

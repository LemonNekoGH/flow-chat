<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import SettingsDialog from '~/components/SettingsDialog.vue'
import { Button } from '~/components/ui/button'
import { isDark, toggleDark } from '~/composables/dark'
import { ChatMode, useModeStore } from '~/stores/mode'
import { useSettingsStore } from '~/stores/settings'

const modeStore = useModeStore()
const { model } = storeToRefs(useSettingsStore())
const { currentMode } = storeToRefs(modeStore)

const showSettingsDialog = ref(false)
const showDropdownMenu = ref(false)

function toggleDropdown() {
  showDropdownMenu.value = !showDropdownMenu.value
}

function closeDropdown() {
  showDropdownMenu.value = false
}

function openSettings() {
  showSettingsDialog.value = true
  closeDropdown()
}

function toggleMode() {
  currentMode.value = currentMode.value === ChatMode.CONVERSATION
    ? ChatMode.FLOW
    : ChatMode.CONVERSATION
  closeDropdown()
}

function getCurrentModeName(): string {
  return currentMode.value === ChatMode.CONVERSATION
    ? 'Conversation Mode'
    : 'Flowchart Mode'
}

function getToggleModeName(): string {
  return currentMode.value === ChatMode.CONVERSATION
    ? 'Switch to Flowchart'
    : 'Switch to Conversation'
}
</script>

<template>
  <div class="h-full w-full flex items-center justify-between px-4">
    <div class="flex items-center gap-2">
      <span class="text-sm font-semibold">Flow Chat</span>
      <span class="text-xs text-gray-500 dark:text-gray-400">{{ model }}</span>
    </div>

    <div class="flex items-center gap-4">
      <div class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        {{ getCurrentModeName() }}
      </div>

      <Button
        class="border border-gray-300 rounded-md bg-white px-2 transition-colors duration-200 dark:border-gray-500 dark:bg-white hover:bg-gray-200 dark:hover:bg-gray-300"
        @click="toggleDark()"
      >
        <i v-if="isDark" class="i-carbon-moon text-xl text-gray-800" />
        <i v-else class="i-carbon-sun text-xl text-gray-800" />
      </Button>

      <div class="relative z-1000">
        <Button
          class="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          @click="toggleDropdown"
        >
          <div i-lucide-ellipsis class="text-gray-700 dark:text-gray-300" />
        </Button>

        <div
          v-if="showDropdownMenu"
          class="absolute right-0 top-full mt-1 w-40 overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-900"
        >
          <Button
            class="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            @click="toggleMode"
          >
            <div class="flex items-center gap-2">
              <div i-lucide-git-branch class="text-lg" />
              {{ getToggleModeName() }}
            </div>
          </Button>
          <Button
            class="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            @click="openSettings"
          >
            <div class="flex items-center gap-2">
              <div i-lucide-settings class="text-lg" />
              Settings
            </div>
          </Button>
          <a
            href="https://github.com/lemonnekogh/flow-chat"
            target="_blank"
            class="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <div class="flex items-center gap-2">
              <div i-lucide-github class="text-lg" />
              GitHub
            </div>
          </a>
        </div>
      </div>
    </div>

    <SettingsDialog
      v-if="showSettingsDialog"
      @close="showSettingsDialog = false"
    />
  </div>
</template>

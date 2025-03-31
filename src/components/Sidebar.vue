<script setup lang="ts">
import { ref } from 'vue'
import AgentManager from '~/components/AgentManager.vue'
import RoomSelector from '~/components/RoomSelector.vue'

type Tab = 'rooms' | 'agents'

const activeTab = ref<Tab>('rooms')

function setTab(tab: Tab) {
  activeTab.value = tab
}
</script>

<template>
  <div class="h-full w-280px flex flex-col border-r border-r-black/10 bg-gray-50 dark:border-r-white/10 dark:bg-dark-800">
    <div class="flex items-center border-b border-b-black/10 p-3 dark:border-b-white/10">
      <div class="flex items-center gap-2">
        <span class="h-6 w-6 flex items-center justify-center rounded-lg bg-blue-500 text-sm text-white font-bold dark:bg-blue-700">F</span>
        <span class="text-sm font-semibold dark:text-gray-200">Flow Chat</span>
      </div>
    </div>

    <div class="flex border-b border-b-black/10 dark:border-b-white/10">
      <button
        class="flex-1 cursor-pointer px-2.5 py-2.5 text-center text-sm text-gray-600 font-bold transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/5"
        :class="{ 'text-black dark:text-white border-b-2 border-gray-600 dark:border-gray-400 bg-black/3 dark:bg-white/3': activeTab === 'rooms' }"
        @click="setTab('rooms')"
      >
        <div class="flex items-center justify-center gap-1.5">
          <i class="i-lucide-message-square text-base" />
          Chats
        </div>
      </button>
      <button
        class="flex-1 cursor-pointer px-2.5 py-2.5 text-center text-sm text-gray-600 font-bold transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/5"
        :class="{ 'text-black dark:text-white border-b-2 border-gray-600 dark:border-gray-400 bg-black/3 dark:bg-white/3': activeTab === 'agents' }"
        @click="setTab('agents')"
      >
        <div class="flex items-center justify-center gap-1.5">
          <i class="i-lucide-bot text-base" />
          Templates
        </div>
      </button>
    </div>

    <div class="flex-1 overflow-hidden">
      <RoomSelector v-if="activeTab === 'rooms'" />
      <AgentManager v-if="activeTab === 'agents'" />
    </div>
  </div>
</template>

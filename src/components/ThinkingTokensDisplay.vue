<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { ref } from 'vue'

const props = defineProps<{
  defaultOpen?: boolean
}>()

const isOpen = ref(props.defaultOpen ?? false)
</script>

<template>
  <div class="thinking-token-display my-1 overflow-hidden border-2 border-violet-200 rounded-lg dark:border-violet-800">
    <button
      class="w-full flex items-center justify-between bg-violet-50 px-2 py-1 text-xs text-violet-700 tracking-wide transition-colors dark:bg-violet-900/50 hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-900/60"
      @click="isOpen = !isOpen"
    >
      <div class="flex items-center gap-2">
        <ChevronDown
          class="h-3.5 w-3.5 text-violet-700 transition-transform dark:text-violet-300"
          :class="{ 'rotate-180': isOpen }"
        />
        <div class="font-medium">
          Thinking tokens
        </div>
      </div>
    </button>

    <div
      v-if="isOpen"
      class="border-t border-violet-200 bg-white dark:border-violet-800 dark:bg-violet-900"
    >
      <div class="p-2 text-xs text-violet-700 whitespace-pre-wrap break-words dark:text-violet-200">
        <slot />
      </div>
    </div>
  </div>
</template>

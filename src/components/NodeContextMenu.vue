<script setup lang="ts">
import type { MessageRole } from '~/types/messages'

defineProps<{
  x: number
  y: number
  role?: MessageRole
}>()

defineEmits<{
  (e: 'fork'): void
  (e: 'forkWith'): void
  (e: 'focusIn'): void
  (e: 'delete'): void
  (e: 'copy'): void
}>()
</script>

<template>
  <div
    class="context-menu fixed z-100 rounded py-2 shadow-lg"
    bg="white dark:gray-800"
    border="~ gray-200 dark:gray-700"
    :style="{ left: `${x}px`, top: `${y}px` }"
  >
    <div @click="$emit('copy')">
      Copy
    </div>
    <div v-if="role === 'user'" @click="$emit('fork')">
      Fork
    </div>
    <div v-if="role === 'user'" @click="$emit('forkWith')">
      Fork With...
    </div>
    <div @click="$emit('focusIn')">
      Focus In
    </div>
    <div text-red-500 @click="$emit('delete')">
      Delete Node
    </div>
  </div>
</template>

<style scoped>
.context-menu > div {
  @apply cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700;
}
</style>

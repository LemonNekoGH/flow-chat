<script setup lang="ts">
import type { MessageRole } from '~/types/messages'

defineProps<{
  x: number
  y: number
  role?: MessageRole
}>()

defineEmits<{
  (e: 'generate'): void
  (e: 'delete'): void
  (e: 'focusIn'): void
}>()
</script>

<template>
  <div
    class="fixed z-100 border border-gray-200 rounded bg-white py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
    :style="{ left: `${x}px`, top: `${y}px` }"
  >
    <div
      v-if="role === 'user'"
      class="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
      @click="$emit('generate')"
    >
      Generate Another Response
    </div>
    <div
      class="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
      @click="$emit('focusIn')"
    >
      Focus In
    </div>
    <div
      class="cursor-pointer px-4 py-2 text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"
      @click="$emit('delete')"
    >
      Delete Node
    </div>
  </div>
</template>

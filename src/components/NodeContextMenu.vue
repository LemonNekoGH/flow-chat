<script setup lang="ts">
defineProps<{
  show: boolean
  x: number
  y: number
}>()

defineEmits<{
  (e: 'generate'): void
}>()
</script>

<template>
  <div
    v-if="show"
    class="absolute z-100 border border-gray-200 rounded bg-white py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
    :style="{ left: `${x}px`, top: `${y}px` }"
  >
    <div
      class="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
      @click="$emit('generate')"
    >
      Generate Another Response
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import { Handle, Position } from '@vue-flow/core'
import { ref } from 'vue'
import MarkdownView from '../MarkdownView.vue'

defineProps<NodeProps>()

const isExpanded = ref(false)

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div
    class="w-50 overflow-auto rounded-lg p-2 text-xs dark:text-white"
    bg="gray-100 dark:gray-900"
    b="2 gray-200 dark:gray-700"
    :class="{
      'b-gray-300 dark:b-gray-700': data.selected,
      'opacity-50': data.inactive,
      'expanded': isExpanded,
    }"
  >
    <Handle type="target" :position="Position.Left" />

    <div class="w-full">
      <div class="flex items-center justify-between">
        <div>System Prompt</div>
        <div :class="{ 'i-carbon-chevron-down': !isExpanded, 'i-carbon-chevron-up': isExpanded }" cursor-pointer @click="toggleExpand" />
      </div>

      <div v-if="isExpanded" dark:bt-gray-700 mt-4>
        <MarkdownView :content="data.message.content" />
      </div>
    </div>

    <Handle type="source" :position="Position.Right" />
  </div>
</template>

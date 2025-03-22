<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import { Handle, Position } from '@vue-flow/core'
import SystemPrompt from '../SystemPrompt.vue'

defineProps<NodeProps>()
</script>

<template>
  <div
    w-50 rounded-lg p-2 text-xs
    bg="gray-100 dark:gray-900"
    b="2 gray-200 dark:gray-700"
    :class="{
      'b-gray-300 dark:b-gray-600': data.selected,
      'opacity-50': data.inactive,
    }"
  >
    <Handle type="target" :position="Position.Left" />
    <SystemPrompt :id="data.message.id" />
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

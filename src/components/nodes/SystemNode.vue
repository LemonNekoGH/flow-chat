<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import SystemPrompt from '../SystemPrompt.vue'
import Node from './Node.vue'

defineProps<NodeProps>()
</script>

<template>
  <Node
    bg="gray-100 dark:gray-900"
    :inactive="data.inactive"
    :class="data.selected ? 'b-gray-300 dark:b-gray-700' : 'b-gray-200 dark:b-gray-800'"
  >
    <SystemPrompt :id="data.message.id" p-2 />
  </Node>
</template>

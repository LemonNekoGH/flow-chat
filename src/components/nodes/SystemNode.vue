<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { NodeData } from '~/types/node'
import SystemPrompt from '../SystemPrompt.vue'
import Node from './Node.vue'

const props = defineProps<NodeProps<NodeData>>()
</script>

<template>
  <Node
    v-bind="props"
    bg="gray-100 dark:gray-900"
    :inactive="data.inactive"
    :class="selected ? 'b-gray-300 dark:b-gray-700' : 'b-gray-200 dark:b-gray-800'"
  >
    <SystemPrompt :id="data.message.id" p-2 />
  </Node>
</template>

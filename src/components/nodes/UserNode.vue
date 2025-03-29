<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import MarkdownView from '../MarkdownView.vue'
import Node from './Node.vue'

defineProps<NodeProps>()
</script>

<template>
  <Node
    bg="sky-100 dark:sky-900"
    :inactive="data.inactive"
    :class="data.selected ? 'b-sky-300 dark:b-sky-700' : 'b-sky-200 dark:b-sky-800'"
  >
    <div v-if="data.message.model" p-2 bg="sky-200 dark:sky-800">
      @{{ data.message.model }}
    </div>
    <MarkdownView p-2 :content="data.message.content" />
  </Node>
</template>

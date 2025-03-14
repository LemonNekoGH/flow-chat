<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import { Handle, Position } from '@vue-flow/core'
import MarkdownView from '../MarkdownView.vue'

defineProps<NodeProps>()
</script>

<template>
  <div
    class="w-50 overflow-auto rounded-lg text-xs dark:text-white"
    bg="sky-100 dark:sky-900"
    b="2 sky-200 dark:sky-700"
    :class="{
      'b-sky-300 dark:b-sky-700': data.selected,
      'opacity-50': data.inactive,
    }"
  >
    <Handle type="target" :position="Position.Left" />
    <div>
      <div v-if="data.message.model" p-2 bg="sky-200 dark:sky-700">
        @{{ data.message.model }}
      </div>
      <MarkdownView p-2 :content="data.message.content" />
    </div>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

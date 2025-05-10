<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '~/stores/settings'
import MarkdownView from '../MarkdownView.vue'
import Node from './Node.vue'

defineProps<NodeProps>()

const { textGeneration } = storeToRefs(useSettingsStore())
</script>

<template>
  <Node
    bg="pink-100 dark:pink-900"
    :inactive="data.inactive"
    :class="data.selected ? 'b-pink-300 dark:b-pink-700' : 'b-pink-200 dark:b-pink-800'"
  >
    <div v-if="data.message.model && data.message.model !== textGeneration.model" p-2 bg="pink-200 dark:pink-800">
      {{ data.message.model }}
    </div>
    <MarkdownView p-2 :content="data.message.content" />
  </Node>
</template>

<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { NodeData } from '~/types/node'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '~/stores/settings'
import MarkdownView from '../MarkdownView.vue'
import Node from './Node.vue'

defineProps<NodeProps<NodeData>>()

const { defaultTextModel } = storeToRefs(useSettingsStore())
</script>

<template>
  <Node
    bg="sky-100 dark:sky-900"
    :inactive="data.inactive"
    :class="data.selected ? 'b-sky-300 dark:b-sky-700' : 'b-sky-200 dark:b-sky-800'"
  >
    <div v-if="data.message.provider !== defaultTextModel.provider || data.message.model !== defaultTextModel.model" p-2 bg="sky-200 dark:sky-800">
      @{{ data.message.provider }}/{{ data.message.model }}
    </div>
    <MarkdownView p-2 :content="data.message.content" />
  </Node>
</template>

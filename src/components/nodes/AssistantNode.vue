<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import { Handle, Position } from '@vue-flow/core'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '~/stores/settings'
import MarkdownView from '../MarkdownView.vue'

defineProps<NodeProps>()

const { model } = storeToRefs(useSettingsStore())
</script>

<template>
  <div
    class="w-50 overflow-auto rounded-lg text-xs dark:text-white"
    bg="pink-100 dark:pink-900"
    b="2 pink-200 dark:pink-700"
    :class="{
      'b-pink-300 dark:b-pink-700': data.selected,
      'opacity-50': data.inactive,
    }"
  >
    <Handle type="target" :position="Position.Left" />
    <div>
      <div v-if="data.message.model && data.message.model !== model" p-2 bg="pink-200 dark:pink-700">
        {{ data.message.model }}
      </div>
      <MarkdownView p-2 :content="data.message.content" />
    </div>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

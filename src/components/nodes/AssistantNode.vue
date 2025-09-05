<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { NodeData } from '~/types/node'
import { storeToRefs } from 'pinia'
import { useMessagesStore } from '~/stores/messages'
import { useSettingsStore } from '~/stores/settings'
import MarkdownView from '../MarkdownView.vue'
import Node from './Node.vue'

defineProps<NodeProps<NodeData>>()

const emit = defineEmits<{
  (e: 'abort'): void
}>()

const { defaultTextModel } = storeToRefs(useSettingsStore())
const messagesStore = useMessagesStore()
</script>

<template>
  <Node
    bg="pink-100 dark:pink-900"
    :inactive="data.inactive"
    :class="data.selected ? 'b-pink-300 dark:b-pink-700' : 'b-pink-200 dark:b-pink-800'"
  >
    <div v-if="messagesStore.isGenerating(data.message.id)" bg="pink-200 dark:pink-800" flex justify-between p-2>
      <div class="flex items-center gap-2">
        Generating...
      </div>
      <div>
        <div i-lucide-circle-stop @click="emit('abort')" />
      </div>
    </div>
    <div v-if="defaultTextModel.provider !== data.message.provider || data.message.model !== defaultTextModel.model" p-2 bg="pink-200 dark:pink-800">
      {{ data.message.provider }}/{{ data.message.model }}
    </div>
    <MarkdownView p-2 :content="data.message.content" />
  </Node>
</template>

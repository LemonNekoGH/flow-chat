<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { NodeData } from '~/types/node'
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useMessagesStore } from '~/stores/messages'
import { useSettingsStore } from '~/stores/settings'
import MarkdownView from '../MarkdownView.vue'
import Node from './Node.vue'

const props = defineProps<NodeProps<NodeData>>()

const emit = defineEmits<{
  (e: 'abort'): void
}>()

const { defaultTextModel } = storeToRefs(useSettingsStore())
const messagesStore = useMessagesStore()

const isGenerating = computed(() => messagesStore.isGenerating(props.data.message.id))
const showSummary = computed(() => props.data.message.show_summary ?? false)

// Auto-switch to summary view if summary starts generating
watch(() => props.data.message.summary, (newVal, oldVal) => {
  if (newVal && !oldVal && isGenerating.value) {
    void messagesStore.updateShowSummary(props.data.message.id, true)
  }
})
</script>

<template>
  <Node
    v-bind="props"
    :bg="showSummary ? 'yellow-100 dark:yellow-900' : 'pink-100 dark:pink-900'"
    :inactive="data.inactive"
    class="group relative" :class="[selected ? 'b-pink-300 dark:b-pink-700' : 'b-pink-200 dark:b-pink-800']"
  >
    <div v-if="messagesStore.isGenerating(data.message.id)" :bg="showSummary ? 'yellow-200 dark:yellow-800' : 'pink-200 dark:pink-800'" flex justify-between p-2>
      <div class="flex items-center gap-2">
        Generating...
      </div>
      <div>
        <div i-lucide-circle-stop @click="emit('abort')" />
      </div>
    </div>
    <div v-if="defaultTextModel.provider !== data.message.provider || data.message.model !== defaultTextModel.model" p-2 :bg="showSummary ? 'yellow-200 dark:yellow-800' : 'pink-200 dark:pink-800'">
      {{ data.message.provider }}/{{ data.message.model }}
    </div>
    <MarkdownView p-2 :content="showSummary ? [{ type: 'text', text: data.message.summary || 'Summarizing...' }] : data.message.content" />
  </Node>
</template>

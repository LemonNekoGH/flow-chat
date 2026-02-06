<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { Attachment } from '~/types/attachment'
import type { NodeData } from '~/types/node'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useSettingsStore } from '~/stores/settings'
import AttachmentDisplay from '../AttachmentDisplay.vue'
import MarkdownView from '../MarkdownView.vue'
import Node from './Node.vue'

const props = defineProps<NodeProps<NodeData>>()

const { defaultTextModel } = storeToRefs(useSettingsStore())
const attachments = computed(() => {
  return props.data.message.content.filter(part => part.type !== 'text') as Attachment[]
})
</script>

<template>
  <Node
    v-bind="props"
    bg="sky-100 dark:sky-900"
    :inactive="data.inactive"
    :class="selected ? 'b-sky-300 dark:b-sky-700' : 'b-sky-200 dark:b-sky-800'"
  >
    <div v-if="data.message.provider !== defaultTextModel.provider || data.message.model !== defaultTextModel.model" p-2 bg="sky-200 dark:sky-800">
      @{{ data.message.provider }}/{{ data.message.model }}
    </div>
    <div p-2>
      <AttachmentDisplay
        v-if="attachments.length > 0"
        :attachments="attachments"
        compact
        class="mb-2"
      />
      <MarkdownView :content="data.message.content" />
    </div>
  </Node>
</template>

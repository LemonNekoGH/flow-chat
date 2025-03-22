<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import { Handle, Position } from '@vue-flow/core'
import { ref } from 'vue'
import { useMessagesStore } from '~/stores/messages'
import MarkdownView from '../MarkdownView.vue'
import Editor from '../SystemPromptEdit.vue'

defineProps<NodeProps>()

const messagesStore = useMessagesStore()
const isExpanded = ref(false)
</script>

<template>
  <div
    class="w-50 overflow-auto rounded-lg p-2 text-xs dark:text-white"
    bg="gray-100 dark:gray-900"
    b="2 gray-200 dark:gray-700"
    :class="{
      'b-gray-300 dark:b-gray-700': data.selected,
      'opacity-50': data.inactive,
      'expanded': isExpanded,
    }"
  >
    <Handle type="target" :position="Position.Left" />

    <div w-full>
      <div flex items-center justify-between>
        System Prompt
        <div flex items-center gap-2>
          <Editor v-model="messagesStore.getMessageById(data.message.id)!.content">
            <div i-carbon-edit cursor-pointer title="Edit" />
          </Editor>

          <div
            cursor-pointer
            :class="isExpanded ? 'i-carbon-chevron-up' : 'i-carbon-chevron-down'"
            @click="isExpanded = !isExpanded"
          />
        </div>
      </div>

      <MarkdownView v-if="isExpanded" dark:bt-gray-700 mt-2 :content="data.message.content" />
    </div>

    <Handle type="source" :position="Position.Right" />
  </div>
</template>

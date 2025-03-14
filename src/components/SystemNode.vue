<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import { Handle, Position } from '@vue-flow/core'
import { ref } from 'vue'
import MarkdownView from './MarkdownView.vue'

defineProps<NodeProps>()

const isExpanded = ref(false)

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div
    class="system-node overflow-auto text-12px"
    :class="{ expanded: isExpanded }"
  >
    <Handle type="target" :position="Position.Left" />

    <div class="node-content">
      <div class="node-header" @click="toggleExpand">
        <div>System Prompt</div>
        <div class="ml-2 text-gray-500">
          {{ isExpanded ? '(Click to collapse)' : '' }}
        </div>
      </div>

      <div v-if="isExpanded" class="node-body">
        <MarkdownView :content="data.message.content" />
      </div>
      <div v-else class="node-body-collapsed" @click="toggleExpand">
        (Click to expand)
      </div>
    </div>

    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.system-node {
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.5rem;
  width: 200px;
  border-left: 3px solid #64748b;
}

.node-content {
  width: 100%;
}

.node-header {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding-bottom: 4px;
}

.node-body {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-y: auto;
}

.node-body-collapsed {
  color: #6b7280;
  font-style: italic;
}

.dark .system-node {
  background: #1e293b;
  border-color: #334155;
}
</style>

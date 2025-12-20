<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { NodeData } from '~/types/node'
import { Handle, Position } from '@vue-flow/core'

defineProps<NodeProps<NodeData>>()
</script>

<template>
  <div w-50 of-hidden b-2 rounded-lg text-xs :class="{ 'opacity-50': data.inactive }">
    <Handle type="target" :position="Position.Left" />
    <slot />
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

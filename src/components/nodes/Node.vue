<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineProps<{
  inactive: boolean
}>()
</script>

<template>
  <div w-50 of-hidden b-2 rounded-lg text-xs :class="{ 'opacity-50': inactive }">
    <Handle type="target" :position="Position.Left" />
    <slot />
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

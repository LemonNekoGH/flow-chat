<script setup lang="ts">
import { VueMarkdown } from '@crazydos/vue-markdown'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'

defineProps<{
  content: string
  model?: string
}>()
</script>

<template>
  <VueMarkdown class="overflow-auto" style="word-break: break-word;" :markdown="(model ? `@${model} ` : '') + content" :rehype-plugins="[rehypeHighlight]" />
</template>

<style>
code {
  white-space: pre-wrap;
}
</style>

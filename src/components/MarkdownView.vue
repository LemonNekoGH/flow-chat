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
  <VueMarkdown
    of-auto break-words space-y-2
    :markdown="(model ? `@${model} ` : '') + content"
    :rehype-plugins="[rehypeHighlight]"
  />
</template>

<style>
pre code.hljs {
  border-radius: 8px;
}

code {
  white-space: pre-wrap;
}
</style>

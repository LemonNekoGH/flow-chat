<script setup lang="ts">
import type { Pluggable } from 'unified'
import { VueMarkdown } from '@crazydos/vue-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { computed, h, nextTick, onMounted, ref, render, watch } from 'vue'
import { remarkCaptureRaw } from '~/utils/markdown/remarkCaptureRaw'
import { remarkToolCall } from '~/utils/markdown/remarkToolCall'
import MarkdownCodeBlock from './MarkdownCodeBlock.vue'
import MarkdownTable from './MarkdownTable.vue'
import ToolCallDisplay from './ToolCallDisplay.vue'
import 'highlight.js/styles/github.css'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  content: string
}>()

interface MarkdownSlotMeta extends Record<string, unknown> {
  dataRaw?: unknown
}

const markdownContainer = ref<HTMLElement>()

const remarkPlugins = computed<Pluggable[]>(() => [
  remarkGfm,
  [remarkCaptureRaw, { source: props.content }],
  remarkToolCall,
])
const rehypePlugins = [rehypeHighlight]

function getRawMarkdown(meta: MarkdownSlotMeta): string | undefined {
  const raw = meta['data-raw'] ?? meta.dataRaw
  return typeof raw === 'string' ? raw : undefined
}

async function replaceToolCallPlaceholders() {
  if (!markdownContainer.value)
    return

  await nextTick()

  const placeholders = markdownContainer.value.querySelectorAll('.tool-call-placeholder:not([data-replaced])')
  placeholders.forEach((placeholder) => {
    const toolCallId = placeholder.getAttribute('data-tool-call-id')
    if (!toolCallId)
      return

    placeholder.setAttribute('data-replaced', 'true')

    const wrapper = document.createElement('div')
    wrapper.className = 'tool-call-wrapper'

    const vnode = h(ToolCallDisplay, { toolCallId })
    render(vnode, wrapper)

    placeholder.replaceWith(wrapper)
  })
}

onMounted(() => {
  replaceToolCallPlaceholders()
})

watch(() => props.content, () => {
  replaceToolCallPlaceholders()
})
</script>

<template>
  <div ref="markdownContainer" v-bind="$attrs" class="space-y-2">
    <VueMarkdown
      class="space-y-2"
      of-auto
      break-words
      :markdown="props.content"
      :remark-plugins="remarkPlugins"
      :rehype-plugins="rehypePlugins"
    >
      <template #block-code="{ children, content: codeContent, language, ...codeMeta }">
        <MarkdownCodeBlock
          :language="language"
          :content="codeContent ?? props.content"
          :raw-markdown="getRawMarkdown(codeMeta)"
        >
          <component :is="children" />
        </MarkdownCodeBlock>
      </template>

      <template #table="{ children, ...tableMeta }">
        <MarkdownTable
          :raw-markdown="getRawMarkdown(tableMeta)"
        >
          <component :is="children" />
        </MarkdownTable>
      </template>
    </VueMarkdown>
  </div>
</template>

<style>
pre code.hljs {
  border-radius: 8px;
}

code {
  white-space: pre-wrap;
}
</style>

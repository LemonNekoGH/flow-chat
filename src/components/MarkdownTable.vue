<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'

const props = withDefaults(defineProps<{
  rawMarkdown?: string
}>(), {
  rawMarkdown: '',
})

const tableWrapperRef = ref<HTMLDivElement | null>(null)

const rawMarkdownValue = computed(() => props.rawMarkdown?.trim() ?? '')

function extractRenderedTable(): string {
  const wrapper = tableWrapperRef.value
  if (!wrapper)
    return ''

  const table = wrapper.querySelector('table')
  if (!table)
    return wrapper.textContent?.trim() ?? ''

  const text = table.textContent ?? ''
  const normalized = text.replace(/\u00A0/g, ' ').trim()
  return normalized || table.outerHTML || ''
}

const { copy, copied } = useClipboard({
  legacy: true,
  copiedDuring: 1600,
})

const buttonTitle = computed(() => copied.value ? 'Copied' : 'Copy table')
const buttonIcon = computed(() => copied.value ? 'i-solar-check-bold' : 'i-solar-copy-bold')

async function handleCopy() {
  const value = rawMarkdownValue.value || extractRenderedTable()
  if (!value) {
    toast.error('Failed to copy table')
    return
  }

  try {
    await copy(value)
    toast.success('Table copied to clipboard')
  }
  catch {
    toast.error('Failed to copy table')
  }
}
</script>

<template>
  <div class="relative border border-gray-200 rounded-lg p-3 dark:border-gray-700">
    <button
      class="absolute right-2 top-2 copy-icon-btn"
      type="button"
      :title="buttonTitle"
      @click="handleCopy"
    >
      <div class="text-sm" :class="[buttonIcon]" />
    </button>
    <div ref="tableWrapperRef" class="overflow-x-auto">
      <slot />
    </div>
  </div>
</template>

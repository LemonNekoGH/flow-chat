<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'

const props = withDefaults(defineProps<{
  language?: string
  content?: string
  rawMarkdown?: string
}>(), {
  content: '',
  rawMarkdown: '',
})

const codeRef = ref<HTMLDivElement | null>(null)

const { copy, copied } = useClipboard({
  legacy: true,
  copiedDuring: 1600,
})

const buttonTitle = computed(() => copied.value ? 'Copied' : 'Copy')
const buttonIcon = computed(() => copied.value ? 'i-solar-check-bold' : 'i-solar-copy-bold')

function resolveCopyValue(): string {
  const slotText = codeRef.value?.textContent ?? ''
  if (slotText.trim())
    return slotText

  if (props.content?.trim())
    return props.content

  if (props.rawMarkdown?.trim())
    return props.rawMarkdown

  return ''
}

async function handleCopy() {
  const value = resolveCopyValue()
  if (!value) {
    toast.error('Failed to copy code')
    return
  }

  try {
    await copy(value)
    toast.success('Code copied to clipboard')
  }
  catch {
    toast.error('Failed to copy code')
  }
}
</script>

<template>
  <div class="relative border border-gray-200 rounded-lg dark:border-gray-700">
    <div class="flex items-center justify-between px-3 py-2 text-xs text-gray-500 tracking-wide uppercase dark:text-gray-400">
      <span v-if="props.language">
        {{ props.language }}
      </span>
      <button
        class="copy-icon-btn"
        type="button"
        :title="buttonTitle"
        @click="handleCopy"
      >
        <div class="text-sm" :class="[buttonIcon]" />
      </button>
    </div>
    <div ref="codeRef" class="overflow-auto px-3 pb-3">
      <slot />
    </div>
  </div>
</template>

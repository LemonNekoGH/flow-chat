<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useSettingsStore } from '~/stores/settings'

const props = defineProps<{
  searchTerm: string
  showModelSelector: boolean
}>()

const emit = defineEmits<{
  selectModel: [model: string]
}>()

const showModelSelector = defineModel<boolean>('showModelSelector', { required: true })

const settingsStore = useSettingsStore()
const modelSelectorRef = ref<HTMLDivElement | null>(null)
const selectedModel = ref('')
const isLoadingModels = ref(false)

const filteredModels = computed(() => {
  const searchTerm = props.searchTerm.normalize().replaceAll(/\s/g, '').toLowerCase()
  return settingsStore.models.filter(m => m.id.includes(searchTerm))
})

// Close model selector when clicking outside
useEventListener('click', (event) => {
  if (props.showModelSelector && modelSelectorRef.value && !modelSelectorRef.value.contains(event.target as globalThis.Node)) {
    showModelSelector.value = false
  }
})

// Handle model selection
function selectModel(model: string) {
  selectedModel.value = model
  showModelSelector.value = false
  emit('selectModel', model)
}

// Fetch models if needed
watch(() => props.showModelSelector, (show) => {
  if (show && settingsStore.models.length === 0) {
    isLoadingModels.value = true
    settingsStore.fetchModels().finally(() => {
      isLoadingModels.value = false
    })
  }
}, { immediate: true })
</script>

<template>
  <div
    ref="modelSelectorRef"
    class="absolute bottom-full left-0 z-10 mb-2 max-h-80 w-full overflow-y-auto border border-gray-300 rounded-lg bg-white dark:border-gray-700 dark:bg-dark-50"
  >
    <div class="sticky top-0 border-b border-gray-200 bg-white p-2 text-sm font-medium dark:border-gray-700 dark:bg-dark-50">
      Select a model
    </div>
    <div class="overflow-y-auto p-2">
      <div v-if="isLoadingModels" class="p-2 text-center text-gray-500 dark:text-gray-400">
        Loading models...
      </div>
      <div v-else-if="settingsStore.models.length === 0" class="p-2 text-center text-gray-500 dark:text-gray-400">
        No models available
      </div>
      <template v-else>
        <div
          v-for="model in filteredModels"
          :key="model.id"
          class="cursor-pointer rounded-md p-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-dark-700"
          @click="selectModel(model.id)"
        >
          {{ model.id }}
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMessagesStore } from '~/stores/messages'
import MarkdownView from './MarkdownView.vue'
import Editor from './SystemPromptEdit.vue'

const props = defineProps<{
  id: string
}>()

const messagesStore = useMessagesStore()
const expanded = ref(false)
const message = computed(() => messagesStore.getMessageById(props.id)!)
</script>

<template>
  <div grid gap-2>
    <div flex items-center justify-between>
      System Prompt
      <div flex items-center gap-2>
        <Editor v-model="message.content">
          <div i-carbon-edit cursor-pointer title="Edit" />
        </Editor>

        <div
          cursor-pointer
          :class="expanded ? 'i-carbon-chevron-up' : 'i-carbon-chevron-down'"
          @click="expanded = !expanded"
        />
      </div>
    </div>

    <MarkdownView v-if="expanded" dark:bt-gray-700 :content="message.content" />
    <div v-else line-clamp-3 text-gray-500>
      {{ message.content }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Attachment } from '~/types/attachment'
import { ref } from 'vue'
import { Dialog, DialogContent } from '~/components/ui/dialog'

defineProps<{
  attachments: Attachment[]
  compact?: boolean
}>()

const previewImage = ref<Attachment | null>(null)

function openImagePreview(attachment: Attachment) {
  if (attachment.type === 'image_url') {
    previewImage.value = attachment
  }
}

function closePreview() {
  previewImage.value = null
}
</script>

<template>
  <div v-if="attachments.length > 0" class="attachment-display flex flex-wrap gap-2" :class="{ 'mt-2': !compact }">
    <template v-for="attachment in attachments" :key="attachment.id">
      <!-- Image attachment -->
      <div
        v-if="attachment.type === 'image_url'"
        class="cursor-pointer overflow-hidden rounded-lg bg-gray-100 transition-transform hover:scale-105 dark:bg-gray-800"
        :class="compact ? 'h-12 w-12' : 'h-24 w-24'"
        @click="openImagePreview(attachment)"
      >
        <img
          :src="attachment.image_url.url"
          :alt="attachment.image_url.url"
          class="h-full w-full object-cover"
          loading="lazy"
        >
      </div>

      <!-- File attachment -->
      <div
        v-else
        class="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-800"
      >
        <div class="i-solar-file-bold text-gray-500" />
        <span class="max-w-32 truncate text-sm text-gray-700 dark:text-gray-300">{{ attachment.fileName }}</span>
      </div>
    </template>

    <!-- Full-size image preview dialog -->
    <Dialog :open="!!previewImage" @update:open="closePreview">
      <DialogContent class="max-h-[90vh] max-w-[90vw] overflow-auto p-4">
        <img
          v-if="previewImage?.type === 'image_url'"
          :src="previewImage.image_url.url"
          :alt="previewImage.image_url.url"
          class="max-h-[85vh] max-w-full object-contain"
        >
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.attachment-display img {
  transition: transform 0.2s ease;
}
</style>

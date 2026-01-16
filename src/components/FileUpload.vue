<script setup lang="ts">
import type { Attachment } from '~/types/attachment'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Button } from '~/components/ui/button'

const props = withDefaults(defineProps<{
  maxFiles?: number
  maxFileSize?: number // in MB
  acceptedTypes?: string[]
}>(), {
  maxFiles: 5,
  maxFileSize: 10,
  acceptedTypes: () => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
})

const emit = defineEmits<{
  (e: 'filesChanged', files: Attachment[]): void
}>()

const { t } = useI18n()
const fileInputRef = ref<HTMLInputElement>()
const attachments = ref<Attachment[]>([])
const isDragging = ref(false)

const acceptString = computed(() => props.acceptedTypes.join(','))

async function processFile(file: File) {
  // Check file size
  if (file.size > props.maxFileSize * 1024 * 1024) {
    throw new Error(t('file_upload.size_exceeded', { size: props.maxFileSize }))
  }

  // Check file type
  if (!props.acceptedTypes.includes(file.type)) {
    throw new Error(t('file_upload.invalid_type'))
  }

  return new Promise<Attachment>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const data = event.target?.result as string

      let attachment: Attachment

      // Get image dimensions if it's an image
      if (file.type.startsWith('image/')) {
        attachment = {
          fileName: file.name,
          id: crypto.randomUUID(),
          type: 'image_url',
          image_url: {
            url: data,
          },
        }

        resolve(attachment)
        return
      }

      if (file.type.startsWith('audio/')) {
        if (!['mp3', 'wav'].includes(file.type.split('/')[1] as 'mp3' | 'wav')) {
          reject(new Error('Invalid audio format'))
          return
        }

        attachment = {
          fileName: file.name,
          id: crypto.randomUUID(),
          type: 'input_audio',
          input_audio: {
            data,
            format: file.type.split('/')[1] as 'mp3' | 'wav',
          },
        }

        resolve(attachment)
        return
      }

      attachment = {
        fileName: file.name,
        id: crypto.randomUUID(),
        type: 'file',
        file: {
          file_data: data,
          filename: file.name,
        },
      }

      resolve(attachment)
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}

async function handleFiles(files: FileList | File[]) {
  const fileArray = Array.from(files)

  // Check max files limit
  if (attachments.value.length + fileArray.length > props.maxFiles) {
    toast.error(t('file_upload.max_files_exceeded', { max: props.maxFiles }))
    return
  }

  const processedFiles = await Promise.all(fileArray.map(processFile))

  attachments.value = processedFiles
  emit('filesChanged', attachments.value)
}

function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files) {
    handleFiles(input.files)
    // Reset input to allow selecting same file again
    input.value = ''
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false

  if (event.dataTransfer?.files) {
    handleFiles(event.dataTransfer.files)
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function removeAttachment(id: string) {
  attachments.value = attachments.value.filter(a => a.id !== id)
  emit('filesChanged', attachments.value)
}

function clearAll() {
  attachments.value = []
  emit('filesChanged', attachments.value)
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

// Expose methods to parent
defineExpose({
  triggerFileInput,
  clearAll,
  attachments,
})
</script>

<template>
  <div class="file-upload">
    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      :accept="acceptString"
      multiple
      class="hidden"
      @change="handleFileInput"
    >

    <!-- Drag and drop zone (shown when there are no attachments or when dragging) -->
    <div
      v-if="attachments.length === 0 || isDragging"
      class="drop-zone border-2 rounded-lg border-dashed p-4 text-center transition-colors"
      :class="{
        'border-primary bg-primary/5': isDragging,
        'border-gray-300 dark:border-gray-600': !isDragging,
      }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @click="triggerFileInput"
    >
      <div class="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
        <div class="i-solar-upload-square-bold text-2xl" />
        <span class="text-sm">{{ t('file_upload.drop_hint') }}</span>
      </div>
    </div>

    <!-- Attachment previews -->
    <div v-if="attachments.length > 0" class="attachment-previews mt-2 flex flex-wrap gap-2">
      <div
        v-for="attachment in attachments"
        :key="attachment.id"
        class="group relative"
      >
        <!-- Image preview -->
        <div
          v-if="attachment.type === 'image_url'"
          class="h-16 w-16 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
        >
          <img
            :src="attachment.image_url.url"
            :alt="attachment.image_url.url"
            class="h-full w-full object-cover"
          >
        </div>

        <!-- File preview -->
        <div
          v-else
          class="h-16 w-16 flex flex-col items-center justify-center rounded-lg bg-gray-100 p-2 dark:bg-gray-800"
        >
          <div class="i-solar-file-bold text-xl text-gray-500" />
          <span class="mt-1 max-w-full truncate text-xs text-gray-500">{{ attachment.fileName }}</span>
        </div>

        <!-- Remove button -->
        <button
          class="absolute right-[-4px] top-[-4px] h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
          @click.stop="removeAttachment(attachment.id)"
        >
          <div class="i-solar-close-circle-bold text-sm" />
        </button>
      </div>

      <!-- Add more button -->
      <Button
        v-if="attachments.length < maxFiles"
        variant="outline"
        size="sm"
        class="h-16 w-16"
        @click="triggerFileInput"
      >
        <div class="i-solar-add-circle-bold text-xl" />
      </Button>
    </div>
  </div>
</template>

<style scoped>
.drop-zone {
  cursor: pointer;
}

.drop-zone:hover {
  @apply border-primary/50;
}
</style>

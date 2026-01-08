<script setup lang="ts">
import type { AttachmentPreview } from '~/types/attachment'
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
  (e: 'filesChanged', files: AttachmentPreview[]): void
}>()

const { t } = useI18n()
const fileInputRef = ref<HTMLInputElement>()
const attachments = ref<AttachmentPreview[]>([])
const isDragging = ref(false)

const acceptString = computed(() => props.acceptedTypes.join(','))

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

async function processFile(file: File): Promise<AttachmentPreview | null> {
  // Check file size
  if (file.size > props.maxFileSize * 1024 * 1024) {
    toast.error(t('file_upload.size_exceeded', { size: props.maxFileSize }))
    return null
  }

  // Check file type
  if (!props.acceptedTypes.includes(file.type)) {
    toast.error(t('file_upload.invalid_type'))
    return null
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const data = event.target?.result as string
      const isImage = file.type.startsWith('image/')

      const attachment: AttachmentPreview = {
        id: generateId(),
        type: isImage ? 'image' : 'file',
        name: file.name,
        mimeType: file.type,
        data,
        isUploading: false,
      }

      // Get image dimensions if it's an image
      if (isImage) {
        const img = new Image()
        img.onload = () => {
          attachment.width = img.width
          attachment.height = img.height
          resolve(attachment)
        }
        img.onerror = () => resolve(attachment)
        img.src = data
      }
      else {
        resolve(attachment)
      }
    }
    reader.onerror = () => {
      toast.error(t('file_upload.read_error'))
      resolve(null)
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
  const validFiles = processedFiles.filter((f): f is AttachmentPreview => f !== null)

  attachments.value = [...attachments.value, ...validFiles]
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
          v-if="attachment.type === 'image'"
          class="h-16 w-16 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
        >
          <img
            :src="attachment.data"
            :alt="attachment.name"
            class="h-full w-full object-cover"
          >
        </div>

        <!-- File preview -->
        <div
          v-else
          class="h-16 w-16 flex flex-col items-center justify-center rounded-lg bg-gray-100 p-2 dark:bg-gray-800"
        >
          <div class="i-solar-file-bold text-xl text-gray-500" />
          <span class="mt-1 max-w-full truncate text-xs text-gray-500">{{ attachment.name }}</span>
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
